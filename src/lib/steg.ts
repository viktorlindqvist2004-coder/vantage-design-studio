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

/** Hur lång en överlämning är. En hel tagning ska hinna spelas upp. */
const TID = 1500

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

/** Mjuk i båda ändar: kameran lossnar och bromsar in. */
const mjuk = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

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
       * En dragning i taget, men inte i en och en halv sekund.
       *
       * `VILA` avvisar styrplattans utrullning, som är trettio händelser
       * och en dragning. Andra villkoret avvisar en ny dragning som kommer
       * medan kameran nyss lossnat — men bara då. Kommer den när resan är
       * mer än gången tas den emot och målet flyttas ett steg till, för den
       * som rullar på i jämn takt ska komma framåt och inte mötas av en
       * sida som ignorerar varannan dragning.
       */
      if (nu - sist < VILA || (gar && kommit < 0.6)) { sist = nu; return }
      const i = (gar ? malI : narmast()) + steg
      if (i < 0 || i >= lagen.length) { sist = nu; return }
      fran = window.scrollY
      malI = i
      start = nu
      sist = nu
    }

    const slappVarv = setForst((nu) => {
      if (malI < 0) return
      const t = Math.min(1, (nu - start) / TID)
      window.scrollTo(0, Math.round(fran + (lagen[malI] - fran) * mjuk(t)))
      if (t >= 1) malI = -1
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

    /* Rutans höjd står i varje mått här — fästpunkterna sitter på `vh` —
       så lägena måste mätas om när den ändras. */
    const paStorlek = () => { mat(); malI = -1 }

    addEventListener('wheel', paHjul, { passive: false })
    addEventListener('touchstart', paStart, { passive: true })
    addEventListener('touchmove', paRor, { passive: false })
    addEventListener('touchend', paSlut, { passive: true })
    addEventListener('keydown', paTangent)
    document.addEventListener('click', paKlick)
    addEventListener('resize', paStorlek)

    return () => {
      removeEventListener('wheel', paHjul)
      removeEventListener('touchstart', paStart)
      removeEventListener('touchmove', paRor)
      removeEventListener('touchend', paSlut)
      removeEventListener('keydown', paTangent)
      document.removeEventListener('click', paKlick)
      removeEventListener('resize', paStorlek)
      slappVarv()
    }
  }, [])
}
