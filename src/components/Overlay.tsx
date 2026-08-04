import { useEffect, useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { getMetrics } from '../lib/scroll'
import { clamp01, damp, mapRange } from '../lib/math'
import { cameraProgress } from './Stage'
import { STUDIO } from '../data/content'

/* ── Muspekare ───────────────────────────────────────────────────────── */

export function Cursor() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: -100, y: -100 })
  const pos = useRef({ x: -100, y: -100, rx: -100, ry: -100, scale: 1 })
  const hot = useRef(false)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
    }
    const onOver = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      hot.current = !!el?.closest?.('a, button, .card, .srv')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
    }
  }, [])

  useFrame((f) => {
    const p = pos.current
    p.x = damp(p.x, target.current.x, 0.45, f.dt)
    p.y = damp(p.y, target.current.y, 0.45, f.dt)
    p.rx = damp(p.rx, target.current.x, 0.12, f.dt)
    p.ry = damp(p.ry, target.current.y, 0.12, f.dt)
    p.scale = damp(p.scale, hot.current ? 1.55 : 1, 0.12, f.dt)

    if (wrapRef.current) {
      wrapRef.current.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`
    }
    if (ringRef.current) {
      const dx = p.rx - p.x
      const dy = p.ry - p.y
      ringRef.current.style.transform =
        `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${p.scale.toFixed(3)})`
    }
  })

  return (
    <div className="cursor" ref={wrapRef} aria-hidden="true">
      <div className="cursor__ring" ref={ringRef} />
      <div className="cursor__dot" />
    </div>
  )
}

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
    const u = cameraProgress(f.act1, f.act3)
    const hide = mapRange(u, 0.45, 0.72) * (1 - mapRange(u, 0.86, 0.99))
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
