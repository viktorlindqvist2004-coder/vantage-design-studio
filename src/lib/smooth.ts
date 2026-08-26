import { useEffect } from 'react'
import Lenis from 'lenis'
import { reducedMotion, setForst } from './motion'

/**
 * DEN MJUKA RULLNINGEN
 * ════════════════════
 * Sidan rullar inte längre hack för hack med hjulet utan glider efter det.
 * Varje snurr sätter ett mål, och sidan tar sig dit med en utjämning per
 * bildruta i stället för att hoppa dit direkt.
 *
 * Det är inte bara en trevligare känsla, det är också vad allt annat på
 * sidan är byggt för. Nästan varje rörelse här läser sitt läge ur
 * rullningen — kabeln som firas ned, gryningen som tänder partiet, färden
 * som lutar innehållet, tråden genom stegen. Med hjulets råa hopp får de
 * sitt värde i språng om tjugo, femtio, hundra bildpunkter och rör sig i
 * ryck hur mjuka kurvor de än räknar med. Med en utjämnad rullning kommer
 * värdet i jämna steg, och samma kurvor blir plötsligt de rörelser de var
 * tänkta som.
 *
 * TRE SAKER SOM MÅSTE STÄMMA
 *
 * Den körs ur sidans enda bildrutevarv, inte ur ett eget. Två varv som
 * båda kallar `requestAnimationFrame` är två köer som glider mot varandra,
 * och då rör sig bakgrunderna en aning i otakt med det de ligger bakom.
 *
 * Den körs först i varvet. Allt annat läser rullningsläget, och läser det
 * innan det räknats om får man förra rutans värde — text som halkar en
 * bildruta efter bilden den ligger i. Därför den egna platsen i motion.ts
 * och inte bara en prenumeration bland andra.
 *
 * Den flyttar fönstrets riktiga rullning och inte ett innehåll med
 * transform. Det är hela skillnaden för resten av sidan: `position:
 * sticky`, `IntersectionObserver` och varje `getBoundingClientRect` läser
 * fortfarande sanningen. Ett bibliotek som i stället skjuter en behållare
 * i sidled hade gjort alla tre osanna på en gång.
 */
/**
 * Pekskärmar får inte den här alls.
 *
 * `syncTouch: false` gjorde redan att biblioteket lät fingret vara i fred,
 * men det innebar inte att det slutade arbeta: det låg kvar i sidans
 * bildrutevarv och läste rullningsläget sextio gånger i sekunden för att
 * komma fram till att det inte hade något att göra. På en telefon under
 * ett svep är varje sådant varv arbete som konkurrerar med rullningen
 * själv, och den mjukhet det skulle ge finns ändå inte där — den är till
 * för hjul och styrplattor.
 *
 * Ankarlänkarna nedan behöver det inte heller. Utan biblioteket sköter
 * webbläsaren dem själv, och på en telefon är det den rullning man vill
 * ha.
 */
const pekskarm = () =>
  typeof window !== 'undefined'
  && window.matchMedia('(hover: none), (pointer: coarse)').matches

export function useSmooth() {
  useEffect(() => {
    // Den som bett om minskad rörelse ska ha sidans egen rullning, orörd.
    if (reducedMotion()) return
    if (pekskarm()) return

    const lenis = new Lenis({
      /**
       * Utjämningen. Lägre tal ger längre efterglid.
       *
       * Åtta hundradelar ligger strax under det som börjar kännas som
       * eftersläpning: sidan kommer i kapp handen inom ett par tiondelar,
       * men aldrig i samma bildruta som hjulet snurrade. Går man lägre blir
       * det sirap, går man högre försvinner hela poängen.
       */
      lerp: 0.085,
      wheelMultiplier: 1,
      smoothWheel: true,
      /* Kvar som spärr. Hit kommer ingen pekskärm längre, men skulle
         villkoret ovan någon gång bli fel ska biblioteket ändå inte lägga
         en egen utjämning ovanpå systemets. */
      syncTouch: false,
      touchMultiplier: 1,
      autoRaf: false,
    })

    const slappLoss = setForst((nu) => lenis.raf(nu))

    /**
     * Ankarlänkarna glider dit i stället för att hoppa.
     *
     * Utan det här tar webbläsaren hand om `#kontakt` själv och flyttar
     * sidan omedelbart — mitt i en sida vars hela idé är att ingenting
     * flyttar sig omedelbart. Native `scroll-behavior: smooth` duger inte
     * heller: den kör sin egen kurva vid sidan om den mjuka rullningen, och
     * två utjämningar på samma rullning drar åt var sitt håll.
     */
    const påKlick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
      if (!a) return
      const id = a.getAttribute('href')
      if (!id || id === '#') return
      const mal = document.querySelector(id)
      if (!mal) return
      e.preventDefault()
      lenis.scrollTo(mal as HTMLElement, { offset: -72, duration: 1.1 })
      // Adressraden ska fortfarande bära vart man är, men utan hoppet.
      history.pushState(null, '', id)
    }
    document.addEventListener('click', påKlick)

    return () => {
      document.removeEventListener('click', påKlick)
      slappLoss()
      lenis.destroy()
    }
  }, [])
}
