import { useEffect, useRef } from 'react'
import { useFrame, useMeasuredHeight } from '../lib/hooks'
import { clamp01, mapRange } from '../lib/math'
import { Hero, Manifest, Numbers } from './inner/Sections'
import { Work } from './inner/Work'
import { Contact } from './Plates'

/**
 * Sidan som ligger bakom öppningen i rummet.
 *
 * Ytan fyller sitt plan och skalas av Scene.tsx — här hanteras bara
 * innehållet och skärmens eget vakna-läge.
 */
export function ScreenContent({
  onHeight,
  onStations,
  reduced = false,
}: {
  onHeight: (h: number) => void
  /**
   * Var sidans egna lägen ligger, mätt i rullningen inne i skärmen.
   *
   * En sektion är ett läge. Arbetena är ett undantag: de ligger på ett
   * vågrätt band som drivs av samma rullning, och där hör ett läge till
   * varje projekt — annars vore hela bandet en enda hållplats och gick
   * inte att ta sig igenom.
   */
  onStations?: (offsets: number[]) => void
  reduced?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wakeRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)

  useMeasuredHeight(scrollRef, onHeight)
  useStationOffsets(scrollRef, onStations)

  useFrame((f) => {
    if (scrollRef.current) {
      scrollRef.current.style.transform = `translate3d(0, ${(-f.inner).toFixed(1)}px, 0)`
    }

    // Skärmen vaknar lugnt medan kameran närmar sig, och somnar om först när
    // vi nästan är ute igen. Vore tröskeln symmetrisk skulle vilolägets
    // ordmärke lägga sig över texten mitt i utzoomningen.
    const wake = wakeRef.current
    if (wake) {
      const fade = clamp01(
        (1 - mapRange(f.act1, 0.34, 0.62)) + mapRange(f.act3, 0.55, 0.95),
      )
      wake.style.opacity = fade.toFixed(3)
      wake.style.visibility = fade <= 0.01 ? 'hidden' : 'visible'
    }
    if (barRef.current) {
      barRef.current.style.width = `${(mapRange(f.act1, 0.06, 0.34) * 100).toFixed(1)}%`
    }
  })

  return (
    <div className="screen-content">
      <div className="screen-scroll" ref={scrollRef}>
        <Hero />
        <Manifest />
        <Numbers />
        <Work />
        {reduced && <Contact variant="static" />}
      </div>

      {!reduced && (
        <div className="wake" ref={wakeRef} aria-hidden="true">
          <span className="wake__mark">Vantage Design Studio</span>
          <div className="wake__bar">
            <span ref={barRef} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Mäter upp sektionernas lägen och rapporterar dem uppåt. Mätningen görs om
 * när något ändrar storlek, för lägena är i pixlar och pixlarna beror på
 * fönstret.
 */
function useStationOffsets(
  ref: React.RefObject<HTMLDivElement | null>,
  onChange?: (offsets: number[]) => void,
) {
  const cb = useRef(onChange)
  cb.current = onChange

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const offsets: number[] = []
      el.querySelectorAll<HTMLElement>('[data-station]').forEach((node) => {
        const count = Number(node.dataset.stations ?? 1)
        const span = count > 1 ? node.offsetHeight - window.innerHeight : 0
        for (let i = 0; i < count; i++) {
          offsets.push(node.offsetTop + (span * i) / Math.max(count - 1, 1))
        }
      })
      cb.current?.(offsets)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref])
}
