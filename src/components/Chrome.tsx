import { useEffect, useRef, useState } from 'react'
import { LogoMark } from './Logo'
import { onTick, reducedMotion, useMagnetic, useTick } from '../lib/motion'

/**
 * RAMEN RUNT SIDAN
 * ════════════════
 * Det som ligger ovanpå innehållet och följer med hela vägen: listen,
 * mätaren, kornet och markören. Ingen av dem hör till något parti — de hör
 * till sidan.
 */

/* ── Listen ───────────────────────────────────────────────────────────── */

const LINKS = [
  { href: '#arbetet', text: 'Arbetet' },
  { href: '#bygger', text: 'Vi bygger' },
  { href: '#gangen', text: 'Arbetsgången' },
  { href: '#fragor', text: 'Frågor' },
]

export function Nav() {
  const ref = useRef<HTMLElement>(null)
  const knapp = useMagnetic<HTMLAnchorElement>(0.22)

  // Hinnan bakom listen tänds först när sidan rullats en bit. Överst
  // ligger listen mot ren yta och behöver ingen.
  useTick(() => {
    const el = ref.current
    if (!el) return
    const lifted = window.scrollY > 24
    if ((el.dataset.lifted === 'true') !== lifted) el.dataset.lifted = String(lifted)
  })

  return (
    <header className="nav" ref={ref} data-lifted="false">
      <a className="nav__logo" href="#topp" aria-label="Vantage Design Studio, till toppen">
        <LogoMark />
        <span>Vantage</span>
      </a>

      <nav className="nav__links" aria-label="Sidans delar">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>{l.text}</a>
        ))}
      </nav>

      <a className="btn btn--solid" href="#kontakt" ref={knapp}>
        Ta kontakt
        <Arrow />
      </a>
    </header>
  )
}

/** Pilen som används i alla knappar. Ritad, inte hämtad. */
export function Arrow() {
  return (
    <svg className="btn__arrow" width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <path d="M2 11 11 2M4.4 2H11v6.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/* ── Mätaren ──────────────────────────────────────────────────────────── */

/** Hur långt ned på sidan man kommit, som en linje överst. */
export function Rail() {
  const ref = useRef<HTMLDivElement>(null)

  useTick(() => {
    const el = ref.current
    if (!el) return
    const span = document.documentElement.scrollHeight - window.innerHeight
    const p = span > 0 ? window.scrollY / span : 0
    el.style.transform = `scaleX(${Math.min(1, Math.max(0, p)).toFixed(4)})`
  })

  return <div className="rail" ref={ref} aria-hidden="true" />
}

/* ── Kornet ───────────────────────────────────────────────────────────── */

export function Grain() {
  return <div className="grain" aria-hidden="true" />
}

/* ── Markören ─────────────────────────────────────────────────────────────
   En ring som följer pekaren med eftersläpning.
   Eftersläpningen är hela poängen: en ring som sitter exakt på pekaren är
   bara en till pekare. Den ska hinna ifatt, inte ligga före. */

export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  const [use, setUse] = useState(false)

  useEffect(() => {
    if (reducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    setUse(true)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!use || !el) return

    // Målet skrivs av pekaren, positionen hinner ifatt i bildrutevarvet.
    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let x = tx
    let y = ty

    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (el.dataset.on !== 'true') el.dataset.on = 'true'
      // Ringen växer över allt som går att använda.
      const hot = !!(e.target as Element).closest?.('a, button, [data-hot]')
      const nu = String(hot)
      if (el.dataset.hot !== nu) el.dataset.hot = nu
    }
    const leave = () => { el.dataset.on = 'false' }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)

    const stop = onTick(() => {
      x += (tx - x) * 0.18
      y += (ty - y) * 0.18
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    })

    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      stop()
    }
  }, [use])

  if (!use) return null
  return <div className="cursor" ref={ref} data-on="false" data-hot="false" aria-hidden="true" />
}
