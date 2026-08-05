import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { KeyedVideo } from './KeyedVideo'
import { useFrame, useViewport } from '../lib/hooks'
import { clamp01, easeOutCubic, lerp, mapRange } from '../lib/math'
import { CLIP, SCROLL_PER_SECOND, SHOTS } from '../data/film'
import { About, Numbers, Services } from './inner/Sections'
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

/** Scrollsträckan för resten av klippet, efter skärmen. */
export const roomLength = (vh: number) =>
  secondsToPx(CLIP.duration - CLIP.enter, vh)

const SECTIONS: Record<string, ReactNode> = {
  window: <Services />,
  shelf: <Process />,
  lamp: (
    <>
      <Numbers />
      <About />
    </>
  ),
  samples: <Contact variant="film" />,
}

/**
 * Var i klippet vi står just nu, som 0–1.
 *
 * Tre skeden: kameran åker in mot skärmen, står stilla vid skärmen medan
 * sidan rullar, och fortsätter sedan genom rummet. Utan pausen i mitten
 * skulle kameran åka vidare medan man läser.
 */
function clipProgress(f: Frame) {
  const enter = CLIP.enter / CLIP.duration
  if (f.act1 < 1) return f.act1 * enter
  if (f.filmMax <= 0) return enter
  const after = f.film / f.filmMax
  return enter + after * (1 - enter)
}

export function Film({ page }: { page: ReactNode }) {
  const { vw, vh } = useViewport()

  // Klippet ska rymmas helt i fönstret utan beskärning. Sidan bakom måste
  // ligga i exakt samma ram, annars hamnar den inte i skärmen i filmen.
  const frameW = Math.min(vw, vh * CLIP.aspect)
  const frameH = frameW / CLIP.aspect
  const pageRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)

  const ranges = useMemo(() => {
    const map: Record<string, ShotRange> = {}
    for (const s of SHOTS) {
      map[s.id] = {
        start: secondsToPx(s.from - CLIP.enter, vh),
        length: secondsToPx(s.to - s.from, vh),
      }
    }
    return map
  }, [vh])

  useFrame((f) => {
    // Sidan syns bara så länge skärmen finns i bild. Efter det ligger den
    // bakom en ogenomskinlig film och behöver inte ritas alls.
    if (pageRef.current) {
      const gone = f.film > secondsToPx(0.25, f.vh)
      pageRef.current.style.visibility = gone ? 'hidden' : 'visible'
      // Sidan närmar sig svagt medan kameran gör det, så att den känns
      // som en yta i rummet och inte som en bild bakom ett hål.
      const s = lerp(1.1, 1, easeOutCubic(f.act1))
      pageRef.current.style.transform = `scale(${s.toFixed(4)})`
    }

    // Scrimmen finns för texten ute i rummet. Medan skärmen är motivet
    // skulle den bara lägga en grå hinna över sidan.
    if (scrimRef.current) {
      const atScreen = mapRange(f.act1, 0.55, 0.95) * (1 - mapRange(f.film, 0, secondsToPx(0.35, f.vh)))
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
        <div className="film__page" ref={pageRef}>{page}</div>

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
    el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
  })

  return (
    <ShotRangeContext.Provider value={range}>
      <div className={`film__stage film__stage--${id}`} ref={ref}>
        {children}
      </div>
    </ShotRangeContext.Provider>
  )
}
