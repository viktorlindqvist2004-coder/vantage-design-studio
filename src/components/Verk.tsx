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
 * kommer emot en medan det förra fortsätter framåt förbi kanterna.
 * Ingenting släpper någonsin taget om rutan, så det finns inte längre någon
 * skarv att se.
 *
 * MAN RÖR SIG I FILMEN
 * Rullningen driver två saker och inte en: var i klippet man är, och var i
 * rummet man står. Det andra är kameran — en färd som går hela akten
 * igenom och inte hejdar sig vid gränserna. Utan den blev sidan en film som
 * gick bakom texten; med den går man in mellan pelarna, förbi bänkarna, ned
 * över ritbordet, uppför pelaren och till sist bakåt ut över staden.
 *
 * VILKEN AKT SOM GÄLLER LÄSES UR SPALTEN, INTE UR EN UTRÄKNING
 * Akterna är olika långa, för de bär olika mycket text. Att dela rullningen
 * i fem lika delar hade betytt att bilden byts mitt i ett stycke. I stället
 * mäts var akternas egna avsnitt i spalten befinner sig, och tagningen byts
 * när avsnittet gör det. Bilden och texten hör alltid ihop.
 *
 * RULLNINGEN ÄR FILMENS TIDSLINJE
 * Tagningarna spelas inte upp. Rullningen är deras tid: står man still står
 * bilden still, rullar man framåt går den framåt, rullar man bakåt går den
 * baklänges. Det är rullningen som är uppspelningen.
 *
 * Det gick inte förut, och skälet var filerna och inte koden. En vanlig
 * mp4 har en nyckelruta med långa spann emellan, och resten av rutorna är
 * bara skillnader mot dem. Att hoppa till en godtycklig tidpunkt tvingar
 * avkodaren tillbaka till närmaste nyckelruta och framåt igen, ruta för
 * ruta. Rullar man jämnt blir det en följd av sådana sökningar, och bilden
 * hackar i exakt den takten — det var därför tagningarna först spelades i
 * sin egen hastighet.
 *
 * Filerna är omkodade med tät nyckelruta — var fjärde bildruta — så att en
 * sökning aldrig behöver arbeta sig långt fram från närmaste nyckelruta.
 * Resten av arbetet gör `spola` genom att lägga målet på nyckelrutan när
 * det går fort; se den.
 *
 * Att gå hela vägen och göra varenda bildruta till nyckelruta är den
 * uppenbara tanken, och den är fel. Prövat och mätt: filerna växer till det
 * tredubbla, varje enskild ruta blir dyrare att avkoda än den kedja man
 * slipper, och andelen sena bildrutor gick från 5,7 till 8,5 procent. Tätt
 * är rätt; varje är för mycket.
 */

/**
 * Hur stor del av en akt som går åt till att ta emot den.
 *
 * Kort. Tagningarna möts i stället för att avlösa varandra: den nya kommer
 * emot en medan den förra fortsätter framåt förbi kanterna. Ett långt möte
 * är en toning man ser, och en toning man ser är en övergång — alltså
 * återigen ett bläddrande. Ett kort möte är bara att färden fortsätter in i
 * nästa rum.
 */
const SVEP = 0.2

/** En bildruta. Alla fem tagningarna är inspelade i samma takt. */
const RUTA = 1 / 24

/**
 * Hur glest nyckelrutorna sitter i filerna. Se film.ts.
 *
 * Talet är inte en smaksak utan en avläsning av materialet: filerna är
 * kodade med `-g 4`, alltså en nyckelruta följd av tre rutor som bara är
 * skillnader mot den. Ändras kodningen måste talet ändras med.
 */
const NYCKELSTEG = 4

/**
 * Vid vilken brådska sökningen börjar snappa till nyckelrutan.
 *
 * Lågt. Redan en stillsam fingerrullning ligger över det här, och det är
 * meningen: gränsen ska skilja "läser och rullar knappt" från "rullar", inte
 * "rullar" från "kastar sig nedför sidan".
 */
const SNAPP_VID = 0.25

/**
 * Ställer en tagning på den bildruta rullningen pekar ut.
 *
 * Tre spärrar, alla tre mätta.
 *
 * Den första: en sökning som inte flyttar sig en hel bildruta byter ingen
 * bild men kostar ändå en avkodning, och utan den spärren söker vi sextio
 * gånger i sekunden även när sidan står still.
 *
 * Den andra: sätter man tiden igen medan förra sökningen pågår avbryts den,
 * och vid snabb rullning blir följden att ingen sökning någonsin hinner bli
 * klar — bilden fryser just när den borde röra sig mest. Vi hoppar över
 * varvet i stället och tar nästa; eftersom varvet går varje bildruta hinner
 * den ifatt av sig själv.
 *
 * Den tredje: brådskan. En avkodning kostar det den kostar, och kastar man
 * sig nedför sidan hinner man ändå inte se varenda bildruta — men man
 * hinner mycket väl se att sidan hackar. Vid stillsam rullning söker vi på
 * en halv bildrutas avstånd, vid full fart först på fyra. Bilden följer
 * med lika långt; den byter bara i grövre steg medan man far förbi.
 *
 * OCH SÅ SNAPPNINGEN, SOM ÄR DEN DYRASTE DETALJEN AV ALLA
 * Alla sökningar är inte lika dyra. Landar man på en nyckelruta räcker det
 * att avkoda den; landar man tre rutor efter den måste avkodaren hämta
 * nyckelrutan och arbeta sig fram, ruta för ruta. Med `-g 4` kostar en
 * sökning på måfå i snitt två och en halv avkodning i stället för en, och
 * det är den skillnaden som får en telefon att hacka.
 *
 * Över `SNAPP_VID` läggs därför måltiden på en nyckelruta, och varje
 * sökning blir en enda avkodning i stället för i snitt två och en halv.
 *
 * OCH RUTNÄTET GLESNAR MED FARTEN
 * Det räcker inte att välja rätt ruta; vid full fart ska det också vara
 * färre av dem. Steget växer därför från fyra rutor till tolv allteftersom
 * brådskan stiger. Innehållet i filmen byter då två gånger i sekunden i
 * stället för tjugofyra — men kameran går på egen hand i sextio bilder i
 * sekunden hela tiden (se `--gang`), och det är kameran man ser röra sig.
 * Att frysa den prövades: det gjorde ingen mätbar skillnad alls för takten,
 * vilket säger att färden genom rummet är gratis och att allt som kostar
 * sitter i avkodningen. Alltså finns det ingen anledning att snåla med
 * rörelsen, och all anledning att snåla med sökningarna.
 *
 * Under gränsen snappas ingenting. Där står man still eller läser, där är
 * sökningarna få ändå, och då ska filmen ha varenda bildruta den har.
 *
 * MÄTT, INTE ANTAGET
 * Strypt processor, filmen verkligen avkodad, fem varv per rad, andel
 * bildrutor över 20 ms vid olika rutnät: 8,8 % utan snappning, 6,9 % vid
 * två rutor, 6,2 % vid fyra, 5,6 % vid åtta, 3,4 % vid tolv. Kurvan är
 * entydig, och det är den som bestämmer skalan ovan.
 *
 * Att i stället göra varje bildruta till nyckelruta är den uppenbara
 * tanken och den är fel: prövat och mätt till 8,5 % mot 5,7 %, för filerna
 * växer till det tredubbla och varje enskild ruta blir dyrare att avkoda
 * än den kedja man slipper.
 */
function spola(v: HTMLVideoElement, p: number, bradska: number) {
  let mal = p * v.duration
  if (bradska > SNAPP_VID) {
    // Rutnätet glesnar med farten: fyra rutor, åtta, tolv. Alla tre är
    // multiplar av nyckelrutans avstånd, så målet hamnar på en nyckelruta
    // oavsett vilket av dem som gäller.
    const steg = RUTA * NYCKELSTEG * Math.min(3, 1 + Math.floor(bradska * 3))
    mal = Math.round(mal / steg) * steg
  }
  if (Math.abs(v.currentTime - mal) < RUTA * (0.5 + bradska * 3.5)) return
  if (v.seeking) return
  v.currentTime = mal
}

/** Vid vilken rullningsfart per bildruta brådskan räknas som full. */
const FULL_FART = 26

/**
 * Hur stor del av aktens rullning som klippet använder.
 *
 * Talet är i praktiken filmens växel: ju mindre andel av akten klippet
 * behöver, desto längre hinner det per rullat hjulsteg. Under en period
 * stod det på 0,96 — nästan hela akten — och filmen gick då i det
 * närmaste lika långsamt som spalten, vilket lät bilden släpa efter det
 * man höll på att göra med handen.
 *
 * Nu tar klippet slut en bit innan akten gör det. Färden blir en dryg
 * sjättedel snabbare, vilket är precis så mycket att bilden känns driven
 * av rullningen och inte släpad av den — men inte så mycket att man far
 * förbi tagningen innan man hunnit läsa raden som hör till den.
 *
 * Att klippet är framme före akten betyder inte att bilden stannar.
 * Kameran går hela vägen till aktens slut oavsett (se `--gang`), så den
 * sista biten är fortfarande en rörelse genom rummet — bara utan att
 * bildrutorna byts. Det var stannandet som en gång fick sidan att läsa som
 * en film i bakgrunden, och det stannandet finns inte här.
 */
const SPOLNING = 0.82

export function Verk() {
  const spar = useRef<HTMLDivElement>(null)
  const lager = useRef<(HTMLDivElement | null)[]>([])
  const filmer = useRef<(HTMLVideoElement | null)[]>([])
  const avsnitt = useRef<(HTMLElement | null)[]>([])
  const scen = useRef<HTMLDivElement>(null)
  const forraY = useRef(0)
  const bradska = useRef(0)
  const [akt, setAkt] = useState(0)
  /** Vilken av den gällande tagningens rader som står i rutan. */
  const [replik, setReplik] = useState(0)
  const [visar, setVisar] = useState<string | null>(null)
  /** Vilka tagningar som fått hämta sin fil. Aldrig fler än den som syns
   *  och den som står näst på tur. */
  const [laddad, setLaddad] = useState<boolean[]>(() => FILM.map((_, i) => i === 0))

  /**
   * GRUNDNINGEN
   * En film som aldrig spelats målar ingen bildruta på iOS.
   *
   * Sättet den här sidan visar film på är att aldrig spela den — bara
   * ställa den på den bildruta rullningen pekar ut. På en dator räcker det:
   * en sökning tvingar fram en målning. På iPhone gör den inte det. Där
   * ritas ingenting alls ur en video som inte har spelat minst en gång, och
   * resultatet blev en tom ruta med texten kvar ovanpå — sidan såg ut att
   * ha tappat filmen.
   *
   * Botemedlet är en enda uppspelning som avbryts direkt. Den varar inte
   * ens en bildruta, men den får avkodaren att måla, och därefter fungerar
   * varje sökning som den ska. `muted` och `playsInline` är villkoren för
   * att den uppspelningen ska tillåtas utan att någon rört skärmen; båda
   * står redan på filmen.
   */
  const grunda = (v: HTMLVideoElement | null) => {
    // Utan källa finns ingenting att grunda, och uppspelningen skulle bara
    // avvisas. Tagningar hämtas först när de närmar sig.
    if (!v || !v.currentSrc || v.dataset.grundad === 'ja') return
    v.dataset.grundad = 'ja'
    const p = v.play()
    // Nekas uppspelningen släpper vi märket igen, så att beröringen nedan
    // får försöka på nytt. Ett ohanterat avslag ska inte heller fälla
    // resten av sidan.
    p?.then(() => v.pause()).catch(() => { v.dataset.grundad = '' })
  }

  /**
   * Reserv: första gången någon rör sidan grundas allt som hunnit laddas.
   *
   * Automatisk uppspelning kan vara avstängd — i strömsparläge, eller för
   * att besökaren själv slagit av den. Då nekas grundningen ovan, och utan
   * det här hade rutan förblivit tom hela besöket. En beröring eller en
   * rullning är den gest webbläsaren väntar på, och den kommer ändå: det
   * enda man kan göra med den här sidan är att rulla.
   */
  useEffect(() => {
    const av = () => filmer.current.forEach(grunda)
    const val = { once: true, passive: true } as const
    addEventListener('touchstart', av, val)
    addEventListener('pointerdown', av, val)
    addEventListener('scroll', av, val)
    return () => {
      removeEventListener('touchstart', av)
      removeEventListener('pointerdown', av)
      removeEventListener('scroll', av)
    }
  }, [])

  useTick(() => {
    const el = spar.current
    if (!el) return
    const mitt = window.innerHeight * 0.5

    /**
     * Hur brått rullningen har, som ett tal mellan noll och ett.
     *
     * Jämnas ut över några bildrutor. Ett råvärde hoppar mellan noll och
     * fullt från ruta till ruta — en styrplatta levererar inte jämna steg —
     * och spärren nedan hade då slagit till och släppt om vartannat, vilket
     * syns tydligare än att den slår till alls.
     */
    const y = window.scrollY
    const steg = Math.abs(y - forraY.current)
    forraY.current = y
    bradska.current += (clamp01(steg / FULL_FART) - bradska.current) * 0.2

    /**
     * Varje akts läge läses ur dess eget avsnitt i spalten: hur långt
     * rutans mittlinje har vandrat genom avsnittet, från strax innan det
     * börjar till strax innan det slutar.
     *
     * Första akten räknas från sidans överkant och inte från mittlinjen.
     * Dess avsnitt börjar vid sidans nollpunkt, så mittlinjen står redan en
     * halv skärm in i det innan man rört rullhjulet — och då hade filmen
     * mött besökaren en sjättedel inspelad. Båda slutar på samma ställe:
     * när avsnittets nederkant passerar mittlinjen.
     */
    let aktiv = 0
    let aktivGenom = 0
    const in_: number[] = []
    for (let i = 0; i < AKTER.length; i++) {
      const a = avsnitt.current[i]
      if (!a) { in_.push(i === 0 ? 1 : 0); continue }
      const r = a.getBoundingClientRect()
      const genom = i === 0
        ? clamp01(-r.top / Math.max(1, r.height - mitt))
        : clamp01((mitt - r.top) / Math.max(1, r.height))
      /**
       * Insvepet sker över aktens första tredjedel och står sedan kvar.
       *
       * Första akten sveper aldrig in. Den är grunden man redan står på när
       * sidan öppnar sig, och ett svep där hade betytt att man möts av en
       * halvöppen ruta som drar ihop sig innan man ens rört rullhjulet.
       */
      in_.push(i === 0 ? 1 : clamp01(genom / SVEP))
      if (genom > 0 && genom < 1) { aktiv = i; aktivGenom = genom }
      else if (genom >= 1) {
        aktiv = Math.min(AKTER.length - 1, i + 1)
        // Sista akten tar inte slut i något efterföljande avsnitt. Har man
        // rullat förbi dess slut står den ändå kvar, och då är den framme.
        aktivGenom = aktiv === i ? 1 : 0
      }
    }

    /**
     * Filmen spolas av rullningen.
     *
     * Bara den gällande tagningen, och bara den som står näst på tur medan
     * den sveper in — en tagning som ingen ser ska inte kosta en sökning.
     * Den som står på tur ställs på sin första ruta, så att den är rätt från
     * den bildpunkt den blir synlig.
     */
    for (let i = 0; i < FILM.length; i++) {
      const v = filmer.current[i]
      if (!v || !v.duration) continue
      if (i > aktiv + 1 || i < aktiv - 1) continue
      const genom = i === aktiv ? aktivGenom : (i < aktiv ? 1 : 0)
      spola(v, clamp01(genom / SPOLNING), bradska.current)
    }

    // Raderna byts vid jämna delar av tagningen, så den som står i rutan
    // hör ihop med det man ser just då.
    const rader = FILM[Math.min(aktiv, FILM.length - 1)].repliker.length
    const r = Math.min(rader - 1, Math.floor(aktivGenom / SPOLNING * rader))

    for (let i = 0; i < FILM.length; i++) {
      const l = lager.current[i]
      if (!l) continue
      const v = in_[i] ?? 0
      /**
       * Kameran. Var man befinner sig i rummet, inte var i klippet man är.
       *
       * Den gällande tagningen färdas med aktens egen rullning. Den som
       * just lämnats fortsätter framåt medan nästa kommer emot en — utan
       * det stannar det förra rummet tvärt i samma stund som det nya börjar
       * synas genom det, och då ser man två stillbilder ovanpå varandra i
       * stället för en färd som går vidare.
       */
      const g = i === aktiv
        ? aktivGenom
        : i < aktiv ? 1 + (in_[i + 1] ?? 0) * 0.35 : 0

      /**
       * Bara det som faktiskt syns ritas.
       *
       * Ett lager som ännu inte kommit emot har ingenting att visa. Och ett
       * lager som fått nästa ovanpå sig i full täckning syns inte heller —
       * det ligger under en ogenomskinlig ruta som täcker hela fönstret.
       * Utan den andra halvan av villkoret målas och skalas alla fem
       * tagningarna sist på sidan i stället för en, och fyra av dem enbart
       * för att kunna vara skymda.
       */
      const syns = v > 0.001 && (in_[i + 1] ?? 0) < 1

      const nyckel = `${v.toFixed(2)} ${g.toFixed(2)} ${syns}`
      if (l.dataset.lage !== nyckel) {
        l.dataset.lage = nyckel
        l.style.setProperty('--in', v.toFixed(3))
        l.style.setProperty('--gang', g.toFixed(3))
        l.style.visibility = syns ? 'visible' : 'hidden'
      }
    }

    setAkt((f) => (f === aktiv ? f : aktiv))
    setReplik((f) => (f === r ? f : r))
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
            {/* Ingen `loop` och ingen `autoPlay`: tagningen spelas aldrig
                upp, den ställs. `preload="auto"` för att en sökning kräver
                att filen finns — med `metadata` hade första rullningen
                mötts av en tom ruta medan resten hämtades. */}
            <video
              className="verk__film"
              ref={(n) => { filmer.current[i] = n }}
              src={laddad[i] ? t.fil : undefined}
              muted
              playsInline
              preload="auto"
              tabIndex={-1}
              onLoadedData={(e) => grunda(e.currentTarget)}
              /* Spärren. Filmen ska aldrig spela — den ska ställas.
                 Grundningen ovan startar en uppspelning bara för att tvinga
                 fram en målad bildruta, och pausar den i samma andetag. Men
                 pausen ligger i ett löfte, och hinner uppspelningen komma i
                 gång innan löftet infrias fortsätter den. Det här stoppar
                 den i den stund den börjar: `playing` betyder att en ruta
                 nått skärmen, vilket var hela ärendet. */
              onPlaying={(e) => e.currentTarget.pause()}
            />
          </div>
        ))}

        <span className="verk__dis" />
        <Meander />

        {/* Raden i rutan. Den hör till bilden och inte till spalten, och den
            byts medan man rullar genom tagningen — som en textremsa i en
            film, inte som en skylt man rullar förbi. Nyckeln bär både
            tagning och rad, så bytet spelar sin egen ingång.

            Ingen etikett här: mätaren strax ovanför säger redan vilken akt
            man är i, och samma ord två gånger i samma ruta är inte en
            orientering utan ett eko. På en telefon finns inte plats för
            både rad och spalt, och där står den i spalten i stället — se
            `.akt__titel`. */}
        <div className="verk__akt" key={`${nu.id}-${replik}`}>
          <h2 className="verk__rubrik">
            {(nu.repliker[replik] ?? nu.repliker[0]).split('\n').map((rad) => (
              <span className="verk__rad" key={rad}>{rad}</span>
            ))}
          </h2>
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
                stället för att ligga bakom panelerna står före dem. Här
                står tagningens första rad och inte den som gäller just nu:
                den här titeln rullar med sidan i stället för att ligga
                still, och en rad som byts under tiden hade bytts mitt i
                läsningen av sig själv. */}
            <div className="akt__titel">
              <span className="verk__ort">{FILM[i]?.ort ?? a.namn}</span>
              <h2 className="verk__rubrik">
                {(FILM[i]?.repliker[0] ?? a.namn).split('\n').map((rad) => (
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
        {panel.knappar && (
          <div className="panel__knappar">
            {panel.knappar.map((k) => (
              <a className="panel__knapp" href={k.href} key={k.href}>
                {k.text}<Arrow />
              </a>
            ))}
          </div>
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

      {/* Rutorna står i par och inte på rad.

          En enda lodrät stapel av lika breda rutor läser som en spalt man
          betar av, och tolv sådana efter varandra blir enformiga hur väl
          skrivna de än är — det spelar ingen roll att filmen syns mellan
          dem när takten är densamma hela vägen ned. I par breder de i
          stället ut sig i rutan, halveras i höjd, och den lucka som
          uppstår när antalet är udda är inte ett hål utan ännu ett ställe
          där man ser filmen. Se `.grupp__rutor`. */}
      {(panel.punkter || panel.kort) && (
        <div className="grupp__rutor">
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
      )}
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
