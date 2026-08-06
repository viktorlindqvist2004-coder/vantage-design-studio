import { useRef } from 'react'
import { LogoMark } from '../Logo'
import { useFrame } from '../../lib/hooks'
import { useTrack } from '../../lib/track'
import { clamp01, easeOutCubic, mapRange } from '../../lib/math'
import {
  DIALOGUE, FAQ, MANIFEST, MANIFEST_ASIDE, ROOM_STILLS, SERVICES, STATS,
  STILLS_LEAD, STUDIO, WHY, WHY_LEAD,
} from '../../data/content'

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
    <section className="s-hero" id="start" data-station>
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
        Vi hjälper företag till en webbplats som är lätt att förstå, snabb
        att använda och enkel att växa med. Från första samtal till lansering
        — och en bra bit därefter.
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
  const asideRef = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    const p = mapRange(track(f).settle, 0.25, 0.95)
    words.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, MANIFEST.length, 0.82))
      el.style.opacity = (0.14 + s * 0.86).toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 0.12).toFixed(3)}em, 0)`
    })

    // Frågorna kommer efter påståendet, inte samtidigt — de är svaret på
    // det, och ska läsas i den ordningen.
    if (asideRef.current) {
      const q = easeOutCubic(mapRange(track(f).settle, 0.6, 1))
      asideRef.current.style.opacity = q.toFixed(3)
      asideRef.current.style.transform = `translate3d(0, ${((1 - q) * 20).toFixed(1)}px, 0)`
    }
  })

  return (
    <section className="s-manifest" ref={ref} id="manifest" data-station>
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

      <div className="manifest__aside" ref={asideRef}>
        <span className="label">{MANIFEST_ASIDE.lead}</span>
        <ol className="manifest__list">
          {MANIFEST_ASIDE.points.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ── Rummet i stillbild ──────────────────────────────────────────────── */

/**
 * Tre plåtar ur filmen, stillastående.
 *
 * Bilderna ligger på plats i markeringen med sina mått angivna, så att raden
 * har sin höjd innan de laddats — annars hoppar allt under dem när de
 * kommer in. WebP först, JPEG för den som inte klarar den.
 */
export function Stills() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const items = useRef<(HTMLElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).settle, 0.2, 0.95)
    items.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, ROOM_STILLS.length, 0.45))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 26).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-stills" id="rummet" data-station ref={ref}>
      <div className="stills__head">
        <span className="label">Där arbetet blir till</span>
        <p className="stills__lead">{STILLS_LEAD}</p>
      </div>

      <div className="stills__row">
        {ROOM_STILLS.map((still, i) => (
          <figure
            className="still"
            key={still.src}
            ref={(el) => { items.current[i] = el }}
          >
            <picture>
              <source srcSet={`${import.meta.env.BASE_URL}${still.src}.webp`} type="image/webp" />
              <img
                src={`${import.meta.env.BASE_URL}${still.src}.jpg`}
                alt=""
                width={760}
                height={950}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption className="label">{still.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ── Varför ──────────────────────────────────────────────────────────── */

export function Why() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const items = useRef<(HTMLDivElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).settle, 0.25, 0.95)
    items.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, WHY.length, 0.5))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 26).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-why" id="varfor" data-station ref={ref}>
      <div className="why__head">
        <span className="label">Varför vi arbetar som vi gör</span>
        <p className="why__lead">{WHY_LEAD}</p>
      </div>
      <div className="why__grid">
        {WHY.map((w, i) => (
          <div className="why" key={w.title} ref={(el) => { items.current[i] = el }}>
            <h3 className="why__title">{w.title}</h3>
            <p className="body">{w.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Tjänster ────────────────────────────────────────────────────────── */

export function Services() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const rows = useRef<(HTMLDivElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).settle, 0.15, 0.95)
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
    const p = mapRange(track(f).settle, 0.25, 0.95)
    items.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, STATS.length, 0.5))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 24).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-numbers" data-station ref={ref}>
      {STATS.map((s, i) => (
        <div className="stat" key={s.label} ref={(el) => { items.current[i] = el }}>
          <div className="stat__value">{s.value}</div>
          <p className="stat__label">{s.label}</p>
        </div>
      ))}
    </section>
  )
}

/* ── Vanliga frågor ──────────────────────────────────────────────────── */

/**
 * De frågor någon har innan de hör av sig.
 *
 * Allt står framme på en gång — ingen dragspelslist att klicka upp. Den som
 * undrar vad något kostar ska hitta svaret genom att läsa, inte genom att
 * först gissa vilken rad svaret gömmer sig bakom.
 */
export function Faq() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const items = useRef<(HTMLDivElement | null)[]>([])

  useFrame((f) => {
    const p = mapRange(track(f).settle, 0.2, 0.95)
    items.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(p, i, FAQ.length, 0.55))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 22).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-faq" id="fragor" data-station ref={ref}>
      <span className="label label--lead">Vanliga frågor</span>
      <div className="faq__grid">
        {FAQ.map((item, i) => (
          <div className="faq" key={item.q} ref={(el) => { items.current[i] = el }}>
            <h3 className="faq__q">{item.q}</h3>
            <p className="body">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Samtalet ────────────────────────────────────────────────────────── */

/**
 * Platsen som handlar om att man har någon mittemot sig hela vägen.
 *
 * Klippet bakom är två gestalter vända mot varandra, mitt i bild. Texten
 * läggs därför i två spalter — en på var sida om dem — med ett tomt
 * mittfält som de två får för sig själva. Bilden är argumentet här, och
 * den ska inte behöva titta fram under en textmassa.
 *
 * Ryms inte tre spalter faller de ihop till en, och då lägger sig texten
 * över klippet. Slöjan i CSS finns för det läget.
 */
export function Dialogue() {
  const ref = useRef<HTMLElement>(null)
  const track = useTrack(ref)
  const headRef = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])

  useFrame((f) => {
    const t = track(f)

    // Anslaget kommer först, punkterna efter — man ska hinna läsa löftet
    // innan det bryts ned i vad det betyder.
    const p = easeOutCubic(mapRange(t.settle, 0.12, 0.82))
    if (headRef.current) {
      headRef.current.style.opacity = p.toFixed(3)
      headRef.current.style.transform = `translate3d(0, ${((1 - p) * 26).toFixed(1)}px, 0)`
    }

    const q = mapRange(t.settle, 0.3, 0.98)
    items.current.forEach((el, i) => {
      if (!el) return
      const s = easeOutCubic(stagger(q, i, DIALOGUE.points.length, 0.5))
      el.style.opacity = s.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - s) * 22).toFixed(1)}px, 0)`
    })
  })

  return (
    <section className="sec s-dialog" ref={ref} id="samtalet">
      <div className="dialog__veil" aria-hidden="true" />

      <div className="dialog__head" ref={headRef}>
        <span className="label label--lead">{DIALOGUE.lead}</span>
        <h2 className="h-lg dialog__title">{DIALOGUE.title}</h2>
        <p className="body">{DIALOGUE.body}</p>
      </div>

      <ol className="dialog__points">
        {DIALOGUE.points.map((point, i) => (
          <li key={point.title} ref={(el) => { items.current[i] = el }}>
            <h3 className="dialog__name">{point.title}</h3>
            <p className="body">{point.body}</p>
          </li>
        ))}
      </ol>
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
    const p = easeOutCubic(mapRange(t.settle, 0.2, 0.9))
    const q = easeOutCubic(mapRange(t.settle, 0.3, 0.98))

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
          Nära samarbete, tydliga besked och inga överraskningar.
        </h2>
      </div>

      <div className="about__body" ref={bodyRef}>
        <p className="body">
          {STUDIO.name} grundades {STUDIO.founded}. Vi är ett litet team av
          designers och utvecklare, och vi tar få uppdrag åt gången — ett
          uppdrag som får hela uppmärksamheten blir helt enkelt bättre än tre
          som delar på den.
        </p>
        <p className="body">
          Vi arbetar med företag i alla storlekar och i vilken bransch som
          helst. Det som avgör om ett uppdrag blir bra är sällan hur stort
          det är, utan hur väl vi förstår vad ni försöker göra.
        </p>
        <div className="about__sign">
          <LogoMark className="about__logo" />
          <span className="about__name">{STUDIO.name}</span>
          <span className="label">Design &amp; utveckling</span>
        </div>
      </div>
    </section>
  )
}
