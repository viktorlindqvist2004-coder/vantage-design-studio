import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useViewport } from '../lib/hooks'
import { clamp01, easeInOutCubic, lerp, mapRange } from '../lib/math'
import { PHOTO } from '../data/scene-photo'
import { CROSSFADE, SHOTS, type Shot } from '../data/film'
import { About, Numbers, Services } from './inner/Sections'
import { Process } from './inner/Process'
import { Contact } from './Plates'

/**
 * Varje tagning ger sitt innehåll ett eget "spår" att animera mot, i stället
 * för sidans scrollposition inuti skärmen. Sektionerna behöver därför inte
 * veta om de spelas inne i bildskärmen eller ute i rummet.
 */
export type ShotRange = { start: number; length: number }

const ShotRangeContext = createContext<ShotRange | null>(null)
export const useShotRange = () => useContext(ShotRangeContext)

/** Var varje tagning börjar och slutar, i px. */
export function shotRanges(vh: number) {
  let at = 0
  return SHOTS.map((s) => {
    const length = s.length * vh
    const range = { start: at, length }
    at += length
    return range
  })
}

export const filmLength = (vh: number) =>
  SHOTS.reduce((sum, s) => sum + s.length * vh, 0)

const SECTIONS: Record<string, ReactNode> = {
  window: <Services />,
  shelf: <Process />,
  samples: (
    <>
      <Numbers />
      <About />
    </>
  ),
  lamp: <Contact variant="film" />,
}

/**
 * Kameraresan genom studion.
 *
 * Efter att kameran backat ut ur skärmen fortsätter den från plats till plats
 * i rummet. Varje tagning panorerar och åker mellan två kameralägen medan man
 * scrollar, och nästa tagning tonas in över slutet av den föregående — så att
 * resan läser som en enda lång tagning i stället för som klipp.
 */
export function RoomFilm() {
  const { vw, vh } = useViewport()
  const ranges = useMemo(() => shotRanges(vh), [vh])
  const rootRef = useRef<HTMLDivElement>(null)
  const plateRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRef = useRef<HTMLSpanElement>(null)

  // Bilderna täcker rutan (cover) — måtten behövs för att räkna ut var i
  // bilden kameran tittar.
  const plateW = Math.max(vw, vh * PHOTO.aspect)
  const plateH = plateW / PHOTO.aspect

  useFrame((f) => {
    // Hela resan tonas in när utzoomningen ur skärmen är klar.
    if (rootRef.current) {
      const on = f.filmMax > 0 ? mapRange(f.film, 0, vh * 0.4) : 0
      rootRef.current.style.opacity = on.toFixed(3)
      rootRef.current.style.visibility = on <= 0.005 ? 'hidden' : 'visible'
    }

    let active = 0

    SHOTS.forEach((shot, i) => {
      const el = plateRefs.current[i]
      const r = ranges[i]
      if (!el || !r) return

      const p = clamp01((f.film - r.start) / r.length)
      const e = easeInOutCubic(p)

      // Kameraläget glider mellan tagningens två märken.
      const x = lerp(shot.from.x, shot.to.x, e)
      const y = lerp(shot.from.y, shot.to.y, e)
      const s = lerp(shot.from.scale, shot.to.scale, e)

      // Flytta punkten kameran tittar på till mitten av rutan.
      const tx = plateW * (0.5 - x)
      const ty = plateH * (0.5 - y)

      el.style.transformOrigin = `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`
      el.style.transform =
        `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`

      // Tagningen tonas in över slutet av den föregående.
      const fade = r.length * CROSSFADE
      const o = i === 0
        ? 1
        : clamp01((f.film - (r.start - fade)) / fade)
      el.style.opacity = o.toFixed(3)

      if (f.film >= r.start - fade * 0.5) active = i
    })

    // Sista tagningen bär kontaktuppgifterna ända ut i kanterna, så
    // platsetiketten skulle lägga sig ovanpå kolofonen där.
    const last = active === SHOTS.length - 1
    const label = last ? '' : (SHOTS[active]?.place ?? '')
    if (labelRef.current) {
      if (labelRef.current.textContent !== label) labelRef.current.textContent = label
      labelRef.current.style.opacity = last ? '0' : '1'
    }
  })

  return (
    <div className="film" ref={rootRef} aria-hidden={false}>
      {SHOTS.map((shot, i) => (
        <div
          className="film__plate"
          key={shot.id}
          ref={(el) => { plateRefs.current[i] = el }}
          style={{
            width: `${plateW}px`,
            height: `${plateH}px`,
            left: `${(vw - plateW) / 2}px`,
            top: `${(vh - plateH) / 2}px`,
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}${shot.plate}`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />
          <div className="film__grade" />
        </div>
      ))}

      <div className="film__scrim" />

      <span className="film__place label" ref={labelRef} aria-hidden="true" />

      {SHOTS.map((shot, i) => (
        <ShotStage key={shot.id} shot={shot} range={ranges[i]}>
          {SECTIONS[shot.id]}
        </ShotStage>
      ))}
    </div>
  )
}

/** Innehållet som hör till en tagning, med sitt eget spår att animera mot. */
function ShotStage({
  shot,
  range,
  children,
}: {
  shot: Shot
  range: ShotRange
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    const el = ref.current
    if (!el) return
    const p = clamp01((f.film - range.start) / range.length)
    // Texten kommer in tidigt och lämnar innan kameran nått fram, så att
    // rummet får ett ögonblick för sig själv mellan platserna.
    const inn = mapRange(p, 0.06, 0.24)
    const out = mapRange(p, 0.82, 0.98)
    const o = inn * (1 - out)
    el.style.opacity = o.toFixed(3)
    el.style.visibility = o <= 0.005 ? 'hidden' : 'visible'
    el.style.transform = `translate3d(0, ${((1 - inn) * 34 - out * 26).toFixed(1)}px, 0)`
    el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
  })

  return (
    <ShotRangeContext.Provider value={range}>
      <div className={`film__stage film__stage--${shot.id}`} ref={ref}>
        {children}
      </div>
    </ShotRangeContext.Provider>
  )
}
