import { useEffect, useRef, useState } from 'react'
import { FILM } from '../data/film'
import { AKTER } from '../data/akter'
import { MOCKUPS } from '../data/mockups'
import { clamp01 } from '../lib/math'
import { reducedMotion, useTick } from '../lib/motion'
import { Showroom } from './Showroom'
import { Arrow } from './Chrome'
import { LogoMark } from './Logo'
import type { Panel as PanelData } from '../data/akter'

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

/**
 * PEKSKÄRM ELLER INTE — OCH VARFÖR DET AVGÖR ALLT
 * ═══════════════════════════════════════════════
 * En dator söker gärna i en film. En telefon gör det inte.
 *
 * Att spola är att sätta `currentTime` och be avkodaren hoppa. På en dator
 * är det billigt nog att göra sextio gånger i sekunden. På en iPhone går
 * varje sådant hopp genom hårdvaruavkodaren, tar tiotals millisekunder, och
 * begäranden som kommer medan en sökning pågår ställer sig på kö. Rullar
 * man med fingret kommer de fortare än de hinner betas av, och resultatet
 * är inte en film som spolas utan en bild som står still i ryck.
 *
 * Det syntes aldrig i mätningarna här, av ett skäl som är värt att skriva
 * ned: webbläsaren i den här maskinen saknar avkodare för H.264 helt och
 * hållet. Varje bildrutetakt jag mätt över spolningen mättes alltså på en
 * sida där filmen inte avkodades alls. Siffrorna var sanna och mätte fel
 * sak.
 *
 * Så på pekskärm spolar vi inte. Vi låter filmen spela, och styr i stället
 * hur fort den spelar så att den hinner ifatt det rullningen pekar ut.
 * Linjär avkodning är precis vad en telefon är byggd för, och det som
 * återstår att göra per bildruta är ett tal i `playbackRate`. Man rullar
 * fortfarande genom filmen — det är fortfarande rullningen som bestämmer
 * var i klippet man är — men vägen dit är den billiga i stället för den
 * dyra.
 */
const pekskarm = () =>
  typeof window !== 'undefined'
  && window.matchMedia('(hover: none), (pointer: coarse)').matches

/**
 * Låter filmen spela i kapp det rullningen pekar ut.
 *
 * Ligger målet framför oss spelar vi, och fortare ju längre bort det är —
 * en enkel jakt som hinner ifatt utan att slå över. Ligger vi redan rätt
 * pausar vi; en film som spelar vidare medan handen står still har lämnat
 * rullningen bakom sig.
 *
 * Bakåt kan ingen film spela, så där måste vi ändå söka. Men bara när man
 * gått en bra bit tillbaka, och högst några gånger i sekunden: det är den
 * enda dyra saken kvar, och den ska vara sällsynt.
 */
function jaga(v: HTMLVideoElement, p: number, nu: number, sista: { t: number }) {
  const mal = p * v.duration
  const fel = mal - v.currentTime
  if (fel > 0.03) {
    if (v.paused) v.play().catch(() => {})
    // Taket på tre är telefonens och inte vårt: högre hastigheter hoppar
    // över bildrutor i stället för att spela dem fortare.
    v.playbackRate = Math.min(3, Math.max(0.4, fel * 5))
  } else if (fel < -0.45) {
    if (!v.paused) v.pause()
    if (nu - sista.t > 150 && !v.seeking) {
      v.currentTime = mal
      sista.t = nu
    }
  } else if (!v.paused) {
    v.pause()
  }
}

/**
 * Ställer en tagning som inte är den gällande på sin rätta ruta, en gång.
 *
 * Den som just lämnats ska stå på sista rutan och den som står på tur på
 * första. Ingen av dem rör sig, så det räcker med en sökning när de kommit
 * fel — och framför allt ska ingen av dem spela.
 */
function stall(v: HTMLVideoElement, p: number) {
  if (!v.paused) v.pause()
  const mal = p * v.duration
  if (Math.abs(v.currentTime - mal) > 0.1 && !v.seeking) v.currentTime = mal
}

/** Vid vilken rullningsfart per bildruta brådskan räknas som full. */
const FULL_FART = 26

/**
 * EN TAGNING ÄR EN RESA, OCH TEXTEN VÄNTAR VID FRAMKOMSTEN
 * ════════════════════════════════════════════════════════
 * Filmen spolades först som en rak lutning mot rullningen. Texten kom och
 * gick efter partiets egen geometri, och de två visste inte om varandra:
 * en rubrik kunde slå upp mitt i en kamerarörelse och försvinna medan
 * kameran fortfarande svepte.
 *
 * Nästa försök delade klippet i lika många steg som akten har partier och
 * lade en vila vid varje. Filmen stod stilla medan man läste — det var
 * rätt — men varje resa blev en liten bit av en tagning, och rytmen blev
 * densamma som förut, bara hackad i småbitar: en pytteliten färd, en text,
 * en pytteliten färd, en text.
 *
 * Nu är en tagning en enda resa. Kameran går från klippets första bildruta
 * till dess sista i ett svep, långsammare än den någonsin gjort — närmare
 * två skärmhöjders rullning för en hel tagning — och den gör det med
 * ingenting i rutan. Man färdas. Vid framkomsten står bilden stilla, och
 * det är då akten säger vad den har att säga: alla dess partier läses på
 * den bildruta resan slutade på. Sedan sveper nästa tagning in och nästa
 * resa börjar.
 *
 * Det är också vad akterna heter till för. En akt är en tagning och ett
 * ämne, och nu är det en plats också.
 *
 * VARFÖR KURVAN ÄR UTJÄMNAD
 * En rak ramp som möter en vila stannar tvärt, och ett tvärt stopp i en
 * kamerarörelse läser som ett hack även när varenda bildruta hunnit fram.
 * `mjuk` nedan gör att kameran lossnar ur stillheten och bromsar in i den
 * igen. Det kostar ingenting — samma sökning, ett annat tal.
 */

/**
 * Hur många skärmhöjders rullning en hel tagning tar.
 *
 * Förut tog ett klipp `n × 0,43` skärmhöjder, där n var aktens antal
 * partier: mellan 0,86 och 1,72 beroende på akt. Talet nedan är
 * långsammare än var och en av dem, och det är samma tal för alla fem —
 * en tagning ska ta lika lång tid att färdas igenom oavsett hur mycket
 * text som väntar på andra sidan.
 */
const RESA = 1.75

/**
 * Hur långt före texten kameran ska vara framme, i skärmhöjder.
 *
 * Ett andetags stillhet innan första ordet kommer. Utan det landar texten
 * i samma bildruta som kameran slutar röra sig, och då är det fortfarande
 * en text som kommer mitt i en rörelse — bara en kortare.
 */
const FORE = 0.18

/** Utjämning: noll och ett med vågrät tangent i båda ändar. */
const mjuk = (t: number) => t * t * (3 - 2 * t)

/**
 * Tagningens läge, av hur långt det är kvar till aktens första text.
 *
 * `topp` är överkanten på aktens första parti. Texten börjar komma fram
 * när den passerar rutans mittlinje, alltså är avståndet dit — mätt i
 * skärmhöjder — hela det mått resan behöver. Kameran är framme `FORE`
 * innan dess och står sedan stilla akten ut.
 */
function resan(topp: number, V: number): number {
  const kvar = (topp - V * 0.5) / V
  return mjuk(clamp01(1 - (kvar - FORE) / RESA))
}

/**
 * PARTIERNA
 * ═════════
 * Ett per akt, och det är hela sanningen numera. Akten är en tagning, en
 * plats och en textskärm.
 *
 * ETT PARTI MÅSTE RYMMAS I RUTAN
 * Partiet står fastnaglat medan man läser det, och det som inte får plats
 * i rutan går därför inte att rulla fram — det ligger utanför kanten och
 * stannar där.
 *
 * Det löstes förut med att för långa stycken styckades automatiskt i flera
 * partier med samma rubrik. Automatiken fungerade, och det var just den
 * som gjorde sidan fel: man kom fram till en plats i filmen, bilden ställde
 * sig stilla, och sedan bläddrade man vidare i text på samma stillastående
 * bild. Sex kort blev sex skärmar på ett ställe.
 *
 * Passformen ligger nu i innehållet i stället — se noten i `akter.ts`. Det
 * som inte ryms på en skärm står inte på sidan. `dela`, `MAX_RUTOR` och
 * `MAX_FRAGOR` är därmed borta; med dem gick också det sista stället där
 * koden kunde rädda ett stycke som var för långt.
 */

type PartiData = { panel: PanelData; akt: number }

const PARTIER: PartiData[] = AKTER.map((a, akt) => ({ panel: a.panel, akt }))

/** Partiernas löpnummer, grupperade per akt, så spalten kan ritas akt för akt. */
const PER_AKT = AKTER.map((_, i) =>
  PARTIER.map((p, nr) => ({ p, nr })).filter((x) => x.p.akt === i))

/**
 * Hållen texten kommer in från.
 *
 * Ett stycke som glider in från vänster och nästa från höger läses som två
 * stycken. Kommer alla in nedifrån samtidigt läses de som en platta som
 * rör sig, och då är rörelsen bara en fördröjning innan man får läsa.
 *
 * Listan går runt. Sex håll räcker för att ingen granne ska dela riktning
 * med sin granne, och för att man inte ska hinna lära sig ordningen.
 *
 * Avstånden är drygt dubbelt så långa som de först var. Fyrtiofem
 * bildpunkter är en nyans; hundra är en rörelse. Med en text som nu står
 * still en hel skärmhöjd finns det också tid för en längre resa in.
 */
const HALL: [number, number][] = [
  [-115, 0],
  [120, 0],
  [0, 105],
  [-95, 48],
  [105, 40],
  [0, -88],
]

/**
 * VÄXLINGEN
 * ═════════
 * Två grannpartiers sträckor möts, och de två talen nedan är exakt
 * varandras komplement: när det ena partiets avfärd står på hälften står
 * grannens ankomst också på hälften. Därför räcker en enda punkt för att
 * bestämma hela överlämningen — före den lämnar det gamla, efter den
 * kommer det nya, och de möts aldrig.
 *
 * Att låta dem mötas prövades först, och det såg ut som det låter: två
 * stycken text i samma hörn av rutan, det ena på väg bort och det andra på
 * väg in, båda läsbara. Mätt över hela sidan låg trettiofyra procent av
 * rullningen i det läget. Nu är den siffran noll, till priset av ett kort
 * andetag där rutan bara bär film — vilket är precis vad ett ombyte mellan
 * två partier ska se ut som.
 */
const VAXEL = 0.5

/** Hur brant ett stycke tonar in när ankomsten passerat dess tröskel.
 *
 *  Ett stycke tar alltså 1/4,5 av ankomsten på sig, och ankomsten är en
 *  hel ruta — drygt tvåhundra bildpunkters rullning för ett stycke att
 *  komma fram. Talet var 6 när ankomsten var sextio hundradelar, vilket
 *  gav nittio. */
const INGANG = 4.5

/** Avståndet mellan styckenas trösklar. Det är det som gör att de kommer
 *  ett i taget och inte allihop på en gång.
 *
 *  Nittio bildpunkter mellan två stycken, mot tidigare femton. Femton är
 *  under vad man hinner uppfatta som en ordning: styckena kom i praktiken
 *  samtidigt, och det var inte vad talet fanns för.
 *
 *  Taket sätts av att allt ska rymmas i ankomstens andra halva. Ett parti
 *  har som mest fyra stycken, alltså tre steg: 3 × 0,09 + 1/4,5 = 0,49,
 *  och gränsen är 0,5. Fler stycken per parti kräver ett mindre tal här
 *  eller en brantare ingång — se `dela` och `MAX_RUTOR`. */
const TROSKEL = 0.09

/** Hur brant hela partiet tonar ut. Alla stycken lika, och fort. */
const UTGANG = 3.5

import type { CSSProperties } from 'react'

/** Ett stycke i ett parti, med sitt nummer, sitt håll och sitt senaste läge. */
type Del = { el: HTMLElement; i: number; dx: number; dy: number; syn: number }

/**
 * VEM SOM SKA DRIVA RÖRELSEN, OCH VARFÖR SVARET INTE ÄR DETSAMMA ÖVERALLT
 * ══════════════════════════════════════════════════════════════════════
 * Två sätt att få styckena att komma och gå: en slinga som räknar per
 * bildruta, eller `animation-timeline` som låter webbläsaren göra det.
 * Det finns inget bäst — de två motorerna har motsatta flaskhalsar.
 *
 * I Chromium är slingan snabbare, och mätt flera gånger: 21 procent sena
 * bildrutor mot 28 på strypt processor. Skälet är att en
 * rullningsanimation tickas av webbläsaren varje bildruta med sin egen
 * bokföring, medan slingan bara rör de partier som faktiskt syns. Att ge
 * stilmallen samma selektivitet med `data-nara` tog igen en del men inte
 * allt.
 *
 * På en iPhone spelar den mätningen ingen roll, för där körs slingan inte.
 * Under ett fingersvep prioriterar Safari rullningstråden och låter
 * bildrutevarvet vänta tills svepet lagt sig. Sidan rullar mjukt eftersom
 * rullning sköts av kompositorn, men allt som JavaScript ritar står still
 * och hoppar sedan ikapp. Det är precis vad "sidan glider inte" beskriver,
 * och ingen optimering av slingan hjälper mot att den inte körs.
 *
 * Därför: slingan på dator, stilmallen på pekskärm. Var och en får det som
 * passar den, och den uppmätta försämringen hamnar inte där den går att
 * mäta.
 *
 * ÄRLIGHET OM VAD SOM ÄR PRÖVAT: allt ovan om Chromium är mätt här.
 * Påståendet om Safari är hämtat ur hur motorn är känd att bete sig, inte
 * ur en mätning — den här maskinen har varken Safari eller WebKit.
 */
const cssDriven = () =>
  typeof CSS !== 'undefined'
  && !!CSS.supports?.('animation-timeline', 'view()')
  && pekskarm()

/**
 * Hur tät texten är när den står framme.
 *
 * Ett, och inte längre strax under. Genomskinligheten var tänkt att knyta
 * orden till bilden genom att låta filmen skymta i dem, och den gjorde
 * dem svårlästa mot en rörlig bakgrund i stället. Det som knyter texten
 * till filmen är ljuset bakom den; se `.parti__del` i site.css.
 *
 * Talet står också i `@keyframes parti-del`. Ändras det ena måste det
 * andra följa med.
 */
const TATHET = 1

export function Verk() {
  const spar = useRef<HTMLDivElement>(null)
  const lager = useRef<(HTMLDivElement | null)[]>([])
  const filmer = useRef<(HTMLVideoElement | null)[]>([])
  const avsnitt = useRef<(HTMLElement | null)[]>([])
  const partier = useRef<(HTMLElement | null)[]>([])
  /** Senast skrivna värde per parti. En vanlig lista och inte `dataset`:
   *  att skriva ett attribut är en ändring i DOM:en som måste jämföras
   *  bort igen, och det enda vi vill veta är om talet är detsamma. */
  const forraV = useRef<number[]>([])

  /**
   * Styckena i ett parti, uppslagna en gång och sedan ihågkomna.
   *
   * `querySelectorAll` per bildruta för varje parti som rör sig vore att
   * söka igenom samma träd sextio gånger i sekunden efter ett svar som
   * aldrig ändras. Listan byggs första gången partiet rör sig och ligger
   * kvar; nyckeln är elementet självt, så den försvinner med det.
   */
  /** Ljuset bakom texten, uppslaget en gång per parti. */
  const ljusLista = useRef(new WeakMap<HTMLElement, HTMLElement | null>())
  const ljuset = (el: HTMLElement) => {
    let l = ljusLista.current.get(el)
    if (l === undefined) {
      l = el.querySelector<HTMLElement>('.parti__ljus')
      ljusLista.current.set(el, l)
    }
    return l
  }

  const delLista = useRef(new WeakMap<HTMLElement, Del[]>())
  const delarna = (el: HTMLElement) => {
    let d = delLista.current.get(el)
    if (!d) {
      d = [...el.querySelectorAll<HTMLElement>('.parti__del')].map((n) => ({
        el: n,
        i: Number(n.style.getPropertyValue('--i')) || 0,
        dx: parseFloat(n.style.getPropertyValue('--dx')) || 0,
        dy: parseFloat(n.style.getPropertyValue('--dy')) || 0,
        syn: -1,
      }))
      delLista.current.set(el, d)
    }
    return d
  }
  const scen = useRef<HTMLDivElement>(null)
  /** Öppningstiteln, och det tal den senast skrevs med. Se noten i varvet. */
  const titel = useRef<HTMLDivElement>(null)
  const titelKvar = useRef(-1)
  const forraY = useRef(0)
  const bradska = useRef(0)
  /** Avgörs en gång. Ett medievillkor som frågas sextio gånger i sekunden
   *  är sextio frågor för mycket om svaret är detsamma hela besöket. */
  const pek = useRef(false)
  /** Om webbläsaren driver rullningsanimationerna själv. Avgörs en gång. */
  const cssTid = useRef(false)
  /** När den senaste bakåtsökningen gjordes, så de kan hållas sällsynta. */
  const sistaSok = useRef({ t: 0 })
  const [akt, setAkt] = useState(0)
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
    v.dataset.grundar = 'ja'
    const p = v.play()
    // Nekas uppspelningen släpper vi märket igen, så att beröringen nedan
    // får försöka på nytt. Ett ohanterat avslag ska inte heller fälla
    // resten av sidan.
    p?.then(() => {
      if (v.dataset.grundar !== 'ja') return
      delete v.dataset.grundar
      v.pause()
    }).catch(() => { v.dataset.grundad = '' })
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
    pek.current = pekskarm()
    cssTid.current = cssDriven()
    // Märket styr vilka regler i stilmallen som gäller. Sätts en gång.
    document.documentElement.dataset.driv = cssTid.current ? 'css' : 'js'
  }, [])

  /**
   * En observatör i stället för arbete per bildruta.
   *
   * Den märker ut vilka partier som är i närheten. Stilmallen ger
   * bara dem sina rullningsanimationer — se noten vid `data-nara` i
   * site.css för varför det är hela skillnaden mellan billigare och dyrare
   * än slingan den ersatte. Marginalen är en rutas höjd åt vardera hållet,
   * alltså gott om tid att komma på plats innan partiet syns.
   *
   */
  useEffect(() => {
    if (reducedMotion()) return
    const el = partier.current.filter(Boolean) as HTMLElement[]

    const nara = new IntersectionObserver(
      (poster) => {
        for (const p of poster) {
          const m = p.isIntersecting ? 'ja' : 'nej'
          const t = p.target as HTMLElement
          if (t.dataset.nara !== m) t.dataset.nara = m
        }
      },
      { rootMargin: '100% 0px 100% 0px' },
    )

    for (const n of el) nara.observe(n)
    return () => nara.disconnect()
  }, [])

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

  useTick((nu) => {
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
     * ÖPPNINGEN TONAR BORT
     * ════════════════════
     * Titeln lämnar över den första halva skärmen. Den är kvar hela vägen
     * ned till att man börjar rulla, går över i filmen medan man gör det,
     * och är borta innan första texten ens är på väg.
     *
     * Två skäl till att just den här rörelsen räknas här och inte av
     * stilmallen, till skillnad från styckenas.
     *
     * Det är ett element och två skrivningar, mot ett par hundra för
     * styckena. Det som gjorde slingan omöjlig på telefon var mängden, och
     * den finns inte här.
     *
     * Och den behöver fungera överallt. Rullningsdrivna animationer finns
     * i Safari först från 26; styckena har en slinga att falla tillbaka på
     * om stödet saknas, men det första en besökare ser ska inte hänga på
     * vilken version telefonen råkar ha. En titel som ligger kvar mitt över
     * filmen för att webbläsaren inte kunde tona bort den är värre än allt
     * annat den här sidan kan göra fel.
     *
     * Spärren nedan gör att varvet slutar röra elementet så fort det är
     * borta: talet skrivs bara när det ändrats, och när titeln väl står på
     * noll skrivs det aldrig mer. Resten av besöket kostar öppningen alltså
     * ingenting alls.
     */
    {
      const t = titel.current
      if (t) {
        const kvar = clamp01(1 - y / (mitt * 0.9))
        if (Math.abs(kvar - titelKvar.current) > 0.002) {
          titelKvar.current = kvar
          t.style.opacity = kvar.toFixed(3)
          /* Titeln lyfts och krymper en aning på väg bort. Rakt bortonad
             läser den som ett lager som släcks; en som samtidigt drar sig
             in i bilden läser som att man passerat den. */
          t.style.transform = kvar === 1
            ? 'none'
            : `translate3d(0, ${(-(1 - kvar) * 7).toFixed(2)}vh, 0) scale(${(1 - (1 - kvar) * 0.06).toFixed(4)})`
          t.style.visibility = kvar > 0 ? 'visible' : 'hidden'
        }
      }
    }

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
     * Filmen spolas av rullningen, i steg och inte i en lutning. Se
     * `trappa` för varför.
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
      let p: number
      if (i !== aktiv) {
        p = i < aktiv ? 1 : 0
      } else {
        /**
         * Resan mäts ur aktens första parti och inte ur akten själv.
         *
         * Akten är ett avsnitt med egen fyllnad — första akten bär en hel
         * skärms luft överst för att filmen ska få stå ensam en stund — och
         * dess läge säger därför ingenting om var texten står. Partiets gör
         * det exakt: första ordet börjar komma fram i den bildpunkt då
         * partiets överkant passerar rutans mittlinje, och avståndet dit är
         * precis det mått resan ska fördelas över.
         *
         * En avläsning per bildruta, och den ligger i läsvarvet före alla
         * skrivningar — se noten om påtvingad layout längre ned. Att i
         * stället räkna fram partiets läge ur akten hade sparat den
         * avläsningen och kostat att talet blev fel så fort en fyllnad
         * ändrades i stilmallen.
         */
        const forsta = partier.current[PER_AKT[i][0]?.nr ?? 0]
        const r = forsta?.getBoundingClientRect()
        p = r ? resan(r.top, mitt * 2) : clamp01(aktivGenom)
      }
      if (pek.current) {
        if (i === aktiv) jaga(v, p, nu, sistaSok.current)
        else stall(v, p)
      } else {
        spola(v, p, bradska.current)
      }
    }

    /**
     * PARTIERNA: ETT I TAGET, MED ÖVERLÄMNING OCH INTE MED GLAPP
     *
     * Varje parti äger en sträcka av rullningen och står fastnaglat mitt i
     * den. `--v` är hur framme partiet är, från noll till ett, och resten
     * sköter stilmallen: styckena kommer fram ett efter ett från var sitt
     * håll allteftersom talet stiger, och lämnar i omvänd ordning när det
     * faller.
     *
     * VARFÖR TALET INTE MÄTS ÖVER FASTNAGLINGEN
     * Första försöket räknade `--v` över just den sträcka partiet satt
     * fast. Det lät rimligt och gav en sida som till femtiosju procent var
     * tom: ett parti släpper sin fastnaglig när dess underkant når rutans
     * underkant, men nästa griper tag först när dess överkant når rutans
     * överkant — och däremellan ligger en hel skärmhöjd rullning där det
     * ena redan gått och det andra ännu inte kommit. Mätt över hela sidan,
     * sjuttiosex tomma lägen av hundratrettiotre.
     *
     * Nu mäts ankomsten från att partiet syns i underkanten till att det
     * biter fast, och avfärden från att det släpper till att det lämnat
     * överkanten. Grannarnas sträckor möts därmed mitt i varandra: det ena
     * tonar ut precis medan det andra tonar in, och det finns inget läge
     * kvar där rutan står tom.
     *
     * LÄSNINGEN FÖRST, SKRIVNINGEN SEDAN
     * Att läsa ett elements läge tvingar webbläsaren att räkna färdigt all
     * layout som ändrats sedan sist. Görs det i samma varv som en
     * stilskrivning — läs, skriv, läs, skriv — betalar man den uträkningen
     * en gång per parti i stället för en gång per bildruta. Med arton
     * partier blev det arton påtvingade layoutberäkningar per bildruta, och
     * mätt kostade det mer än trefalt: andelen sena bildrutor gick från 4,0
     * till 14,5 procent på strypt processor.
     *
     * Därför två varv och inte ett. Det första rör ingenting, det andra
     * frågar ingenting.
     */
    /**
     * Driver stilmallen rörelsen rör vi ingenting här.
     *
     * Det som följer — arton lägesavläsningar och ett par hundra
     * skrivningar per bildruta — är exakt det arbete som inte hinner göras
     * på en telefon under ett fingersvep. Med `animation-timeline` sköter
     * webbläsaren samma rörelse på rullningens egen tråd, och då ska den
     * här koden hålla sig undan i stället för att göra om jobbet sämre.
     *
     * Vilket parti som står framme följs av en observatör i stället, se
     * `useEffect` nedan. Det är ett besked som kommer när det händer, inte
     * en fråga som ställs sextio gånger i sekunden.
     */
    const V = window.innerHeight
    const nya: number[] = []
    const ankomst: number[] = []
    const avfard: number[] = []

    // Första varvet läser bara.
    for (let i = 0; !cssTid.current && i < PARTIER.length; i++) {
      const el = partier.current[i]
      if (!el) { nya.push(-1); continue }
      const r = el.getBoundingClientRect()
      // Ett parti långt utanför rutan har inget värde någon kan se.
      if (r.bottom < -V * 0.2 || r.top > V * 1.2) { nya.push(-1); continue }
      /**
       * Ankomsten och avfärden mäts över en hel ruta var.
       *
       * Det här talet är hela skillnaden mellan en text som glider fram
       * och en som slås på. Sträckan var sextio hundradelar, och av den
       * ligger bara hälften efter växeln — trettio hundradelars ruta, som
       * med den branthet ingången hade betydde att ett stycke gick från
       * osynligt till fullt på nittio bildpunkters rullning. Nittio
       * bildpunkter är ett enda hjulklick. Man såg därför aldrig något
       * komma; man såg det ha kommit.
       *
       * Det syntes också som en skillnad mellan maskinerna: på telefon
       * driver stilmallen samma rörelse över drygt en halv ruta, och de
       * två höll alltså inte på att göra samma sak.
       *
       * Med en hel ruta ligger femhundra bildpunkter efter växeln, och det
       * räcker för att både tona ett stycke i lugn takt och lägga
       * styckena efter varandra. Partierna kan ändå inte mötas: nästa
       * partis första stycke börjar först trehundrasextio bildpunkter
       * efter att det förras sista har gått. */
      const inn = clamp01((V - r.top) / V)
      const ut = clamp01((r.bottom - V * 0.4) / V)
      nya.push(Math.min(inn, ut))
      ankomst[i] = inn
      avfard[i] = ut
    }

    /**
     * Andra varvet skriver bara, och skriver på styckena själva.
     *
     * Den självklara lösningen är att lägga ett tal på partiet och låta
     * stilmallen räkna ut varje styckes genomskinlighet och förskjutning ur
     * det. Den prövades, och den är dyr: en skriven variabel gör varje
     * ättling som läser den ogiltig, och de är sju om partiet. Mätt genom
     * att helt enkelt strunta i skrivningen — 7,9 procent sena bildrutor
     * med den, 2,8 utan. Fem av åtta punkter låg alltså i det ena talet.
     *
     * Att i stället skriva `opacity` och `transform` rakt på styckena är
     * fler skrivningar men ingen ogiltigförklaring alls: varje element rör
     * bara sig självt, och båda egenskaperna hanteras av kompositorn utan
     * ny layout eller ny målning.
     *
     * Att registrera talet med `@property` som `<number>` prövades också
     * och blev sämre, 9,6 procent.
     */
    for (let i = 0; !cssTid.current && i < nya.length; i++) {
      const v = nya[i]
      if (v < 0) continue
      const el = partier.current[i]
      if (!el || forraV.current[i] === v) continue
      forraV.current[i] = v
      const inn = ankomst[i]
      const ut = avfard[i]
      // Avfärden gäller alla stycken lika och går fort. Att låta dem lämna
      // i tur och ordning läser inte som att partiet dras undan utan som
      // att det dröjer sig kvar.
      const bort = clamp01((ut - VAXEL) * UTGANG)

      /* Ljuset följer det stycke som är uppe längst, alltså det första.
         Skulle det tona med det sista blev rutan mörk en stund efter att
         orden gått, och tomt mörker läser som att något gått sönder. */
      const ljus = ljuset(el)
      if (ljus) {
        const p = Math.min(clamp01((inn - VAXEL) * INGANG), bort).toFixed(3)
        if (ljus.style.opacity !== p) ljus.style.opacity = p
      }

      for (const d of delarna(el)) {
        // Ankomsten är styckets egen: en tröskel som stiger med numret, så
        // styckena kommer fram efter varandra i stället för på en gång.
        const syn = Math.min(clamp01((inn - VAXEL - d.i * TROSKEL) * INGANG), bort)
        if (d.syn === syn) continue
        d.syn = syn
        d.el.style.opacity = (syn * TATHET).toFixed(3)
        d.el.style.transform = syn === 1
          ? 'none'
          : `translate3d(${(d.dx * (1 - syn)).toFixed(1)}px, ${(d.dy * (1 - syn)).toFixed(1)}px, 0)`
      }
    }

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
  }, !reducedMotion())

  /**
   * Bara tre tagningar åt gången har en källa: den gällande, den man just
   * lämnat och den som står på tur.
   *
   * Listan var förut enkelriktad — en tagning som fått sin fil behöll den
   * — så den som rullat hela vägen ned hade fem videoelement med var sin
   * avkodad film igång samtidigt. En dator bryr sig inte. En iPhone har ett
   * litet antal hårdvaruavkodare, och när de tar slut börjar den kasta ut
   * och läsa in filmer om vartannat medan man rullar. Det är inte något man
   * ser som långsamhet utan som ryck, och det var med all sannolikhet en
   * stor del av hacket.
   *
   * Tre räcker med marginal: den man lämnat syns bara medan den nya sveper
   * in över den, och den på tur ska ha hunnit läsas in innan den syns.
   */
  useEffect(() => {
    setLaddad((f) => {
      const n = FILM.map((_, i) => i >= akt - 1 && i <= akt + 1)
      return n.every((x, i) => x === f[i]) ? f : n
    })
  }, [akt])

  return (
    <div className="verk" ref={spar}>
      {/* ── Rutan. Ligger still hela vägen. ─────────────────────────── */}
      <div className="verk__scen" ref={scen} aria-hidden="true">
        {FILM.map((t, i) => (
          <div
            className="verk__lager"
            data-rorelse={t.rorelse}
            /* `will-change` bara på de tagningar som har en källa.

               Det stod i stilmallen och gällde alla fem, vilket betyder
               fem helskärmslager i grafikminnet genom hela besöket. På en
               iPhone med 1170 gånger 2532 bildpunkter är varje sådant
               lager elva megabyte, alltså femtiofem för fyra som mest
               syns två i taget. När minnet tar slut börjar kompositorn
               kasta ut och rita om lager medan man rullar, och det syns
               som ryck.

               Talet sätts när akten byter och inte per bildruta. Att växla
               det varje ruta prövades en gång och var mätbart dyrare än
               allt det skulle spara — ett lager som byggs om medan man
               tittar på det kostar mer än ett som bara ligger. */
            style={{ zIndex: i, willChange: laddad[i] ? 'transform' : 'auto' }}
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
              /* Spärren gäller bara grundningen.

                 Grundningen startar en uppspelning enbart för att tvinga
                 fram en målad bildruta, och pausar den i samma andetag —
                 men pausen ligger i ett löfte, och hinner uppspelningen
                 komma i gång innan löftet infrias fortsätter den. Det här
                 stoppar den i den stund den börjar.

                 Villkoret är nytt och nödvändigt. Utan det stoppade spärren
                 även den uppspelning som `jaga` startar med flit på
                 pekskärm, och filmen stod still oavsett hur mycket man
                 rullade. Märket sätts före uppspelningen och tas bort här,
                 så spärren gäller den enda uppspelning den var till för. */
              onPlaying={(e) => {
                const v = e.currentTarget
                if (v.dataset.grundar !== 'ja') return
                delete v.dataset.grundar
                v.pause()
              }}
            />
          </div>
        ))}

        <span className="verk__dis" />
        <Meander />

        {/* Öppningen. Ligger i rutan och inte ovanför den, så att den hör
            till filmen från första bildpunkten. Se `.verk__titel`. */}
        <div className="verk__titel" ref={titel}>
          <span className="verk__glod" aria-hidden="true" />
          <LogoMark className="verk__marke" />
          <h1 className="verk__namn">
            <span className="verk__namn-rad">Vantage</span>
            <span className="verk__namn-sub">Design Studio</span>
          </h1>
        </div>

        {/* Här stod rubriken förut, fastnaglad i rutans nedre vänstra hörn
            medan partiet under bar samma ord en gång till på en telefon.
            Två platser för samma sak, och ingen av dem mitt i bilden.

            Nu bär partiet sin rubrik själv på varje skärmstorlek, stort och
            centrerat — se `.parti__rubrik`. Det gör också att rubrik och
            stycke kommer och går tillsammans i stället för att den ena
            byter medan den andra står kvar. */}

        {/* Var i verket man befinner sig. Fem streck, ett per akt. */}
        <ol className="verk__mat">
          {AKTER.map((a, i) => (
            <li key={a.id} data-nu={i === akt}><i /><span>{a.namn}</span></li>
          ))}
        </ol>
      </div>

      {/* ── Spalten. Ett parti i taget. ──────────────────────────────── */}
      <div className="verk__spalt">
        {AKTER.map((a, i) => (
          <section
            className="akt"
            id={a.id}
            key={a.id}
            ref={(n) => { avsnitt.current[i] = n }}
          >
            {PER_AKT[i].map(({ p, nr }) => (
              <Parti
                key={nr}
                data={p}
                onVisa={setVisar}
                refCb={(n) => { partier.current[nr] = n }}
              />
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

/* ── Partierna i spalten ──────────────────────────────────────────────── */

/**
 * ETT PARTI
 * ═════════
 * En rubrik med det som hör till den, och den enda text som syns just nu.
 *
 * VARFÖR ETT I TAGET
 * Spalten var förut en obruten rulle: allt innehåll fanns hela tiden, varje
 * stycke tonade in en gång när det kom in i rutan och stod sedan kvar för
 * gott. Det gjorde sidan till en textsida med film bakom sig, hur väl
 * filmen än rörde sig — man rullade förbi en lista, och bakom listan råkade
 * det gå en film.
 *
 * Varje parti äger nu en sträcka av rullningen och sitter fastnaglat medan
 * man tar sig genom den: det kommer fram, står stilla medan man läser det,
 * och lämnar när man rullar vidare. Sträckorna gränsar till varandra, så
 * det finns aldrig två framme samtidigt. Rullningen blir en föredragning
 * och inte en rulle.
 *
 * VARFÖR STYCKENA KOMMER ETT I TAGET OCH FRÅN VAR SITT HÅLL
 * Kommer allt in samtidigt och från samma håll är rörelsen bara en
 * fördröjning innan man får läsa — man ser en platta glida upp, inte ett
 * stycke komma fram. Kommer de ett efter ett från olika håll läses de som
 * det de är: skilda saker, sagda i tur och ordning.
 *
 * Ordningen ligger i `--i` och hållet i `--dx`/`--dy`, båda satta här och
 * inte i stilmallen. Numret måste löpa genom hela partiet, och rutorna
 * ligger i ett eget rutfält — `nth-child` hade börjat om på ett där, och
 * då hade fyra stycken kommit in i samma ögonblick.
 *
 * Allt räknas ur ett enda tal: `--p`, hur långt in i partiets sträcka man
 * är. Det skrivs en gång per bildruta av `Verk`, och stilmallen gör resten
 * med `opacity` och `transform`. Ingen kod rör de enskilda styckena.
 */
function Parti({ data, onVisa, refCb }: {
  data: PartiData
  onVisa: (id: string) => void
  refCb: (n: HTMLDivElement | null) => void
}) {
  const { panel } = data
  // Löpnumret genom hela partiet, rutorna inräknade.
  let n = 0
  const del = (extra?: string) => {
    const [dx, dy] = HALL[n % HALL.length]
    /**
     * Talen skrivs som stilvariabler, en gång när sidan ritas.
     *
     * Det var de inte förut, och skälet var riktigt: en variabel som skrivs
     * om varje bildruta gör varje ättling som läser den ogiltig, och det
     * mättes till tre gånger dyrare än att skriva rakt på elementet. Men de
     * här skrivs aldrig om. De sätts en gång och står still hela besöket,
     * och då kostar de ingenting — samtidigt som stilmallen kan läsa dem
     * och driva hela rörelsen själv.
     */
    const props = {
      className: extra ? `parti__del ${extra}` : 'parti__del',
      style: { '--i': n, '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties,
    }
    n += 1
    return props
  }

  return (
    <div className="parti" ref={refCb}>
      <div className="parti__hall">
        {/* Ljuset som gör att texten hör till bilden. Se `.parti__ljus`. */}
        <div className="parti__ljus" aria-hidden="true" />
        <div className="parti__inre">
          {/* Rubriken hör hemma i rutan, och står här bara på en skärm som
              inte har någon plats i rutan att ge den. */}
          <h3 {...del('parti__rubrik')}>{panel.rubrik}</h3>

          {panel.brod && <p {...del('panel__brod')}>{panel.brod}</p>}

          {panel.tal && (
            <dl {...del('panel__tal')}>
              {panel.tal.map((t) => (
                <div key={t.varde}>
                  <dt>{t.varde}</dt>
                  <dd>{t.text}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Taggarna. Ett namn är hela innehållet, och taggen är samtidigt
              knappen som öppnar exemplet — ett kort med beskrivning och en
              knapp under tog fyra gånger höjden och sade inte fyra gånger
              så mycket. Alla i ett stycke: sex namn på rad läses som en
              uppräkning, och en uppräkning som kommer ett ord i taget är
              en uppräkning man väntar på. */}
          {panel.taggar && (
            <div {...del('panel__taggar')}>
              {panel.taggar.map((t) => (
                <button
                  className="panel__tagg"
                  type="button"
                  key={t.namn}
                  onClick={() => onVisa(t.exempel)}
                >
                  {t.namn}<Arrow />
                </button>
              ))}
            </div>
          )}

          {panel.knappar && (
            <div {...del('panel__knappar')}>
              {panel.knappar.map((k) => (
                <a className="panel__knapp" href={k.href} key={k.href}>
                  {k.text}<Arrow />
                </a>
              ))}
            </div>
          )}

          {panel.punkter && (
            <div className="parti__rutor">
              {panel.punkter.map((p) => (
                <div {...del('ruta')} key={p.titel}>
                  <b className="panel__titel">{p.titel}</b>
                  <span className="panel__text">{p.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
