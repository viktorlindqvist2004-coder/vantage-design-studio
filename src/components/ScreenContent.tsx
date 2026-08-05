import { useRef } from 'react'
import { useFrame, useMeasuredHeight } from '../lib/hooks'
import { clamp01, mapRange } from '../lib/math'
import { MARQUEE_WORDS } from '../data/content'
import { Marquee } from './inner/Marquee'
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
  reduced = false,
}: {
  onHeight: (h: number) => void
  reduced?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wakeRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const crtRef = useRef<HTMLDivElement>(null)

  useMeasuredHeight(scrollRef, onHeight)

  useFrame((f) => {
    if (scrollRef.current) {
      scrollRef.current.style.transform = `translate3d(0, ${(-f.inner).toFixed(1)}px, 0)`
    }

    const u = f.act1

    // Vinjetten hör hemma på avstånd; väl inne ska bilden vara ren. På väg
    // ut blir skärmen en skärm igen, och då kommer den tillbaka.
    if (crtRef.current) {
      const v = clamp01((1 - mapRange(u, 0.68, 0.98)) + mapRange(f.act3, 0.15, 0.7))
      crtRef.current.style.setProperty('--crt', v.toFixed(3))
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
        <Marquee words={MARQUEE_WORDS} />
        <Manifest />
        <Numbers />
        <Work />
        <Marquee
          words={['Vantage Design Studio', 'Grundad 2026', 'Handkodat', 'Inga mallar']}
          direction={-1}
          speed={0.03}
        />
        {reduced && <Contact variant="static" />}
      </div>

      {!reduced && (
        <>
          <div className="wake" ref={wakeRef} aria-hidden="true">
            <span className="wake__mark">Vantage Design Studio</span>
            <div className="wake__bar">
              <span ref={barRef} />
            </div>
          </div>

          <div className="crt" ref={crtRef} aria-hidden="true" />
        </>
      )}
    </div>
  )
}
