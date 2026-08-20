import { useEffect, useRef, useState } from 'react'
import { FILM } from '../data/film'
import { AKTER } from '../data/akter'
import { MOCKUPS } from '../data/mockups'
import { clamp01 } from '../lib/math'
import { reducedMotion, useTick } from '../lib/motion'
import { Showroom } from './Showroom'
import { Arrow } from './Chrome'

/**
 * VERKET
 * ══════
 * Hela sidan är en enda film. Det finns ingen sida under den och ingenting
 * bredvid den — filmen ligger fast i rutan från första bildpunkten till
 * sista, och det som rullar är upplysningarna som kommer in vid dess sida.
 *
 * VARFÖR EN SCEN OCH INTE FEM
 * Första försöket gav varje tagning ett eget parti med egen fastnaglad
 * ruta. Det gav fem filmer efter varandra, och mellan dem tog sidan slut
 * och började om — man såg skarvarna, och det blev en vanlig sida som råkade
 * ha film i sig. Nu finns en enda ruta för hela verket. Tagningarna ligger i
 * den som lager ovanpå varandra, och en akt tar över genom att dess lager
 * sveper in över det förra. Ingenting släpper någonsin taget om rutan, så
 * det finns inte längre någon skarv att se.
 *
 * VILKEN AKT SOM GÄLLER LÄSES UR SPALTEN, INTE UR EN UTRÄKNING
 * Akterna är olika långa, för de bär olika mycket text. Att dela rullningen
 * i fem lika delar hade betytt att bilden byts mitt i ett stycke. I stället
 * mäts var akternas egna avsnitt i spalten befinner sig, och tagningen byts
 * när avsnittet gör det. Bilden och texten hör alltid ihop.
 */

/** Hur stor del av en akt som går åt till att svepa in den. */
const SVEP = 0.34

export function Verk() {
  const spar = useRef<HTMLDivElement>(null)
  const lager = useRef<(HTMLDivElement | null)[]>([])
  const filmer = useRef<(HTMLVideoElement | null)[]>([])
  const avsnitt = useRef<(HTMLElement | null)[]>([])
  const scen = useRef<HTMLDivElement>(null)
  const [akt, setAkt] = useState(0)
  const [visar, setVisar] = useState<string | null>(null)
  /** Vilka tagningar som fått hämta sin fil. Aldrig fler än den som syns
   *  och den som står näst på tur. */
  const [laddad, setLaddad] = useState<boolean[]>(() => FILM.map((_, i) => i === 0))

  useTick(() => {
    const el = spar.current
    if (!el) return
    const mitt = window.innerHeight * 0.5

    /**
     * Varje akts läge läses ur dess eget avsnitt i spalten: hur långt
     * rutans mittlinje har vandrat genom avsnittet, från strax innan det
     * börjar till strax innan det slutar.
     */
    let aktiv = 0
    const in_: number[] = []
    for (let i = 0; i < AKTER.length; i++) {
      const a = avsnitt.current[i]
      if (!a) { in_.push(i === 0 ? 1 : 0); continue }
      const r = a.getBoundingClientRect()
      const genom = clamp01((mitt - r.top) / Math.max(1, r.height))
      /**
       * Insvepet sker över aktens första tredjedel och står sedan kvar.
       *
       * Första akten sveper aldrig in. Den är grunden man redan står på när
       * sidan öppnar sig, och ett svep där hade betytt att man möts av en
       * halvöppen ruta som drar ihop sig innan man ens rört rullhjulet.
       */
      in_.push(i === 0 ? 1 : clamp01(genom / SVEP))
      if (genom > 0 && genom < 1) aktiv = i
      else if (genom >= 1) aktiv = Math.min(AKTER.length - 1, i + 1)
    }

    for (let i = 0; i < FILM.length; i++) {
      const l = lager.current[i]
      if (!l) continue
      const v = in_[i] ?? 0
      const nyckel = v.toFixed(2)
      if (l.dataset.in !== nyckel) {
        l.dataset.in = nyckel
        l.style.setProperty('--in', nyckel)
        // Ett lager som inte hunnit börja svepa in har ingenting att visa
        // och ska inte kosta en bildruta.
        l.style.visibility = v > 0.001 ? 'visible' : 'hidden'
      }
    }

    setAkt((f) => (f === aktiv ? f : aktiv))
  }, !reducedMotion())

  /** Hämtar filen till den akt som syns och den som står näst på tur. */
  useEffect(() => {
    setLaddad((f) => {
      const n = [...f]
      let andrad = false
      for (const i of [akt, akt + 1]) {
        if (i < FILM.length && !n[i]) { n[i] = true; andrad = true }
      }
      return andrad ? n : f
    })
  }, [akt])

  /** Bara den tagning som ligger överst spelar. De andra pausas. */
  useEffect(() => {
    filmer.current.forEach((v, i) => {
      if (!v) return
      if (i === akt) v.play().catch(() => {})
      else v.pause()
    })
  }, [akt, laddad])

  const nu = FILM[Math.min(akt, FILM.length - 1)]

  return (
    <div className="verk" ref={spar}>
      {/* ── Rutan. Ligger still hela vägen. ─────────────────────────── */}
      <div className="verk__scen" ref={scen} aria-hidden="true">
        {FILM.map((t, i) => (
          <div
            className="verk__lager"
            data-rorelse={t.rorelse}
            style={{ zIndex: i }}
            key={t.id}
            ref={(n) => { lager.current[i] = n }}
          >
            <video
              className="verk__film"
              ref={(n) => { filmer.current[i] = n }}
              src={laddad[i] ? t.fil : undefined}
              muted
              loop
              playsInline
              preload="none"
              tabIndex={-1}
            />
          </div>
        ))}

        <span className="verk__dis" />
        <Meander />

        {/* Akttiteln står i rutan och inte i spalten: den hör till bilden,
            och byts när bilden byts. På en telefon finns inte plats för
            både en titel i rutan och en spalt som täcker hela bredden —
            där står titeln i spalten i stället, se `.akt__titel`. */}
        <div className="verk__akt" key={nu.id}>
          <span className="verk__ort">{nu.ort}</span>
          <h2 className="verk__rubrik">
            {nu.rubrik.split('\n').map((rad) => (
              <span className="verk__rad" key={rad}>{rad}</span>
            ))}
          </h2>
          <span className="verk__kamera">{nu.kamera}</span>
        </div>

        {/* Var i verket man befinner sig. Fem streck, ett per akt. */}
        <ol className="verk__mat">
          {AKTER.map((a, i) => (
            <li key={a.id} data-nu={i === akt}><i /><span>{a.namn}</span></li>
          ))}
        </ol>
      </div>

      {/* ── Spalten. Det som rullar. ─────────────────────────────────── */}
      <div className="verk__spalt">
        {AKTER.map((a, i) => (
          <section
            className="akt"
            id={a.id}
            key={a.id}
            ref={(n) => { avsnitt.current[i] = n }}
          >
            {/* Titeln i spalten. Syns bara på smala skärmar, där den i
                stället för att ligga bakom panelerna står före dem. */}
            <div className="akt__titel">
              <span className="verk__ort">{FILM[i]?.ort ?? a.namn}</span>
              <h2 className="verk__rubrik">
                {(FILM[i]?.rubrik ?? a.namn).split('\n').map((rad) => (
                  <span className="verk__rad" key={rad}>{rad}</span>
                ))}
              </h2>
            </div>

            {a.paneler.map((p) => (
              <Grupp key={p.rubrik} panel={p} onVisa={setVisar} />
            ))}
          </section>
        ))}
      </div>

      <Showroom
        mockup={MOCKUPS.find((m) => m.id === visar) ?? null}
        onClose={() => setVisar(null)}
      />
    </div>
  )
}

/* ── Panelerna i spalten ──────────────────────────────────────────────── */

import type { ReactNode } from 'react'
import type { Panel as PanelData } from '../data/akter'

/**
 * En grupp är en rubrik med det som hör till den, och den blir aldrig en
 * enda panel.
 *
 * VARFÖR INNEHÅLLET STYCKAS
 * Först låg hela gruppen i en ruta, och tre av dem blev längre än skärmen —
 * den längsta hälften till. En panel som inte får plats i rutan är inte
 * längre någonting som rullar förbi filmen: den täcker den, och medan man
 * läser är sidan tillbaka till att vara en textsida med en bakgrund. Varje
 * punkt och varje kort får därför en egen ruta. De kommer efter varandra
 * med tätare mellanrum än grupperna emellan, så att de fortfarande läses
 * ihop, och mellan dem syns filmen.
 */
function Grupp({ panel, onVisa }: { panel: PanelData; onVisa: (id: string) => void }) {
  return (
    <div className="grupp">
      <Blad>
        <h3 className="panel__rubrik">{panel.rubrik}</h3>
        {panel.brod && <p className="panel__brod">{panel.brod}</p>}
        {panel.knapp && (
          <a className="panel__knapp" href={panel.knapp.href}>
            {panel.knapp.text}<Arrow />
          </a>
        )}
        {panel.tal && (
          <dl className="panel__tal">
            {panel.tal.map((t) => (
              <div key={t.varde}>
                <dt>{t.varde}</dt>
                <dd>{t.text}</dd>
              </div>
            ))}
          </dl>
        )}
        {/* Frågorna styckas inte. Hopfällda är de en rad och tar mindre än
            en skärm tillsammans, och nio egna rutor med en rad i varje hade
            blivit en knapprad och inte en frågelista. */}
        {panel.fragor && (
          <div className="panel__fragor">
            {panel.fragor.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        )}
      </Blad>

      {panel.punkter?.map((p) => (
        <Blad klass="panel--liten" key={p.titel}>
          <b className="panel__titel">{p.titel}</b>
          <span className="panel__text">{p.text}</span>
        </Blad>
      ))}

      {panel.kort?.map((k) => (
        <Blad klass="panel--liten" key={k.namn}>
          <span className="panel__slag">{k.slag}</span>
          <b className="panel__titel">{k.namn}</b>
          <span className="panel__text">{k.om}</span>
          {k.exempel && (
            <button className="panel__se" type="button" onClick={() => onVisa(k.exempel!)}>
              Se ett exempel<Arrow />
            </button>
          )}
        </Blad>
      ))}

    </div>
  )
}

function Blad({ children, klass }: { children: ReactNode; klass?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inne, setInne] = useState(false)

  /**
   * Bladet träder fram när det kommer in i rutan, och gör det med
   * IntersectionObserver och CSS i stället för med kod som räknar per
   * bildruta. Det som bara ska hända en gång hör inte hemma i varvet.
   */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) { setInne(true); return }
    const ob = new IntersectionObserver(
      (es) => { if (es[0]?.isIntersecting) { setInne(true); ob.disconnect() } },
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  return (
    <div className={klass ? `panel ${klass}` : 'panel'} data-in={inne} ref={ref}>
      {children}
    </div>
  )
}

/**
 * Meandern, den grekiska nyckeln.
 *
 * Två fristående band och inte ett band med två rader: ett mönster är
 * förankrat i sin egen ritytas nollpunkt, och den undre raden skars annars
 * av mitt i sitt varv.
 */
function Meander() {
  const band = (
    <svg className="verk__band">
      <defs>
        {/* Nyckeln måste vara en löpande linje med samma höjd vid rutans
            båda kanter, annars blir bandet lösa krokar i stället för
            flätverk. */}
        <pattern id="meander" width="32" height="16" patternUnits="userSpaceOnUse">
          <path
            d="M0 13H3V3H29V13H26V6H9V10H23M29 13H32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill="url(#meander)" />
    </svg>
  )
  return <div className="verk__ram">{band}{band}</div>
}
