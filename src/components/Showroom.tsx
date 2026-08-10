import { useEffect, useRef, useState } from 'react'
import type { ArtKind, Block, Mockup } from '../data/mockups'
import { LogoMark } from './Logo'

/**
 * SKYLTFÖNSTRET
 * ═════════════
 * En hel webbplats inuti sidan. Klickar man på en sorts sajt öppnas vårt
 * exempel på den sorten i en webbläsarram, med adressrad och allt, och man
 * kan rulla och klicka i den precis som i en riktig sajt.
 *
 * Ramen finns för att det ska vara omöjligt att missförstå: det här är en
 * annan sajt, inte en ny vy av den här. Utan ram hade det kunnat läsas som
 * att Vantage plötsligt bytt utseende.
 *
 * DE SKA GÅ ATT ANVÄNDA, INTE BARA TITTA PÅ
 * En bild av en butik säger att man kan bygga en bild av en butik. Därför
 * går varorna att lägga i varukorgen, tiderna att boka, bilderna att öppna
 * och raderna att välja — och räknaren i listen ändrar sig när man gör
 * det. Det är skillnaden mellan en skiss och ett bevis.
 */

export function Showroom({ mockup, onClose }: { mockup: Mockup | null; onClose: () => void }) {
  const stang = useRef<HTMLButtonElement>(null)
  const ruta = useRef<HTMLDivElement>(null)

  /** Delat läge för sakerna man kan göra i exemplen. */
  const [korg, setKorg] = useState(0)
  const [tid, setTid] = useState<string | null>(null)
  const [oppen, setOppen] = useState<number | null>(null)
  const [rad, setRad] = useState<string | null>(null)

  useEffect(() => {
    if (!mockup) return
    setKorg(0); setTid(null); setOppen(null); setRad(null)

    // Sidan bakom ska inte rulla medan skyltfönstret är öppet. Bredden
    // låses samtidigt, annars hoppar hela layouten när rullisten tas bort.
    const bredd = window.innerWidth - document.documentElement.clientWidth
    const förra = document.body.style.cssText
    document.body.style.overflow = 'hidden'
    if (bredd > 0) document.body.style.paddingRight = `${bredd}px`

    const påTangent = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', påTangent)
    stang.current?.focus()

    return () => {
      document.body.style.cssText = förra
      window.removeEventListener('keydown', påTangent)
    }
  }, [mockup, onClose])

  /**
   * Framträdanden inuti exemplet.
   *
   * Observern måste ha rutan som rot och inte fönstret. Innehållet rullar
   * i sin egen behållare, och mätt mot fönstret räknas allt som ligger
   * långt ned i exemplet som synligt redan från början — då hade hela
   * sajten redan varit framme innan man börjat rulla i den.
   */
  useEffect(() => {
    const root = ruta.current
    if (!mockup || !root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelectorAll('.mock__in').forEach((el) => el.classList.add('syns'))
      return
    }
    const ob = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('syns'); ob.unobserve(e.target) }
      }),
      { root, threshold: 0.16 },
    )
    root.querySelectorAll('.mock__in').forEach((el) => ob.observe(el))
    return () => ob.disconnect()
  }, [mockup])

  if (!mockup) return null

  return (
    <div
      className="skylt"
      role="dialog"
      aria-modal="true"
      aria-label={`${mockup.bransch}, byggt av Vantage`}
    >
      <button className="skylt__bak" onClick={onClose} tabIndex={-1} aria-hidden="true" />

      <div className="skylt__ram">
        <div className="skylt__list">
          <span className="skylt__prickar" aria-hidden="true"><i /><i /><i /></span>
          <span className="skylt__adress">{mockup.adress}</span>
          <button className="skylt__stang" onClick={onClose} ref={stang}>
            Stäng
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        <div className="skylt__ruta" ref={ruta}>
          <div
            className={`mock${mockup.mork ? ' mock--mork' : ''}`}
            style={{
              '--m-bg': mockup.bg,
              '--m-ink': mockup.ink,
              '--m-dim': mockup.dim,
              '--m-ac': mockup.accent,
              '--m-rubrik': mockup.rubrik,
            } as React.CSSProperties}
          >
            {mockup.block.map((b, i) => (
              <Del
                key={i}
                b={b}
                namn={mockup.namn}
                korg={korg}
                tid={tid}
                oppen={oppen}
                rad={rad}
                lagg={() => setKorg((n) => n + 1)}
                valjTid={setTid}
                oppna={setOppen}
                valjRad={setRad}
              />
            ))}
          </div>
        </div>

        <p className="skylt__not">
          Vårt eget exempel. Innehållet är påhittat — inget utfört uppdrag.
        </p>
      </div>
    </div>
  )
}

/* ── Delarna ett exempel är byggt av ──────────────────────────────────── */

type DelProps = {
  b: Block
  namn: string
  korg: number
  tid: string | null
  oppen: number | null
  rad: string | null
  lagg: () => void
  valjTid: (t: string | null) => void
  oppna: (i: number | null) => void
  valjRad: (r: string | null) => void
}

const DAGAR = ['Mån 3', 'Tis 4', 'Ons 5', 'Tors 6', 'Fre 7']
const TIDER = ['08:00', '09:30', '11:00', '13:30', '15:00']

function Del({ b, namn, korg, tid, oppen, rad, lagg, valjTid, oppna, valjRad }: DelProps) {
  switch (b.t) {
    case 'nav':
      return (
        <header className="mock__nav">
          {/* Vår logotyp. Exemplen är våra, och det ska synas i listen. */}
          <span className="mock__logga">
            <LogoMark />
            <b>Vantage</b>
            <i>{namn}</i>
          </span>
          <nav>{b.links.map((l) => <span key={l}>{l}</span>)}</nav>
          {b.cta && (
            <span className="mock__knapp mock__knapp--liten" data-puls={korg > 0}>
              {/* Varukorgen räknar upp när man lägger i något. */}
              {b.cta.startsWith('Varukorg') ? `Varukorg (${korg})` : b.cta}
            </span>
          )}
        </header>
      )

    case 'hero':
      return (
        <section className="mock__hero mock__in">
          <div>
            <h1>{b.title}</h1>
            <p>{b.lead}</p>
            <span className="mock__knapp">{b.cta}</span>
            {b.art === 'stapel' && <Nedrakning />}
          </div>
          <Art kind={b.art} />
        </section>
      )

    case 'cols':
      return (
        <section className="mock__del mock__in">
          <h2>{b.head}</h2>
          <div className="mock__kol">
            {b.items.map((i) => (
              <div key={i.h}>
                <h3>{i.h}</h3>
                <p>{i.p}</p>
              </div>
            ))}
          </div>
        </section>
      )

    case 'varor':
      return (
        <section className="mock__del mock__in">
          <h2>{b.head}</h2>
          <div className="mock__varor">
            {b.items.map((v, i) => (
              <article key={v.n}>
                <span className="mock__vara" data-v={i % 4}>
                  <button className="mock__lagg" onClick={lagg}>Lägg i varukorg</button>
                </span>
                <h3>{v.n}</h3>
                <p>{v.pris}</p>
              </article>
            ))}
          </div>
        </section>
      )

    case 'kalender':
      return (
        <section className="mock__del mock__in">
          <h2>{b.head}</h2>
          <p className="mock__lead">{b.lead}</p>
          <div className="mock__kal">
            {DAGAR.map((d, i) => (
              <div key={d}>
                <h4>{d}</h4>
                {TIDER.map((t, j) => {
                  const ledig = (i + j) % 3 !== 0
                  const id = `${d} ${t}`
                  return (
                    <button
                      key={t}
                      disabled={!ledig}
                      data-ledig={ledig}
                      data-vald={tid === id}
                      onClick={() => valjTid(tid === id ? null : id)}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          {/* Bekräftelseraden glider upp när man valt en tid. */}
          <div className="mock__bekraft" data-fram={!!tid}>
            <span>{tid ? `Vald tid: ${tid}` : ''}</span>
            <span className="mock__knapp mock__knapp--liten">Bekräfta bokning</span>
          </div>
        </section>
      )

    case 'galleri':
      return (
        <section className="mock__del mock__in">
          <h2>{b.head}</h2>
          <div className="mock__galleri">
            {Array.from({ length: b.n }, (_, i) => (
              <button
                key={i}
                data-v={i % 5}
                data-stor={oppen === i}
                onClick={() => oppna(oppen === i ? null : i)}
                aria-label={oppen === i ? 'Förminska bilden' : 'Förstora bilden'}
              />
            ))}
          </div>
        </section>
      )

    case 'panel':
      return (
        <section className="mock__del mock__in">
          <h2>{b.head}</h2>
          <div className="mock__panel">
            <div className="mock__rad mock__rad--hd">
              <span>Sändning</span><span>Sträcka</span><span>Status</span>
            </div>
            {b.rows.map((r) => (
              <button
                className="mock__rad"
                key={r[0]}
                data-vald={rad === r[0]}
                onClick={() => valjRad(rad === r[0] ? null : r[0])}
              >
                <span>{r[0]}</span>
                <span>{r[1]}</span>
                <span className="mock__stat" data-s={r[2]}>{r[2]}</span>
              </button>
            ))}
          </div>
        </section>
      )

    case 'cta':
      return (
        <section className="mock__cta mock__in">
          <h2>{b.title}</h2>
          <span className="mock__knapp">{b.btn}</span>
        </section>
      )

    case 'foot':
      return (
        <footer className="mock__fot mock__in">
          {b.cols.map((c) => (
            <div key={c.h}>
              <h4>{c.h}</h4>
              {c.rows.map((r) => <span key={r}>{r}</span>)}
            </div>
          ))}
        </footer>
      )
  }
}

/**
 * Nedräkning på kampanjsidan.
 *
 * Räknar mot ett datum en bit fram i tiden i stället för mot ett fast
 * klockslag — en nedräkning som gått ut är sämre än ingen nedräkning.
 */
function Nedrakning() {
  const [kvar, setKvar] = useState(() => mal() - Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setKvar(mal() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const s = Math.max(0, Math.floor(kvar / 1000))
  const delar: [number, string][] = [
    [Math.floor(s / 86400), 'dygn'],
    [Math.floor(s / 3600) % 24, 'tim'],
    [Math.floor(s / 60) % 60, 'min'],
    [s % 60, 'sek'],
  ]

  return (
    <div className="mock__ned">
      {delar.map(([v, e]) => (
        <span key={e}>
          <b>{String(v).padStart(2, '0')}</b>
          <i>{e}</i>
        </span>
      ))}
    </div>
  )
}

/** Nästa månadsskifte, så att nedräkningen alltid har tid kvar. */
function mal() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
}

/**
 * Bildytan i hjälten.
 *
 * Ritad i exemplets egna färger i stället för fotograferad. Ett foto hade
 * behövt föreställa en verksamhet som inte finns, och en gråtonad platta
 * hade sagt "här ska det vara en bild" — det här säger i alla fall något
 * om tonen sajten är tänkt att ha.
 */
function Art({ kind }: { kind: ArtKind }) {
  return <span className={`mock__art mock__art--${kind}`} aria-hidden="true" />
}
