import { useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { getMetrics } from '../lib/scroll'
import { mapRange } from '../lib/math'
import { STUDIO } from '../data/content'

/* ── Navigering ──────────────────────────────────────────────────────── */

function goToContact() {
  const { act1, act3, innerMax } = getMetrics()
  window.scrollTo({ top: act1 + innerMax + act3 * 0.85, behavior: 'smooth' })
}

export function Nav() {
  const ref = useRef<HTMLElement>(null)

  useFrame((f) => {
    if (!ref.current) return
    // Menyn drar sig undan i själva övergången in i skärmen.
    const hide = mapRange(f.act1, 0.45, 0.72) * (1 - mapRange(f.act1, 0.86, 0.99))
    ref.current.style.opacity = (1 - hide).toFixed(3)
    ref.current.style.transform = `translate3d(0, ${(-hide * 100).toFixed(1)}%, 0)`
  })

  return (
    <header className="nav" ref={ref}>
      <a className="nav__mark" href="#start" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M6 10h13l13 34 13-34h13L40 58H24z" fill="currentColor" />
        </svg>
        {STUDIO.name}
      </a>

      {/* En enda väg vidare. Fem genvägar till sektioner man ändå passerar
          på vägen ned är fem saker att läsa, inte fem saker att använda. */}
      <nav className="nav__right label">
        <button className="nav__link" onClick={goToContact}>Kontakt</button>
      </nav>
    </header>
  )
}
