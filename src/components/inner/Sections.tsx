import { useRef } from 'react'
import { useFrame } from '../../lib/hooks'
import { useTrack } from '../../lib/track'
import { clamp01, easeOutCubic, mapRange } from '../../lib/math'
import { MANIFEST, SERVICES, STATS, STUDIO } from '../../data/content'

/** Fördröjer element i en serie så att de rör sig in efter varandra. */
const stagger = (p: number, i: number, n: number, spread = 0.55) => {
  const step = spread / Math.max(n - 1, 1)
  return clamp01((p - i * step) / (1 - spread))
}

/* ── Hjältesektionen inne i skärmen ──────────────────────────────────── */

const WORDMARK = 'Vantage Design Studio'
const WORDS = WORDMARK.split(' ')
/** Var i ordmärket varje ord börjar — bokstäverna trappas i en följd. */
const WORD_START = WORDS.reduce<number[]>(
  (acc, _, i) => [...acc, i === 0 ? 0 : acc[i - 1] + WORDS[i - 1].length + 1],
  [],
)

export function Hero() {
  const chars = useRef<(HTMLSpanElement | null)[]>([])
  const subRef = useRef<HTMLParagraphElement>(null)
  const metaRef = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    // Sektionen ligger överst — dess uttåg styrs direkt av scrollen.
    const p = easeOutCubic(clamp01(f.inner / f.pageH))

    chars.current.forEach((el, i) => {
      if (!el) return
      const s = stagger(p, i, WORDMARK.length, 0.45)
      el.style.transform = `translate3d(0, ${(-s * 26).toFixed(2)}%, 0)`
      el.style.opacity = (1 - s).toFixed(3)
    })

    if (subRef.current) {
      subRef.current.style.transform = `translate3d(0, ${(-p * 24).toFixed(1)}px, 0)`
      subRef.current.style.opacity = (1 - clamp01(p * 1.5)).toFixed(3)
    }
    if (metaRef.current) {
      metaRef.current.style.opacity = (1 - clamp01(p * 2)).toFixed(3)
    }
  })

  return (
    <section className="s-hero" id="start">
      <div className="s-hero__glow" aria-hidden="true" />

      {/* Varje bokstav rör sig för sig, men orden måste hålla ihop — annars
          bryts raden mitt inne i ett ord när den inte får plats. */}
      <h1 className="wordmark" aria-label={`${STUDIO.name} — designstudio`}>
        {WORDS.map((word, w) => (
          <span className="wordmark__word" key={word} aria-hidden="true">
            {word.split('').map((c, j) => {
              const i = WORD_START[w] + j
              return (
                <span
                  key={j}
                  ref={(el) => { chars.current[i] = el }}
                  className="wordmark__char"
                >
                  {c}
                </span>
              )
            })}
          </span>
        ))}
      </h1>

      <p className="hero__sub" ref={subRef}>
        Designstudio för webbplatser med lugn form, tydlig riktning och
        genomtänkt rörelse. Från tomt ark till lansering.
      </p>

      <div className="hero__meta label" ref={metaRef}>
        <span>Grundad {STUDIO.founded}</span>
        <span>{STUDIO.location}</span>
        <span>Design &amp; utveckling</span>
      </div>
    </section>
  )
}

/* ── Manifest ────────────────────────────────────────────────────────── */

export function Manifest() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const words = useRef<(HTMLSpanElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).enter, 0.2, 0.7)
    words.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, MANIFEST.length, 0.82))
      el.style.opacity = (0.14 + s * 0.86).toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 0.12).toFixed(3)}em, 0)`
    })
  })

  return (
    <section className="s-manifest" ref={ref} id="manifest">
      <p className="manifest__text">
        {MANIFEST.map((w, i) => (
          <span
            key={i}
            ref={(el) => { words.current[i] = el }}
            className="manifest__word"
          >
            {w}
          </span>
        ))}
      </p>
    </section>
  )
}

/* ── Tjänster ────────────────────────────────────────────────────────── */

export function Services() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const rows = useRef<(HTMLDivElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).enter, 0.12, 0.62)
    rows.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, SERVICES.length, 0.62))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 28).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-services" ref={ref} id="tjanster">
      <span className="label label--lead">Vad vi gör</span>
      {SERVICES.map((s, i) => (
        <div className="srv" key={s.name} ref={(el) => { rows.current[i] = el }}>
          <span className="srv__num">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="srv__name">{s.name}</h3>
          <p className="srv__desc">{s.desc}</p>
        </div>
      ))}
    </section>
  )
}

/* ── Siffror ─────────────────────────────────────────────────────────── */

export function Numbers() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const items = useRef<(HTMLDivElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).enter, 0.2, 0.64)
    items.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, STATS.length, 0.5))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 24).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-numbers" ref={ref}>
      {STATS.map((s, i) => (
        <div className="stat" key={s.label} ref={(el) => { items.current[i] = el }}>
          <div className="stat__value">{s.value}</div>
          <p className="stat__label">{s.label}</p>
        </div>
      ))}
    </section>
  )
}

/* ── Om studion ──────────────────────────────────────────────────────── */

export function About() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const leadRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    const t = track(f)
    const p = easeOutCubic(mapRange(t.enter, 0.18, 0.58))
    const q = easeOutCubic(mapRange(t.enter, 0.26, 0.68))

    if (leadRef.current) {
      leadRef.current.style.opacity = p.toFixed(3)
      leadRef.current.style.transform = `translate3d(0, ${((1 - p) * 26).toFixed(1)}px, 0)`
    }
    if (bodyRef.current) {
      bodyRef.current.style.opacity = q.toFixed(3)
      bodyRef.current.style.transform = `translate3d(0, ${((1 - q) * 32).toFixed(1)}px, 0)`
    }
  })

  return (
    <section className="sec s-about" ref={ref} id="studion">
      <div>
        <span className="label label--lead">Studion</span>
        <h2 className="h-lg" ref={leadRef}>
          En liten studio med en stor omsorg om detaljer.
        </h2>
      </div>

      <div className="about__body" ref={bodyRef}>
        <p className="body">
          {STUDIO.name} grundades {STUDIO.founded}. Idén var enkel: de flesta
          webbplatser ser likadana ut för att de byggs likadant. Vi börjar i
          stället varje projekt med ett tomt ark, och slutar med något som
          bara kan tillhöra just din verksamhet.
        </p>
        <p className="body">
          Vi är ett litet team av designers och utvecklare, och vi tar få
          uppdrag åt gången. Det gör att du alltid pratar direkt med dem som
          ritar och kodar, och att varje detalj hinner bli genomtänkt —
          typografin, rörelsen, laddtiden och allt däremellan.
        </p>
        <div className="about__sign">
          <span className="about__name">{STUDIO.name}</span>
          <span className="label">Design &amp; utveckling</span>
        </div>
      </div>
    </section>
  )
}
