import { useEffect, useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { clamp, clamp01 } from '../lib/math'
import type { Frame } from '../lib/scroll'

/**
 * FILMEN
 * ══════
 * Klippet spelas inte upp — scrollpositionen sätter uppspelningspunkten
 * direkt. Man drar alltså kameran genom rummet med handen, och rörelsen
 * stannar när man stannar.
 *
 * Bildskärmen i filmen är magenta. Den färgen nycklas bort här, så att
 * webbplatsen bakom syns genom skärmen — och när kameran åkt hela vägen in
 * och magentan fyller rutan är det sidan man ser, inte filmen.
 *
 * Nyckling görs i en shader i stället för på pixelnivå i JavaScript. Att
 * gå igenom 700 000 pixlar per bildruta på processorn skulle aldrig hålla
 * jämna steg med scrollen; grafikkortet gör det utan att märkas.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
uniform vec4 uFit;      // skala och förskjutning för cover-beskärning
void main() {
  vUv = (aPos * 0.5 + 0.5) * uFit.xy + uFit.zw;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec3 uKey;        // nyckelfärg i RGB
uniform vec2 uTol;        // tröskel och mjukhet

// Bara färgtonen jämförs, inte ljusstyrkan. Skärmen i filmen varierar i
// ljus över bildrutan, men färgtonen håller sig — det är den som avgör.
vec2 chroma(vec3 c) {
  return vec2(
    -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b,
     0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b
  );
}

void main() {
  vec4 tex = texture2D(uTex, vUv);

  vec2 c = chroma(tex.rgb);
  vec2 k = normalize(chroma(uKey));
  float sat = length(c);

  // Skärmen känns igen på färgtonen, inte på hur ljus den är. I början av
  // klippet är skärmen liten och mörk, på slutet fyller den rutan och är
  // ljus — men riktningen i färgplanet är densamma hela vägen. Ett rakt
  // avstånd till en uppmätt färg skulle bara träffa den ena ytterligheten.
  float align = dot(normalize(c + vec2(1e-5)), k);
  float isKey = smoothstep(uTol.x, uTol.x + uTol.y, align) * smoothstep(0.05, 0.12, sat);
  float a = 1.0 - isKey;

  // Skärmen lyser magenta på ramen runt omkring. Den bården sitter kvar
  // efter nycklingen, så allt som lutar åt nyckeltonen men får vara kvar
  // dras mot grönt — starkast närmast kanten, avtagande utåt.
  float bleed = smoothstep(0.5, 0.92, align) * a;
  tex.r = mix(tex.r, min(tex.r, tex.g * 1.12), bleed);
  tex.b = mix(tex.b, min(tex.b, tex.g * 1.12), bleed);

  gl_FragColor = vec4(tex.rgb * a, a);
}`

/**
 * Trösklarna för uppspelningen. De två första har glapp mellan sig med
 * flit: startade och stannade klippet vid samma eftersläpning skulle det
 * växla mellan spela och pausa flera gånger i sekunden när man drar sakta,
 * och varje växling kostar mer än den bild den vinner.
 */
/** Eftersläpning (s) som får klippet att börja spela igen. Ungefär en bildruta. */
const RESUME = 0.05
/** Eftersläpning (s) under vilken klippet ska stå still. */
const SETTLE = 0.005
/**
 * Över så här stor eftersläpning (s) hoppar vi i stället för att spela ikapp.
 * Tröskeln ligger strax över den eftersläpning en snabb scroll kan hålla, så
 * att ett klipp i filmen blir ett klipp — inte en hastig genomspelning av
 * bildrutorna emellan.
 */
const JUMP = 0.6
/** Hur hårt hastigheten dras upp av eftersläpningen. Högre = tätare efter handen. */
const GAIN = 10

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
  }
  return s
}

export function KeyedVideo({
  sources,
  /** Nyckelfärgen i klippet, 0–255. */
  keyColor = [200, 12, 210],
  /** Hur nära nyckelfärgens ton en pixel måste ligga för att räknas som skärm. */
  tolerance = 0.82,
  softness = 0.12,
  /** Returnerar 0–1: var i klippet vi ska stå. */
  progress,
  className = '',
  onReady,
  onFail,
}: {
  /** Samma klipp i flera format — se kommentaren vid uppspelningen. */
  sources: { src: string; type: string }[]
  keyColor?: [number, number, number]
  tolerance?: number
  softness?: number
  progress: (f: Frame) => number
  className?: string
  onReady?: () => void
  /** Anropas om filmen inte går att visa alls, så sidan kan klara sig utan. */
  onFail?: () => void
}) {
  const [keyR, keyG, keyB] = keyColor
  // Stabil identitet för listan, så effekten inte körs om vid varje rendering.
  const key = sources.map((s) => s.src).join('|')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const glRef = useRef<{
    gl: WebGLRenderingContext
    tex: WebGLTexture
    uFit: WebGLUniformLocation
  } | null>(null)
  /** Uppspelningspunkten som redan ligger på duken. */
  const drawn = useRef(-1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const video = document.createElement('video')
    // Chromium utan patentbelagda kodekar spelar inte H.264, och Safari
    // spelar inte VP9. Webbläsaren får välja den första den klarar.
    for (const s of sources) {
      const el = document.createElement('source')
      el.src = s.src
      el.type = s.type
      video.appendChild(el)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    // Attributen behövs vid sidan av egenskaperna: iOS läser dem när
    // elementet sätts in i dokumentet, inte efteråt.
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    // Videon måste sitta i dokumentet. En löst skapad video avkodar inte i
    // Safari på iOS — den ger inga bildrutor att lägga i texturen, och då
    // blir duken tom fastän allt annat ser rätt ut. Den göms med storlek
    // och genomskinlighet i stället för display:none, som stoppar
    // avkodningen på samma sätt.
    video.className = 'film__source'
    canvas.parentElement?.appendChild(video)
    videoRef.current = video

    // iOS avkodar inte en video som aldrig rörts vid, och vägrar då söka i
    // den. Ett tyst play/pause direkt gör den sökbar utan att något syns.
    const prime = () => {
      video.play().then(() => { video.pause() }).catch(() => {})
    }
    video.addEventListener('loadeddata', () => { prime(); onReady?.() }, { once: true })
    // Nekas uppspelning utan handpåläggning tas första bästa beröring.
    const onTouch = () => prime()
    window.addEventListener('pointerdown', onTouch, { once: true, passive: true })
    window.addEventListener('touchstart', onTouch, { once: true, passive: true })

    // Går klippet inte att spela alls — fel kodek, fel filtyp, nekad hämtning
    // — ska sidan säga till så att den kan visas utan film i stället för att
    // stå kvar och zooma i ett tomt rum.
    const fail = () => onFail?.()
    video.addEventListener('error', fail)
    const watchdog = window.setTimeout(() => {
      if (video.readyState < 2) fail()
    }, 12000)

    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true })
    if (!gl) {
      fail()
      return () => {
        window.clearTimeout(watchdog)
        video.remove()
      }
    }

    // Saknas WebGL, eller vägrar shadern kompilera, ska sidan fortsätta
    // fungera utan filmen i stället för att bli svart.
    try {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const tex = gl.createTexture()!
    // En videobildruta har origo i övre vänstra hörnet, en textur i nedre.
    // Utan det här kommer filmen upp och ner.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    gl.uniform3f(gl.getUniformLocation(prog, 'uKey'), keyR / 255, keyG / 255, keyB / 255)
    gl.uniform2f(gl.getUniformLocation(prog, 'uTol'), tolerance, softness)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    glRef.current = { gl, tex, uFit: gl.getUniformLocation(prog, 'uFit')! }
    } catch (err) {
      console.warn('Filmen kunde inte startas:', err)
      glRef.current = null
      fail()
    }

    return () => {
      window.clearTimeout(watchdog)
      video.removeEventListener('error', fail)
      window.removeEventListener('pointerdown', onTouch)
      window.removeEventListener('touchstart', onTouch)
      video.remove()
      video.innerHTML = ''
      video.load()
      glRef.current = null
    }
  }, [key, keyR, keyG, keyB, tolerance, softness, onReady, onFail])

  useFrame((f) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = glRef.current
    if (!canvas || !video || !ctx || video.readyState < 2) return

    const d = video.duration
    if (!d || !isFinite(d)) return

    // ── Hur klippet följer scrollen ────────────────────────────────────
    // Att söka (`currentTime = …`) en gång per bildruta ser ut som det
    // borde fungera, men gör det inte: varje sökning är asynkron, tar
    // längre tid än en bildruta, och medan den pågår står bilden still.
    // Rörelsen blir ryckig och ligger alltid steget efter handen.
    //
    // I stället låter vi klippet spelas — men i den takt scrollen ber om.
    // Då avkodar webbläsaren löpande, precis som vid vanlig uppspelning,
    // och varje bildruta kommer fram i tid. Sökning används bara till det
    // den är bra på: att backa, och att ta igen ett långt hopp.
    const target = clamp01(progress(f)) * d
    const diff = target - video.currentTime

    if (diff < -0.03 || diff > JUMP) {
      // Bakåt, eller så långt efter att uppspelning aldrig hinner ikapp.
      if (!video.seeking) {
        if (!video.paused) video.pause()
        video.currentTime = target
      }
    } else if (video.paused) {
      // Stillastående: vänta tills det finns minst en bildruta att visa.
      if (diff > RESUME) {
        video.playbackRate = clamp(diff * GAIN, 0.25, 4)
        video.play().catch(() => {})
      }
    } else if (diff < SETTLE) {
      // Ikapp — kameran ska stå still tills man drar igen.
      video.pause()
    } else {
      // Framåt: ju längre efter vi ligger, desto snabbare spelas klippet.
      video.playbackRate = clamp(diff * GAIN, 0.25, 4)
    }

    // Rita aldrig i fler bildpunkter än klippet självt har. Duken kan vara
    // långt bredare än fönstret — på en stående telefon fyller bildrutan
    // höjden och skjuter ut åt sidorna — och varje extra bildpunkt är en
    // textur som ska laddas upp till grafikkortet varje bildruta, utan att
    // det finns någon skärpa kvar att hämta.
    const source = (video.videoWidth || 1280) * 1.15
    const css = canvas.clientWidth || 1
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5, source / css)
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
    if (!w || !h) return

    const resized = canvas.width !== w || canvas.height !== h
    if (resized) {
      canvas.width = w
      canvas.height = h
    }

    // Står klippet still finns det ingen ny bildruta att ladda upp. Att
    // ändå göra det varje varv tar tid från allt annat på sidan — och det
    // är den tiden rörelsen känns i.
    if (!resized && video.currentTime === drawn.current) return
    drawn.current = video.currentTime

    const { gl, tex, uFit } = ctx
    gl.viewport(0, 0, w, h)

    // Hela bildrutan ritas. Att den ryms i fönstret utan att beskäras
    // sköts av ramen i CSS, inte här.
    gl.uniform4f(uFit, 1, 1, 0, 0)

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  })

  return <canvas className={className} ref={canvasRef} aria-hidden="true" />
}
