import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { KeyedVideo } from './KeyedVideo'
import { useFrame, useViewport } from '../lib/hooks'
import { clamp, clamp01, lerp, mapRange } from '../lib/math'
import { CLIP, SCROLL_PER_SECOND, SHOTS } from '../data/film'
import { SCREEN_TRACK, type ScreenSample } from '../data/screen-track'
import { About, Services } from './inner/Sections'
import { Process } from './inner/Process'
import { Contact } from './Plates'
import type { Frame } from '../lib/scroll'

/** Ett tidsintervall i filmen, uttryckt i scroll-px. */
export type ShotRange = { start: number; length: number }

const ShotRangeContext = createContext<ShotRange | null>(null)
export const useShotRange = () => useContext(ShotRangeContext)

/** Sekunder film omräknat till scrollsträcka. */
export const secondsToPx = (seconds: number, vh: number) =>
  seconds * SCROLL_PER_SECOND * vh

/** Scrollsträckan för inflygningen fram till skärmen. */
export const approachLength = (vh: number) => secondsToPx(CLIP.enter, vh)

/** Scrollsträckan för utflygningen — inflygningen baklänges. */
export const exitLength = (vh: number) =>
  secondsToPx(CLIP.enter - CLIP.exit, vh)

/** Scrollsträckan för kameraresan genom rummet. */
export const roomLength = (vh: number) =>
  secondsToPx(CLIP.duration - CLIP.room, vh)

/**
 * Klippets ram i fönstret, och sidans ram i samma fönster.
 *
 * På en liggande skärm ryms hela bildrutan, och då visas hela bildrutan.
 * På en stående telefon gör den inte det: en 16:9-ruta i fönstrets bredd
 * blir en remsa på ett par hundra pixlar mitt i rutan. Där fyller filmen
 * i stället höjden och beskärs i sidled — rummet syns, om än en smalare
 * del av det.
 *
 * Sidan är alltid högst så stor som fönstret. Den kan alltså inte matcha
 * en beskuren bildrutas bredd — och ska inte heller göra det. Se
 * placeScreen: den matchar skärmens höjd, och blir därmed en stående yta
 * på en liggande bildskärm. Vilket är precis vad en mobilsajt är.
 */
export function frameSize(vw: number, vh: number) {
  const portrait = vh > vw
  const w = portrait
    ? Math.max(vw, vh * CLIP.aspect)
    : Math.min(vw, vh * CLIP.aspect)
  const h = w / CLIP.aspect
  return { w, h, pageW: Math.min(w, vw), pageH: Math.min(h, vh) }
}

/**
 * Var bildskärmen står i bildrutan vid en given sekund, interpolerat mellan
 * de uppmätta bildrutorna i SCREEN_TRACK. Före första mätpunkten gäller den
 * första, efter den sista fyller skärmen hela rutan.
 */
function sampleScreen(t: number) {
  const track = SCREEN_TRACK
  if (!track.length) return { cx: 0.5, cy: 0.5, w: 1, h: 1 }
  const at = (s: ScreenSample) => ({ cx: s[1], cy: s[2], w: s[3], h: s[4] })
  if (t <= track[0][0]) return at(track[0])

  for (let i = 1; i < track.length; i++) {
    const [t1, cx1, cy1, w1, h1] = track[i]
    if (t > t1) continue
    const [t0, cx0, cy0, w0, h0] = track[i - 1]
    const k = (t - t0) / (t1 - t0 || 1)
    return {
      cx: lerp(cx0, cx1, k),
      cy: lerp(cy0, cy1, k),
      w: lerp(w0, w1, k),
      h: lerp(h0, h1, k),
    }
  }

  return at(track[track.length - 1])
}

/**
 * Sidan ska se ut att stå på bildskärmen, inte bakom den. Måttet ovan är
 * skärmens yttre kant; sidan läggs en gnutta innanför så att ingen mörk
 * remsa kan sticka ut utanför skärmen på vägen in.
 */
const SCREEN_INSET = 0.985

/**
 * Var sidan ska ligga i fönstret, och hur stor den ska vara, vid en given
 * sekund i klippet. Allt räknas i fönstrets koordinater — bildrutan är
 * centrerad i fönstret och kan vara bredare än det.
 *
 * Sidan matchar skärmens **höjd**, inte dess bredd. På en liggande skärm är
 * det samma sak — sidan och bildrutan har samma proportioner. På en stående
 * telefon är det skillnaden mellan att fungera och inte: bildrutan är där
 * fyra gånger bredare än fönstret, så en sida skalad till skärmens bredd
 * skulle förstoras fyra gånger. Texten spränger rutan och det ser ut som om
 * hela sidan zoomar in.
 *
 * Med höjden som mått blir sidan i stället en stående yta mitt på en
 * liggande bildskärm, och när kameran är framme fyller den fönstrets höjd
 * med svart omkring — vilket är svart ändå.
 */
function placeScreen(t: number, vw: number, vh: number,
  frameW: number, frameH: number, pageW: number, pageH: number) {
  const s = sampleScreen(t)

  const scale = clamp01((s.h * frameH * SCREEN_INSET) / pageH)
  const w = pageW * scale
  const h = pageH * scale

  // Skärmens mitt i fönstrets koordinater. Sidan hålls innanför kanterna
  // när den blivit så stor att den inte längre får plats var som helst.
  const cx = vw / 2 + (s.cx - 0.5) * frameW
  const cy = vh / 2 + (s.cy - 0.5) * frameH

  return {
    scale,
    x: clamp(cx, Math.min(w / 2, vw / 2), Math.max(vw - w / 2, vw / 2)) - w / 2,
    y: clamp(cy, Math.min(h / 2, vh / 2), Math.max(vh - h / 2, vh / 2)) - h / 2,
  }
}

/**
 * Varje tagning bär ett stycke av sidan. En tagning är exakt en fönsterhöjd
 * hög och rullar inte — det som ligger här måste alltså rymmas i rutan.
 * Siffrorna hör därför hemma inne i skärmen, inte ute i rummet.
 */
const SECTIONS: Record<string, ReactNode> = {
  window: <Services />,
  shelf: <Process />,
  lamp: <About />,
  samples: <Contact variant="film" />,
}

/**
 * Vilken sekund i klippet vi står på just nu.
 *
 * Fyra skeden:
 *   1. kameran åker in mot skärmen           0 → enter
 *   2. den står stilla medan sidan rullar    enter
 *   3. den backar ut ur skärmen igen         enter → exit  (baklänges)
 *   4. rumsresan, inklippt                   room → slut
 *
 * Pausen i mitten finns för att kameran annars skulle åka vidare medan man
 * läser. Utflygningen finns för att man ska komma ut ur skärmen på samma
 * väg man kom in — materialet klipper rakt från skärmen till rummet, så
 * den rörelsen finns bara om vi spelar inflygningen baklänges.
 */
function clipSecond(f: Frame) {
  if (f.act1 < 1) return f.act1 * CLIP.enter
  if (f.act3 < 1) return lerp(CLIP.enter, CLIP.exit, f.act3)
  if (f.filmMax <= 0) return CLIP.room
  return CLIP.room + (f.film / f.filmMax) * (CLIP.duration - CLIP.room)
}

const clipProgress = (f: Frame) => clipSecond(f) / CLIP.duration

export function Film({ page, onFail }: { page: ReactNode; onFail?: () => void }) {
  const { vw, vh } = useViewport()

  const { w: frameW, h: frameH, pageW, pageH } = frameSize(vw, vh)
  const pageRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)

  const ranges = useMemo(() => {
    const map: Record<string, ShotRange> = {}
    for (const s of SHOTS) {
      map[s.id] = {
        start: secondsToPx(s.from - CLIP.room, vh),
        length: secondsToPx(s.to - s.from, vh),
      }
    }
    return map
  }, [vh])

  useFrame((f) => {
    // Skärmen finns i bild under in- och utflygningen. När rumsresan väl
    // klippts in finns ingen skärm att ligga på, och sidan behöver inte
    // ritas alls.
    if (pageRef.current) {
      const gone = f.act3 >= 1
      pageRef.current.style.visibility = gone ? 'hidden' : 'visible'

      // Sidan läggs exakt där skärmen står och krymps till dess storlek.
      // Den är alltså inte en bakgrund som råkar synas genom ett hål — den
      // sitter på skärmen, och texten växer i takt med att kameran kommer
      // närmare, precis som den skulle göra på riktigt. Samma mått bär
      // utflygningen: sidan krymper tillbaka ned på skärmen.
      const p = placeScreen(clipSecond(f), vw, vh, frameW, frameH, pageW, pageH)
      pageRef.current.style.transform =
        `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) scale(${p.scale.toFixed(5)})`
    }

    // Scrimmen finns för texten ute i rummet. Medan skärmen är motivet
    // skulle den bara lägga en grå hinna över sidan.
    if (scrimRef.current) {
      const atScreen = mapRange(f.act1, 0.55, 0.95) * (1 - mapRange(f.act3, 0.35, 0.85))
      scrimRef.current.style.opacity = (1 - atScreen).toFixed(3)
    }

    if (labelRef.current) {
      const shot = SHOTS.find((s) => {
        const r = ranges[s.id]
        return f.film >= r.start && f.film < r.start + r.length
      })
      const text = shot && shot.id !== 'samples' ? shot.place : ''
      if (labelRef.current.textContent !== text) labelRef.current.textContent = text
    }
  })

  return (
    <div className="film">
      {/* Webbplatsen — syns genom den bortnycklade skärmen. Den ligger i
          fönstret, inte i bildrutan: bildrutan får vara bredare än fönstret
          och beskäras, men sidan ska aldrig hamna utanför kanten. */}
      <div
        className="film__page"
        ref={pageRef}
        style={{
          width: `${pageW}px`,
          height: `${pageH}px`,
          ['--page-h' as string]: `${pageH}px`,
        }}
      >
        {page}
      </div>

      <div
        className="film__frame"
        style={{ width: `${frameW}px`, height: `${frameH}px` }}
      >
        <KeyedVideo
          className="film__video"
          sources={CLIP.sources.map((s) => ({
            src: `${import.meta.env.BASE_URL}${s.src}`,
            type: s.type,
          }))}
          keyColor={CLIP.key}
          progress={clipProgress}
          onFail={onFail}
        />
      </div>

      <div className="film__scrim" ref={scrimRef} />
      <span className="film__place label" ref={labelRef} aria-hidden="true" />

      {SHOTS.map((shot, i) => (
        <ShotStage
          key={shot.id}
          id={shot.id}
          range={ranges[shot.id]}
          last={i === SHOTS.length - 1}
        >
          {SECTIONS[shot.id]}
        </ShotStage>
      ))}
    </div>
  )
}

/** Innehållet som hör till en plats, med sitt eget spår att animera mot. */
function ShotStage({
  id,
  range,
  last = false,
  children,
}: {
  id: string
  range: ShotRange
  /** Sista tagningen bär kontaktuppgifterna och ska stanna kvar. */
  last?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    const el = ref.current
    if (!el) return
    const p = clamp01((f.film - range.start) / range.length)
    // Texten kommer in tidigt och lämnar innan kameran nått fram, så att
    // rummet får ett ögonblick för sig själv mellan platserna.
    const inn = mapRange(p, 0.04, 0.2)
    const out = last ? 0 : mapRange(p, 0.84, 0.99)
    const o = inn * (1 - out)
    el.style.opacity = o.toFixed(3)
    el.style.visibility = o <= 0.005 ? 'hidden' : 'visible'
    el.style.transform = `translate3d(0, ${((1 - inn) * 30 - out * 24).toFixed(1)}px, 0)`
  })

  return (
    <ShotRangeContext.Provider value={range}>
      <div className={`film__stage film__stage--${id}`} ref={ref}>
        {children}
      </div>
    </ShotRangeContext.Provider>
  )
}
