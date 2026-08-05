import { useEffect, useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { clamp01 } from '../lib/math'
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
}: {
  /** Samma klipp i flera format — se kommentaren vid uppspelningen. */
  sources: { src: string; type: string }[]
  keyColor?: [number, number, number]
  tolerance?: number
  softness?: number
  progress: (f: Frame) => number
  className?: string
  onReady?: () => void
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
  const lastTime = useRef(-1)

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
    videoRef.current = video

    // iOS avkodar inte en video som aldrig rörts vid, och vägrar då söka i
    // den. Ett tyst play/pause direkt gör den sökbar utan att något syns.
    const prime = () => {
      video.play().then(() => { video.pause(); video.currentTime = 0 }).catch(() => {})
      onReady?.()
    }
    video.addEventListener('loadeddata', prime, { once: true })

    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true })
    if (!gl) return

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
    }

    return () => {
      video.innerHTML = ''
      video.load()
      glRef.current = null
    }
  }, [key, keyR, keyG, keyB, tolerance, softness, onReady])

  useFrame((f) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = glRef.current
    if (!canvas || !video || !ctx || video.readyState < 2) return

    const d = video.duration
    if (!d || !isFinite(d)) return

    // Scrollen är enda drivkraften.
    const t = clamp01(progress(f)) * d
    if (Math.abs(t - lastTime.current) > 1 / 240) {
      lastTime.current = t
      video.currentTime = t
    }

    // Rita bara i den upplösning skärmen faktiskt har.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(f.vw * dpr)
    const h = Math.round(f.vh * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    const { gl, tex, uFit } = ctx
    gl.viewport(0, 0, w, h)

    // Cover: fyll rutan utan att förvränga bilden.
    const va = video.videoWidth / video.videoHeight
    const ca = f.vw / f.vh
    const sx = va > ca ? ca / va : 1
    const sy = va > ca ? 1 : va / ca
    gl.uniform4f(uFit, sx, sy, (1 - sx) / 2, (1 - sy) / 2)

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  })

  return <canvas className={className} ref={canvasRef} aria-hidden="true" />
}
