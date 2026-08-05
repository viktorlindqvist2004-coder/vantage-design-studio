import { useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { clamp01, easeOutCubic, mapRange } from '../lib/math'
import { STUDIO } from '../data/content'
import { Logo, LogoMark } from './Logo'

/* ── Kontakt, efter utzoomningen ─────────────────────────────────────── */

export function Contact({
  variant = 'overlay',
}: {
  /** `film` = sista tagningen i rummet, som sköter in- och uttoning själv. */
  variant?: 'overlay' | 'static' | 'film'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isOverlay = variant === 'overlay'

  useFrame((f) => {
    const el = ref.current
    if (!el || !isOverlay) return
    // Träder fram först när rummet hunnit komma tillbaka.
    const p = easeOutCubic(mapRange(f.act3, 0.55, 0.95))
    el.style.opacity = p.toFixed(3)
    el.style.transform = `translate3d(0, ${((1 - p) * 28).toFixed(1)}px, 0)`
    el.style.visibility = p <= 0.01 ? 'hidden' : 'visible'
    el.style.pointerEvents = p > 0.6 ? 'auto' : 'none'
  })

  return (
    <div className={`contact contact--${variant}`} ref={ref} id="kontakt">
      <span className="label label--lead">Nästa steg</span>

      <h2 className="h-xl" style={{ maxWidth: '16ch' }}>
        Ska vi bygga något tillsammans?
      </h2>

      <a className="contact__mail" href={`mailto:${STUDIO.email}`} style={{ marginTop: '3vh' }}>
        {STUDIO.email}
      </a>

      <div className="contact__row">
        <div className="contact__col">
          <h4>E-post</h4>
          <a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a>
        </div>
        <div className="contact__col">
          <h4>Telefon</h4>
          <a href={`tel:${STUDIO.phone.replace(/[^\d+]/g, '')}`}>{STUDIO.phone}</a>
        </div>
        <div className="contact__col">
          <h4>Var vi finns</h4>
          <p>{STUDIO.location}</p>
        </div>
        <div className="contact__col">
          <h4>Studion</h4>
          <p>Grundad {STUDIO.founded}</p>
        </div>
      </div>

      <div className="colophon label">
        <span className="colophon__mark"><LogoMark /></span>
        <span>© {STUDIO.founded} {STUDIO.name}</span>
        <span>Formgiven och handkodad</span>
      </div>
    </div>
  )
}

/* ── Startsekvens ────────────────────────────────────────────────────── */

export function Preloader({ done }: { done: boolean }) {
  const barRef = useRef<HTMLElement>(null)
  const value = useRef(0)

  useFrame((f) => {
    // Rusar upp och saktar in mot 100 i stället för att gå linjärt.
    const speed = f.reduced ? 1 : 0.05
    value.current = Math.min(100, value.current + (100 - value.current) * speed * (f.dt / 16.7) + 0.3)
    if (barRef.current) barRef.current.style.width = `${clamp01(value.current / 100) * 100}%`
  })

  return (
    <div className={`preloader ${done ? 'preloader--done' : ''}`} aria-hidden={done}>
      <Logo variant="stacked" className="preloader__logo" />
      <div className="preloader__bar">
        <i ref={barRef} />
      </div>
    </div>
  )
}
