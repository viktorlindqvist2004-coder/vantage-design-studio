import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { KeyedVideo } from './KeyedVideo'
import { useFrame, useViewport } from '../lib/hooks'
import { clamp, clamp01, lerp, mapRange } from '../lib/math'
import { CLIP, SCROLL_PER_SECOND, SHOTS } from '../data/film'
import { SCREEN_TRACK } from '../data/screen-track'
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

/** Minsta andel av fönsterhöjden bildrutan får ta, innan den beskärs. */
const MIN_FRAME_HEIGHT = 0.68

/**
 * Klippets ram i fönstret, och sidans ram inuti den.
 *
 * Helst syns hela bildrutan. På en bred skärm gör den det utan vidare, men
 * på en stående telefon blir "hela bildrutan" en remsa på ett par hundra
 * pixlar mitt i rutan — rummet försvinner och sidan bakom skärmen blir en
 * springa. Därför tillåts ramen växa förbi fönsterbredden tills den tar en
 * dryg tvåtredjedel av höjden; det som hamnar utanför i sidled beskärs.
 *
 * Sidan ligger i samma ram som filmen — annars hamnar den inte i skärmen i
 * klippet — men aldrig utanför fönstret, för då vore texten obeskuren bara
 * på pappret.
 */
export function frameSize(vw: number, vh: number) {
  const contain = Math.min(vw, vh * CLIP.aspect)
  const cover = Math.max(vw, vh * CLIP.aspect)
  const w = clamp(vh * MIN_FRAME_HEIGHT * CLIP.aspect, contain, cover)
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
  if (!track.length) return { cx: 0.5, cy: 0.5, w: 1 }
  if (t <= track[0][0]) return { cx: track[0][1], cy: track[0][2], w: track[0][3] }

  for (let i = 1; i < track.length; i++) {
    const [t1, cx1, cy1, w1] = track[i]
    if (t > t1) continue
    const [t0, cx0, cy0, w0] = track[i - 1]
    const k = (t - t0) / (t1 - t0 || 1)
    return { cx: lerp(cx0, cx1, k), cy: lerp(cy0, cy1, k), w: lerp(w0, w1, k) }
  }

  const last = track[track.length - 1]
  return { cx: last[1], cy: last[2], w: last[3] }
}

/**
 * Sidan ska se ut att stå på bildskärmen, inte bakom den. Måttet ovan är
 * skärmens yttre kant; sidan läggs en gnutta innanför så att ingen mörk
 * remsa kan sticka ut utanför skärmen på vägen in.
 */
const SCREEN_INSET = 0.985

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

export function Film({ page }: { page: ReactNode }) {
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

      // Sidan läggs exakt där skärmen står i bildrutan och krymps till dess
      // storlek. Den är alltså inte en bakgrund som råkar synas genom ett
      // hål — den sitter på skärmen, och texten växer i takt med att
      // kameran kommer närmare, precis som den skulle göra på riktigt.
      // Samma mått bär utflygningen: sidan krymper tillbaka ned på skärmen.
      const screen = sampleScreen(clipSecond(f))
      const scale = (screen.w * frameW * SCREEN_INSET) / pageW
      const x = screen.cx * frameW - (pageW * scale) / 2
      const y = screen.cy * frameH - (pageH * scale) / 2
      pageRef.current.style.transform =
        `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(5)})`
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
      <div
        className="film__frame"
        style={{ width: `${frameW}px`, height: `${frameH}px` }}
      >
        {/* Webbplatsen — syns genom den bortnycklade skärmen. */}
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

        <KeyedVideo
          className="film__video"
          sources={CLIP.sources.map((s) => ({
            src: `${import.meta.env.BASE_URL}${s.src}`,
            type: s.type,
          }))}
          keyColor={CLIP.key}
          progress={clipProgress}
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
