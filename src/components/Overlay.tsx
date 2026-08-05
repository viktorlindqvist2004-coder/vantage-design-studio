import { useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { getMetrics } from '../lib/scroll'
import { clamp01, mapRange } from '../lib/math'
import { STUDIO } from '../data/content'

/* ── Navigering ──────────────────────────────────────────────────────── */

/** Sektionerna inuti skärmen nås via sidans globala scrollposition. */
function goToInner(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const { act1 } = getMetrics()
  window.scrollTo({ top: act1 + el.offsetTop, behavior: 'smooth' })
}

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

      <nav className="nav__right label">
        <div className="nav__links">
          <button className="nav__link" onClick={() => goToInner('arbeten')}>Arbeten</button>
          <button className="nav__link" onClick={() => goToInner('tjanster')}>Tjänster</button>
          <button className="nav__link" onClick={() => goToInner('process')}>Process</button>
          <button className="nav__link" onClick={() => goToInner('studion')}>Studion</button>
        </div>
        <button className="nav__link" onClick={goToContact}>Kontakt</button>
      </nav>
    </header>
  )
}

/* ── Förloppsmätare ──────────────────────────────────────────────────── */

const ACTS = ['Studion', 'Insidan', 'Kontakt']

export function Progress() {
  const fillRef = useRef<HTMLElement>(null)
  const actRef = useRef<HTMLSpanElement>(null)

  useFrame((f) => {
    const { act1, act3, innerMax } = getMetrics()
    const total = act1 + innerMax + act3 || 1
    const p = clamp01(f.y / total)

    if (fillRef.current) fillRef.current.style.height = `${(p * 100).toFixed(2)}%`

    const act = f.act3 > 0.02 ? 2 : f.act1 > 0.985 ? 1 : 0
    if (actRef.current && actRef.current.textContent !== ACTS[act]) {
      actRef.current.textContent = ACTS[act]
    }
  })

  return (
    <div className="progress" aria-hidden="true">
      <span className="progress__act" ref={actRef}>Studion</span>
      <div className="progress__rail">
        <i ref={fillRef} />
      </div>
    </div>
  )
}

/* ── Scrollhint ──────────────────────────────────────────────────────── */

export function Hint() {
  const ref = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    if (!ref.current) return
    const o = 1 - mapRange(f.act1, 0.01, 0.08)
    ref.current.style.opacity = o.toFixed(3)
    ref.current.style.visibility = o <= 0.01 ? 'hidden' : 'visible'
  })

  return (
    <div className="hint" ref={ref} aria-hidden="true">
      <div className="hint__rail" />
    </div>
  )
}
