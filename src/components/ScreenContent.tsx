import { useEffect, useRef } from 'react'
import { useFrame, useMeasuredHeight } from '../lib/hooks'
import { clamp01, mapRange } from '../lib/math'
import { Logo } from './Logo'
import { Faq, Hero, Manifest, Numbers, Why } from './inner/Sections'
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
        <Why />
        <Numbers />
        <Work />
        <Faq />
        {reduced && <Contact variant="static" />}
      </div>

      {!reduced && (
        <div className="wake" ref={wakeRef} aria-hidden="true">
          <Logo variant="stacked" className="wake__logo" />
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
      // Rutan är filmens ram, inte fönstret. På en telefon är den märkbart
      // lägre, och mäter man mot fönstret tror man att mer ryms än det gör.
      const view = el.parentElement?.clientHeight || window.innerHeight
      const offsets: number[] = []

      el.querySelectorAll<HTMLElement>('[data-station]').forEach((node) => {
        const span = Math.max(node.offsetHeight - view, 0)

        // Hur många lägen sektionen behöver.
        //
        // De flesta är precis en ruta höga och har ett läge. Några — bandet
        // med webbplatstyper, processtegen — säger själva hur många de vill
        // ha. Resten räknas fram: en sektion som blivit högre än rutan har
        // innehåll under vikningen, och utan ett läge där nere hoppar nästa
        // dragning rakt förbi det. Det märks inte på en bred skärm, där allt
        // ändå får plats, utan först på en telefon där texten radbryts till
        // dubbla höjden.
        const asked = Number(node.dataset.stations ?? 0)
        const needed = Math.ceil(span / (view * 0.9)) + 1
        const count = Math.max(asked, needed, 1)

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
