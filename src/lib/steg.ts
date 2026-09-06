import { useEffect } from 'react'
import { reducedMotion, setForst } from './motion'

/**
 * EN DRAGNING, ETT STEG
 * ═════════════════════
 * Sidan har sex lägen: öppningen och de fem texterna. En dragning — ett
 * hjulsnurr, ett fingersvep, ett tangenttryck — lämnar över till nästa,
 * och resan däremellan spelas upp på vägen dit.
 *
 * VARFÖR INTE `scroll-snap-type: mandatory`
 * Det var första försöket, och det mättes: med fästpunkter 3195 bildpunkter
 * isär flyttade ett hjulsnurr på 120 bildpunkter sidan noll bildpunkter.
 * Inte "en bit" — noll. Webbläsaren drar tillbaka till närmaste punkt så
 * länge dragningen inte bär mer än halvvägs, och halvvägs är här 1600
 * bildpunkter. Först vid 1600 hoppade den över. En sida där hjulet inte gör
 * någonting alls är sämre än den som krävde tolv snurr.
 *
 * Snäppningen är därför borta och överlämningen görs här. Fästpunkterna är
 * kvar — `.verk__lapp` och `.parti__lapp` — men som lägen att räkna mot,
 * inte som något webbläsaren sköter.
 *
 * FRAMFÖRNINGEN LIGGER I SIDANS EGET BILDRUTEVARV, FÖRST
 * Allt annat på sidan läser rullningsläget: filmen spolas av det, texten
 * kommer och går av det, ljuset bakom orden följer det. Skrivs läget i ett
 * eget varv får de förra rutans värde, och bilden halkar en bildruta efter
 * texten den ligger i. `setForst` är platsen som finns för just det här.
 *
 * VAD SOM INTE ÄR KAPAT
 * Rullningslisten, tangentbordet, sökfunktionens hopp och webbläsarens egen
 * återställning vid omladdning rör sig fritt; läget räknas då om till
 * närmaste fästpunkt utan att någon framförning startas. Och den som bett
 * om minskad rörelse får ingenting av det här alls — då är sidan en vanlig
 * sida som rullar som vanligt.
 */

/**
 * Hur lång en överlämning är.
 *
 * Talet stod på 1500, och då hann man inte se vad som hände. Det var inte
 * främst för att 1500 är kort utan för att kurvan var fel — se `kurva`
 * nedan. Med den kurvan fick resan 20 hundradelar av tiden, alltså 300
 * millisekunder för en sex sekunder lång tagning: tjugo gångers fart, och
 * det är inte en kamerarörelse utan en suddning.
 *
 * Nu får resan 60 hundradelar av tiden. Resten går åt till att förra texten
 * lämnar och nästa kommer, och det är toningar som inte behöver lika lång
 * tid som en kamerarörelse.
 */
const TID = 3300

/**
 * Hur länge en dragning räknas som pågående efter sista händelsen.
 *
 * En styrplatta skickar inte en händelse per dragning utan trettio, och
 * utan den här vilan hade ett enda svep tagit en genom hela sidan. Vilan
 * mäts från sista hjulhändelsen och inte från framförningens slut, för en
 * lång utrullning på styrplattan varar längre än framförningen gör.
 */
const VILA = 220

/** Hur långt fingret måste färdas för att räknas som ett svep. */
const SVEP_MIN = 28

/**
 * FARTEN MÄTS I STRÄCKA, INTE I TID
 * ═════════════════════════════════
 * Överlämningen är 3,55 rutor lång och består av tre olika saker:
 *
 *   0 – 25,7 %   förra textens avfärd
 *   25,7 – 74,7 %  resan, alltså hela tagningen från första bildruta till sista
 *   74,7 – 100 %   nästa texts ankomst
 *
 * Talen följer av `RESA` och `FORE` i Verk.tsx och av partiets höjd; ändras
 * någon av dem måste de här räknas om.
 *
 * En vanlig utjämning — långsam i ändarna, snabb i mitten — lägger sin fart
 * precis där resan ligger. Mätt: den kubiska in-ut-kurvan gav resan tjugo
 * hundradelar av tiden. Det är fel håll. Det som ska gå fort är de två
 * toningarna; det som ska gå långsamt är åkningen genom rummet.
 *
 * Därför är farten här en funktion av hur långt man kommit och inte av hur
 * lång tid det gått: 2,6 gånger så snabb i ändarna som i mitten — se
 * `ANDE` — med en mjuk start och en landning som sätter sig. Kurvan integreras en gång till en
 * uppslagstabell, och varje bildruta slår upp sin sträcka i den.
 */

/** Hur mycket snabbare ändarna går än mitten. */
const ANDE = 2.6

const glatt = (x: number) => {
  const u = Math.min(1, Math.max(0, x))
  return u * u * (3 - 2 * u)
}

/** `TABELL[i]` är den andel av tiden som gått när sträckan `i / N` är nådd. */
const TABELL = (() => {
  const N = 256
  const fart = (d: number) => {
    // Ett i mitten där resan går, `ANDE` i de två ändarna.
    const inne = glatt((d - 0.17) / 0.11) * glatt((0.83 - d) / 0.11)
    const grund = ANDE + (1 - ANDE) * inne
    /* Mjuk start och landning. Golvet finns för att farten aldrig får bli
       noll — tiden att tillryggalägga en sträcka i noll fart är oändlig, och
       summan nedan hade skenat. */
    return grund * Math.max(0.16, Math.min(glatt(d / 0.04), glatt((1 - d) / 0.09)))
  }
  const t = [0]
  for (let i = 1; i <= N; i++) t.push(t[i - 1] + 1 / fart((i - 0.5) / N))
  const tot = t[N]
  return t.map((x) => x / tot)
})()

/** Sträckan vid tiden `t`, uppslagen och interpolerad ur tabellen. */
const kurva = (t: number) => {
  const n = TABELL.length - 1
  let lo = 0
  let hi = n
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (TABELL[m] <= t) lo = m
    else hi = m
  }
  const span = TABELL[hi] - TABELL[lo]
  const k = span > 0 ? (t - TABELL[lo]) / span : 0
  return (lo + k) / n
}

export function useSteg() {
  useEffect(() => {
    if (reducedMotion()) return

    /** Fästpunkternas lägen i dokumentet, i ordning. */
    let lagen: number[] = []
    const mat = () => {
      lagen = [...document.querySelectorAll<HTMLElement>('.verk__lapp, .parti__lapp')]
        .map((e) => Math.round(window.scrollY + e.getBoundingClientRect().top))
        .sort((a, b) => a - b)
    }
    mat()

    /** Vilket läge vi är på väg till, eller −1 om ingen framförning pågår. */
    let malI = -1
    let fran = 0
    let start = 0
    /** Åt vilket håll den pågående framförningen går: 1 fram, −1 tillbaka. */
    let riktning = 0
    /** När den senaste dragningen senast hördes av. */
    let sist = 0

    const narmast = () => {
      const y = window.scrollY
      let b = 0
      for (let i = 1; i < lagen.length; i++) {
        if (Math.abs(lagen[i] - y) < Math.abs(lagen[b] - y)) b = i
      }
      return b
    }

    const ga = (steg: number) => {
      const nu = performance.now()
      const gar = malI >= 0
      const kommit = gar ? (nu - start) / TID : 1

      /**
       * ATT VÄNDA GÅR ALLTID
       *
       * Det gjorde det inte förut, och det var felet bakom "man kan inte
       * rulla tillbaka". Spärren nedan avvisade varje dragning som kom
       * innan framförningen var halvgången — oavsett åt vilket håll den
       * gick. En framförning är 3,3 sekunder, alltså fanns det ett fönster
       * på en och en halv sekund efter varje svep där ett svep åt andra
       * hållet inte gjorde någonting alls. Den som svepte fram och genast
       * ville tillbaka möttes av en sida som inte svarade, och slutsatsen
       * att det inte gick är den enda rimliga att dra.
       *
       * En vändning är dessutom aldrig något att dämpa. Den är ett besked
       * om att man ville något annat än det som pågår, och det beskedet ska
       * gå fram i samma stund det ges.
       */
      const vander = gar && Math.sign(steg) !== riktning

      /**
       * `VILA` avvisar styrplattans utrullning, som är trettio händelser
       * och en dragning. Det andra villkoret avvisar en ny dragning åt
       * samma håll som kommer medan kameran nyss lossnat — men bara då.
       * Kommer den när resan är halvgången tas den emot och målet flyttas
       * ett steg till, för den som rullar på i jämn takt ska komma framåt
       * och inte mötas av en sida som ignorerar varannan dragning.
       */
      if (steg === 0) return
      if (nu - sist < VILA || (gar && !vander && kommit < 0.5)) { sist = nu; return }
      const nuvarande = gar ? malI : narmast()
      /* Klipp mot ändarna i stället för att avvisa. `Home` och `End` skickar
         hela listans längd som steg just för att hamna längst ut, och med en
         ren avvisning gjorde de två tangenterna ingenting alls. */
      const i = Math.max(0, Math.min(lagen.length - 1, nuvarande + steg))
      if (i === nuvarande) { sist = nu; return }
      fran = window.scrollY
      malI = i
      riktning = Math.sign(i - nuvarande)
      start = nu
      sist = nu
    }

    const slappVarv = setForst((nu) => {
      if (malI < 0) return
      const t = Math.min(1, (nu - start) / TID)
      window.scrollTo(0, Math.round(fran + (lagen[malI] - fran) * kurva(t)))
      if (t >= 1) { malI = -1; riktning = 0 }
    })

    /* ── Hjulet ──────────────────────────────────────────────────────
       `passive: false` för att `preventDefault` ska bita. Utan den rullar
       webbläsaren sin egen sträcka samtidigt som framförningen rullar sin,
       och de två drar åt olika håll i samma tal. */
    const paHjul = (e: WheelEvent) => {
      if ((e.target as Element | null)?.closest?.('.skylt')) return
      e.preventDefault()
      if (Math.abs(e.deltaY) < 2) return
      ga(e.deltaY > 0 ? 1 : -1)
    }

    /* ── Fingret ─────────────────────────────────────────────────────
       Samma sak, men riktningen avgörs när fingret släpper: ett svep är
       inte en riktning förrän det är färdigt. */
    let fingerY = 0
    const paStart = (e: TouchEvent) => { fingerY = e.touches[0]?.clientY ?? 0 }
    const paRor = (e: TouchEvent) => {
      /* Två fingrar är inte en dragning utan en nypning, och den ska
         fortfarande förstora sidan. Att spärra den hade tagit bort det enda
         sätt en synsvag har att läsa en text som står i grad clamp(). */
      if (e.touches.length > 1) return
      if ((e.target as Element | null)?.closest?.('.skylt')) return
      e.preventDefault()
    }
    const paSlut = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.('.skylt')) return
      const y = e.changedTouches[0]?.clientY ?? fingerY
      const d = fingerY - y
      // Ett tryck är inte ett svep. Knappar och taggar ska fortfarande gå
      // att trycka på utan att sidan lämnar över.
      if (Math.abs(d) < SVEP_MIN) return
      ga(d > 0 ? 1 : -1)
    }

    /* ── Tangenterna ─────────────────────────────────────────────────
       Sidan ska gå att ta sig igenom utan mus och utan finger. */
    const paTangent = (e: KeyboardEvent) => {
      const m = e.target as Element | null
      if (m?.closest?.('.skylt') || m?.closest?.('input, textarea, select')) return
      const ned = ['PageDown', 'ArrowDown', 'ArrowRight', ' ', 'Spacebar']
      const upp = ['PageUp', 'ArrowUp', 'ArrowLeft']
      if (ned.includes(e.key)) { e.preventDefault(); ga(1) }
      else if (upp.includes(e.key)) { e.preventDefault(); ga(-1) }
      else if (e.key === 'Home') { e.preventDefault(); ga(-lagen.length) }
      else if (e.key === 'End') { e.preventDefault(); ga(lagen.length) }
    }

    /* ── Listens länkar ──────────────────────────────────────────────
       De pekar på fästpunkterna, så det finns alltid ett läge att gå till.
       Framförningen är densamma som för en dragning; skillnaden är bara att
       steget kan vara mer än ett. */
    const paKlick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
      const id = a?.getAttribute('href')
      if (!id || id === '#') return
      const el = document.querySelector<HTMLElement>(id)
      if (!el) return
      e.preventDefault()
      const y = Math.round(window.scrollY + el.getBoundingClientRect().top)
      let i = 0
      for (let k = 1; k < lagen.length; k++) {
        if (Math.abs(lagen[k] - y) < Math.abs(lagen[i] - y)) i = k
      }
      // Här går vi rakt på läget och inte via `ga`, som räknar i steg om ett.
      malI = -1
      sist = 0
      ga(i - narmast())
      history.pushState(null, '', id)
    }

    /**
     * NÄR RUTAN BYTER HÖJD
     *
     * Fästpunkterna sitter på skärmhöjder, så lägena måste mätas om när
     * rutan ändras. Men framförningen ska inte avbrytas, och det gjorde den
     * förut — `malI = -1` stod här.
     *
     * På en telefon är det inte ett kantfall utan det normala. Adressraden
     * fälls ihop så fort sidan börjar röra sig, rutan växer med sextio till
     * hundra bildpunkter, och webbläsaren skickar en storleksändring mitt i
     * resan. Följden var att kameran stannade tvärt någonstans på vägen och
     * lämnade en mellan två lägen.
     *
     * Nu mäts bara om. Varvet läser `lagen[malI]` varje bildruta, så målet
     * flyttar med av sig självt och resan fortsätter dit den skulle.
     */
    const paStorlek = () => { mat() }

    addEventListener('wheel', paHjul, { passive: false })
    addEventListener('touchstart', paStart, { passive: true })
    addEventListener('touchmove', paRor, { passive: false })
    addEventListener('touchend', paSlut, { passive: true })
    addEventListener('keydown', paTangent)
    document.addEventListener('click', paKlick)
    addEventListener('resize', paStorlek)
    /* Adressradens upp- och nedfällning på telefon syns här och inte alltid
       i `resize`. */
    visualViewport?.addEventListener('resize', paStorlek)

    return () => {
      removeEventListener('wheel', paHjul)
      removeEventListener('touchstart', paStart)
      removeEventListener('touchmove', paRor)
      removeEventListener('touchend', paSlut)
      removeEventListener('keydown', paTangent)
      document.removeEventListener('click', paKlick)
      removeEventListener('resize', paStorlek)
      visualViewport?.removeEventListener('resize', paStorlek)
      slappVarv()
    }
  }, [])
}
