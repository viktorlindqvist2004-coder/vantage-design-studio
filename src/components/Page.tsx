import { useEffect, useRef, useState } from 'react'
import {
  DIALOGUE, FAQ, MANIFEST, MANIFEST_ASIDE, OFFERINGS, PROCESS,
  SERVICES, STATS, STUDIO, WHY, WHY_LEAD, type Offering,
} from '../data/content'
import { clamp01 } from '../lib/math'
import {
  onTick, reducedMotion, useCountUp, useFlight, useReveal, useScrub, useTick,
  type FlightKind,
} from '../lib/motion'
import { Eyebrow, Kinetic, Rise, Sweep } from './Motion'
import { Arrow } from './Chrome'
import { Cables } from './Cables'
import { Mark, Pulse, Spine, useTilt, type MarkKind } from './Art'
import { Beams, Blueprint, Columns, Dots, Flow, Rings } from './Backdrops'
import { LogoMark } from './Logo'
import { OfferingArt } from './OfferingArt'

/**
 * PARTIERNA
 * ═════════
 * Sidan växlar mellan ljust och mörkt, och växlingen är inte dekoration:
 * den delar in läsningen. Ett mörkt parti är ett andetag och en betoning —
 * det som står där ska vara det man minns. Ljust är arbetsläget, där det
 * informativa bor.
 *
 * Varje parti bär sin egen ton på `data-tone`, och listen läser av vilken
 * ton som råkar ligga under den för att byta färg i takt.
 */

/**
 * Innehållsrutan i ett parti, med färden pålagd.
 *
 * Vridningen sitter här och inte på partiet: ett element med transform blir
 * referenssystem för allt inuti, och då slutar de fastklistrade
 * bakgrunderna ligga still. Bakgrunden ligger utanför den här rutan.
 */
function Wrap({
  kind,
  dir = 1,
  children,
  className = '',
}: {
  kind: FlightKind
  dir?: 1 | -1
  children: React.ReactNode
  className?: string
}) {
  const ref = useFlight<HTMLDivElement>({ kind, dir })
  return <div className={`wrap ${className}`} ref={ref}>{children}</div>
}

/* ── Hjältebilden ─────────────────────────────────────────────────────── */

const HERO_SERVICES = ['/ Webbdesign', '/ Utveckling', '/ Identitet och rörelse']

export function Hero() {
  const title = useRef<HTMLDivElement>(null)

  /**
   * Rubriken dröjer sig kvar när man börjar rulla.
   *
   * Den flyttas en fjärdedel av sträckan och tonar bort på vägen. Att den
   * släpar efter sidan är vad som gör att man känner att man lämnar något,
   * i stället för att bilden bara byts. Räknas bara medan hjälten
   * fortfarande kan synas — därunder är det bortkastat arbete varje ruta.
   */
  useTick(() => {
    const el = title.current
    if (!el) return
    const y = window.scrollY
    const vh = window.innerHeight
    if (y > vh) {
      if (el.style.opacity !== '0') el.style.opacity = '0'
      return
    }
    el.style.transform = `translate3d(0, ${(y * 0.26).toFixed(1)}px, 0)`
    el.style.opacity = (1 - clamp01(y / (vh * 0.78))).toFixed(3)
  })

  return (
    <section className="hero" id="topp" data-tone="light">
      <div className="hero__aura" aria-hidden="true" />
      <Cables />

      <div className="hero__top">
        <div className="hero__services">
          {HERO_SERVICES.map((s, i) => (
            <Rise key={s} delay={140 + i * 90}>{s}</Rise>
          ))}
        </div>
        <Sweep className="hero__intro" delay={340}>
          Vi ritar och bygger webbplatser för hand. Ni pratar med dem som
          utför arbetet, hela vägen.
        </Sweep>
      </div>

      <div ref={title}>
        <Kinetic
          as="h1"
          className="hero__title"
          text={'Några *sekunder.*\nSen har de\nbestämt sig.'}
          delay={120}
          step={70}
        />
      </div>

      <div className="hero__bottom">
        <Rise className="hero__cta" delay={620}>
          <a className="btn btn--solid" href="#kontakt">Boka ett samtal<Arrow /></a>
          <a className="btn btn--ghost" href="#gangen">Så arbetar vi</a>
        </Rise>
        <Rise className="hero__cue" delay={760}>
          <i aria-hidden="true" />
          Rulla
        </Rise>
      </div>
    </section>
  )
}

/* ── Löpande listen ───────────────────────────────────────────────────── */

/**
 * Tjänsterna på ett löpande band.
 *
 * Innehållet ligger två gånger efter varandra och bandet flyttas exakt en
 * halva. Slutet möter då början i samma läge och skarven finns inte att se.
 * Hela bandet är dolt för uppläsning — samma ord en gång till hjälper
 * ingen som lyssnar.
 */
export function Ticker() {
  const track = useRef<HTMLDivElement>(null)

  /**
   * Bandet drivs i kod i stället för med en CSS-animation, och skälet är
   * att det ska höra scrollen.
   *
   * Rullar man nedåt tar bandet fart; rullar man uppåt saktar det in och
   * kan vända. Det gör listen till en del av rörelsen på sidan i stället
   * för en slinga som råkar snurra bredvid den. En CSS-animation kan inte
   * veta något om scrollen.
   */
  useEffect(() => {
    const el = track.current
    if (!el || reducedMotion()) return

    let x = 0
    let halva = el.scrollWidth / 2
    let sistY = window.scrollY
    let fart = 0
    let sist = performance.now()

    const mat = () => { halva = el.scrollWidth / 2 }
    window.addEventListener('resize', mat)

    const stopp = onTick((nu) => {
      const dt = Math.min(0.05, (nu - sist) / 1000)
      sist = nu

      const y = window.scrollY
      // Scrollens fart dras in mjukt. Rått värde ger ryck vid varje hack.
      fart += ((y - sistY) - fart) * 0.18
      sistY = y

      x -= (62 + fart * 7) * dt
      // Två likadana grupper ligger efter varandra, så en halva är exakt
      // ett varv. Slingan tål att bandet går åt båda hållen.
      if (halva > 0) {
        while (x <= -halva) x += halva
        while (x > 0) x -= halva
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
    })

    return () => { window.removeEventListener('resize', mat); stopp() }
  }, [])

  const items = SERVICES.map((s) => s.name)
  const group = (key: string) => (
    <div className="ticker__group" key={key}>
      {items.map((t, i) => (
        <span className="ticker__item" key={`${key}-${i}`}>
          {t}
          <i className="ticker__dot" />
        </span>
      ))}
    </div>
  )

  return (
    <div className="ticker" data-tone="dark" aria-hidden="true">
      <div className="ticker__track" ref={track}>{[group('a'), group('b')]}</div>
    </div>
  )
}

/* ── Manifestet ───────────────────────────────────────────────────────── */

/**
 * Påståendet, ord för ord.
 *
 * Orden börjar nedtonade och tänds i takt med att man rullar. Det tvingar
 * fram själva läsningen: en mening som redan står färdig sveper man förbi,
 * en som sätts medan man rullar läser man.
 *
 * Orden skrivs direkt i DOM:en i stället för via tillstånd. Tjugo ord som
 * byter läge skulle annars ge tjugo omritningar av React per bildruta.
 */
export function Manifest() {
  const words = useRef<(HTMLSpanElement | null)[]>([])

  // Skrubben mäter stycket och inte hela rutan: rutan bär färden och har
  // sin egen ref, och ett element kan bara ha en.
  const ref = useScrub<HTMLParagraphElement>(
    (p) => {
      // Tändningen är utsträckt över mitten av resan. Början och slutet
      // lämnas i fred så att meningen står hel både före och efter.
      const lit = Math.round(clamp01((p - 0.12) / 0.46) * MANIFEST.length)
      for (let i = 0; i < words.current.length; i++) {
        const el = words.current[i]
        if (!el) continue
        const v = i < lit ? 'true' : 'false'
        if (el.dataset.lit !== v) el.dataset.lit = v
      }
    },
    { start: 0.92, end: 0.1 },
  )

  return (
    <section className="bay bay--bg" data-tone="dark" id="arbetet">
      <Flow />
      <Wrap kind="sving" dir={1}>
        <Eyebrow>Vad arbetet går ut på</Eyebrow>
        <p className="manifest__text" ref={ref} style={{ marginTop: '2.5rem' }}>
          {MANIFEST.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="manifest__word"
              data-lit="false"
              ref={(el) => { words.current[i] = el }}
            >
              {w}{' '}
            </span>
          ))}
        </p>

        <div className="manifest__aside">
          <Rise className="manifest__lead">{MANIFEST_ASIDE.lead}</Rise>
          <ul className="manifest__points">
            {MANIFEST_ASIDE.points.map((p, i) => (
              <Rise as="li" key={p} delay={i * 90}>{p}</Rise>
            ))}
          </ul>
        </div>
      </Wrap>
    </section>
  )
}

/* ── Varför ───────────────────────────────────────────────────────────── */

/** Ett tecken per punkt, i samma ordning som punkterna står i innehållet. */
const WHY_MARKS: MarkKind[] = ['sikte', 'vag', 'fart', 'faste']

export function Why() {
  return (
    <section className="bay bay--bg" data-tone="light">
      <Dots />
      <Wrap kind="fram">
        <div className="head head--split">
          <Kinetic
            className="head__title"
            text={'Fyra saker avgör\nom det gör nytta.'}
          />
          <Sweep className="head__lead" delay={160}>{WHY_LEAD}</Sweep>
        </div>

        <div className="why">
          {WHY.map((w, i) => (
            <Rise className="why__item" key={w.title} delay={i * 110}>
              {/* Ett tecken som ritar sig självt i stället för ett räkneord.
                  Räkneordet sa bara att det fanns fler; tecknet säger något
                  om punkten det står framför. */}
              <Mark kind={WHY_MARKS[i] ?? 'sikte'} delay={i * 110 + 180} />
              <h3 className="why__title">{w.title}</h3>
              <p className="why__body">{w.body}</p>
            </Rise>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

/* ── Det vi bygger ────────────────────────────────────────────────────── */

function Card({ offering }: { offering: Offering }) {
  const ref = useTilt<HTMLElement>(6)
  return (
    <article className="card" ref={ref}>
      <OfferingArt offering={offering} />
      <div className="card__body">
        <span className="card__kind">{offering.kind}</span>
        <h3 className="card__name">{offering.name}</h3>
        <p className="card__desc">{offering.desc}</p>
      </div>
    </article>
  )
}

export function Offer() {
  const sec = useRef<HTMLElement>(null)
  const rail = useRef<HTMLDivElement>(null)

  /**
   * Resan i sidled.
   *
   * Partiet är tre skärmar högt men fastnar i rutan hela vägen. Scrollen
   * som normalt hade fört en nedåt för i stället korten åt sidan, så att
   * man reser tvärs igenom dem i stället för förbi dem. Det är den enda
   * platsen på sidan där riktningen byts, och det räcker för att resan
   * ska kännas som en resa och inte som en lista.
   *
   * Scrollen tas aldrig över. Fönstret rullar precis som vanligt — det är
   * bara innehållet som råkar röra sig åt ett annat håll än sidan.
   */
  useTick(() => {
    const s = sec.current
    const r = rail.current
    if (!s || !r) return
    const rect = s.getBoundingClientRect()
    const langd = rect.height - window.innerHeight
    if (langd <= 0) {
      if (r.style.transform) r.style.transform = ''
      return
    }
    if (rect.bottom < 0 || rect.top > window.innerHeight) return
    const p = clamp01(-rect.top / langd)
    // Sträckan mäts mot rutan rälsen ligger i, inte mot rälsen själv.
    // Rälsen är `width: max-content` och alltså exakt lika bred som sitt
    // innehåll — mätt mot sig själv blir överskottet alltid noll, och
    // ingenting rörde sig.
    const rum = r.parentElement?.clientWidth ?? window.innerWidth
    const max = Math.max(0, r.scrollWidth - rum)
    r.style.transform = `translate3d(${(-max * p).toFixed(1)}px, 0, 0)`
  })

  return (
    <section className="travel" data-tone="dark" id="bygger" ref={sec}>
      <Beams />
      <div className="travel__stage">
        <div className="travel__head">
          <Kinetic className="head__title" text={'Vad vi bygger.'} />
          <Sweep className="head__lead" delay={160}>
            Vilken sorts webbplats ni än behöver, och oavsett bransch.
            Behöver ni något som inte står här bygger vi det också.
          </Sweep>
        </div>

        <div className="travel__rail" ref={rail}>
          {OFFERINGS.map((o) => (
            <Card offering={o} key={o.name} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Arbetsgången ─────────────────────────────────────────────────────── */

/**
 * Stegen, med en mätare som står kvar bredvid.
 *
 * Mätaren är det enda som hakar upp sig på sidan. Det är med flit: en lista
 * med fem steg är lätt att tappa bort sig i, och en visare som följer med
 * säger var man är utan att man behöver räkna raderna.
 */
export function Process() {
  const [at, setAt] = useState(0)
  /** Hur långt tråden fyllts. Läses varje bildruta, aldrig av React. */
  const fram = useRef(0)

  const ref = useScrub<HTMLDivElement>(
    (p) => {
      fram.current = clamp01(p)
      const i = Math.min(PROCESS.length - 1, Math.floor(clamp01(p) * PROCESS.length))
      setAt((prev) => (prev === i ? prev : i))
    },
    { start: 0.75, end: 0.35 },
  )

  return (
    <section className="bay bay--bg" data-tone="light" id="gangen">
      <Blueprint />
      <Wrap kind="tilt">
        <div className="process">
          <div className="process__side">
            <Eyebrow>Arbetsgången</Eyebrow>
            <Kinetic
              className="head__title"
              text={'Fem steg,\ninget dolt.'}
            />
            <div className="process__meter" aria-hidden="true">
              {PROCESS.map((s, i) => (
                <span className="process__tick" key={s.title} data-at={i === at}>
                  <i />
                  {s.title}
                </span>
              ))}
            </div>
          </div>

          <div className="process__steps" ref={ref}>
            <Spine progress={fram} />
            {PROCESS.map((s, i) => (
              <Rise className="step" key={s.title}>
                {/* Noden på tråden lyser när man nått hit. Den säger samma
                    sak som ett räkneord gjorde, men säger den i förhållande
                    till resten i stället för som en siffra i luften. */}
                <span className="step__node" data-at={i <= at} aria-hidden="true" />
                <h3 className="step__title">{s.title}</h3>
                <p className="step__body">{s.body}</p>
                <div className="step__facts">
                  <span className="chip"><b>Ni får</b>{s.gives}</span>
                  <span className="chip"><b>Tid</b>{s.takes}</span>
                </div>
              </Rise>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  )
}

/* ── Samtalet ─────────────────────────────────────────────────────────── */

export function Dialogue() {
  return (
    <section className="bay bay--bg" data-tone="light">
      <Rings />
      <Wrap kind="glid" dir={-1}>
        <div className="dialog">
          <div>
            <Eyebrow>{DIALOGUE.lead}</Eyebrow>
            <Kinetic className="dialog__title" text={DIALOGUE.title} />
            <Sweep className="dialog__body" delay={200}>{DIALOGUE.body}</Sweep>
            <Rise delay={300} className="step__facts">
              <a className="btn btn--solid" href="#kontakt">Boka ett samtal<Arrow /></a>
            </Rise>
            <Rise delay={380}><Pulse /></Rise>
          </div>
          <ul className="dialog__points">
            {DIALOGUE.points.map((p, i) => (
              <Rise as="li" className="dialog__point" key={p.title} delay={i * 110}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Rise>
            ))}
          </ul>
        </div>
      </Wrap>
    </section>
  )
}

/* ── Talen ────────────────────────────────────────────────────────────── */

/**
 * Ett tal som räknas upp när det kommer in i rutan.
 *
 * Bara talet räknas; det som står efter — procenttecken och liknande —
 * hängs på oförändrat. Värden som inte börjar med en siffra, som `1:1`,
 * lämnas i fred: de betyder ett förhållande och skulle bli obegripliga
 * halvvägs upp.
 */
function Stat({ value, label, delay }: { value: string; label: string; delay: number }) {
  const m = /^(\d+)(.*)$/.exec(value)
  const [n, ref] = useCountUp(m ? Number(m[1]) : 0)

  return (
    <Rise className="stat" delay={delay}>
      <span className="stat__value" ref={ref}>
        {m ? `${n}${m[2]}` : value}
      </span>
      <span className="stat__label">{label}</span>
    </Rise>
  )
}

export function Stats() {
  return (
    <section className="bay bay--bg" data-tone="dark">
      <Columns />
      <Wrap kind="stig">
        <div className="stats">
          {STATS.map((s, i) => (
            <Stat key={s.value} value={s.value} label={s.label} delay={i * 100} />
          ))}
        </div>
      </Wrap>
    </section>
  )
}

/* ── Frågorna ─────────────────────────────────────────────────────────── */

export function Faq() {
  // Bara en öppen i taget. Med flera öppna hoppar raderna under omkring
  // och man tappar den man höll på att läsa.
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bay bay--bg" data-tone="light" id="fragor">
      <Rings />
      <Wrap kind="sving" dir={-1}>
        <div className="head">
          <Kinetic className="head__title" text={'Vanliga frågor.'} />
        </div>

        <div className="faq">
          {FAQ.map((f, i) => (
            <Rise className="faq__item" key={f.q} delay={i * 70}>
              <div data-open={open === i}>
                <button
                  className="faq__q"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  {f.q}
                  <span className="faq__sign" aria-hidden="true" />
                </button>
                <div className="faq__panel">
                  <div>
                    <p className="faq__a">{f.a}</p>
                  </div>
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

/* ── Kontakt ──────────────────────────────────────────────────────────── */

export function Contact() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section className="bay bay--cables" data-tone="dark" id="kontakt" ref={ref}>
      {/* Samma kablar som i hjälten, som bokstöd. Sidan börjar och slutar
          med dem — och mot svart lyser spetsarna så mycket starkare att de
          läser som en annan bild, trots att ingenting utom rummet ändrats. */}
      <Cables ton="mork" />
      <Wrap kind="glid" dir={1}>
        <Eyebrow>Nästa steg</Eyebrow>
        <Kinetic
          className="contact__title"
          text={'Ska vi bygga något\ntillsammans?'}
        />
        <Rise delay={260} className="step__facts">
          <a className="btn btn--solid" href={`mailto:${STUDIO.emails[0]}`}>
            Skriv till oss<Arrow />
          </a>
        </Rise>

        <div className="contact__row">
          <div className="contact__col">
            <h4>E-post</h4>
            {/* Ingen adress lyfts fram framför den andra — samma storlek,
                samma vikt, i den ordning de står i innehållet. */}
            {STUDIO.emails.map((adress) => (
              <a key={adress} href={`mailto:${adress}`}>{adress}</a>
            ))}
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

        <div className="colophon">
          <span className="colophon__mark"><LogoMark /></span>
          <span>© {STUDIO.founded} {STUDIO.name}</span>
          <span>Formgiven och handkodad</span>
        </div>
      </Wrap>
    </section>
  )
}
