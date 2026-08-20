import { useEffect, useRef } from 'react'

/**
 * RÖRELSEN
 * ════════
 * Sidan har mycket rörelse, och det är själva poängen. Men rörelse som
 * kostar bildrutor läses som slarv, inte som liv — en animation som hackar
 * ser sämre ut än ingen animation alls. Därför är allt här byggt kring tre
 * regler:
 *
 *  1. Ett enda rAF-varv för hela sidan. Varje komponent som prenumererar
 *     får sitt anrop ur samma varv; ingen startar ett eget.
 *  2. Sådant som bara ska hända en gång — en text som träder fram när den
 *     kommer in i rutan — sköts av IntersectionObserver och CSS, inte av
 *     kod som räknar per bildruta. Webbläsaren gör det på annan tråd.
 *  3. Bara `transform` och `opacity` animeras. Allt annat tvingar fram ny
 *     layout eller ny målning för varje ruta.
 *
 * Den som bett om minskad rörelse får sidan stilla. Allt nedan blir då
 * genomskinligt: innehållet står kvar, det bara slutar röra sig.
 */

export const reducedMotion = () =>
  typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── Bildrutevarvet ───────────────────────────────────────────────────── */

type Tick = (now: number) => void

/**
 * Den som måste köra först i bildrutan.
 *
 * Mjuka rullningen flyttar sidans rullningsläge inifrån bildrutevarvet.
 * Allt annat på sidan läser det läget — genom `getBoundingClientRect` eller
 * `scrollY` — och skulle läsa förra rutans värde om det inte var avgjort
 * att rullningen räknas om innan de andra släpps in. En bildruta fel är
 * inte mycket, men det är hela skillnaden mellan text som sitter fast i
 * bilden och text som halkar en aning efter den.
 *
 * En egen plats och inte bara "prenumerera först": ordningen i en mängd är
 * den ordning man råkade montera i, och den är inte något att bygga på.
 */
let forst: Tick | null = null

const tickers = new Set<Tick>()
let rafId = 0

function loop(now: number) {
  forst?.(now)
  // Kopia, så att en prenumerant som säger upp sig mitt i varvet inte
  // ändrar mängden vi går igenom.
  for (const t of [...tickers]) t(now)
  rafId = tickers.size || forst ? requestAnimationFrame(loop) : 0
}

/** Sätter den som ska köra först i varje bildruta. */
export function setForst(t: Tick | null) {
  forst = t
  if (forst && !rafId) rafId = requestAnimationFrame(loop)
  return () => { if (forst === t) forst = null }
}

/** Prenumererar på bildrutevarvet. Varvet startas och stoppas av sig självt. */
export function onTick(t: Tick) {
  tickers.add(t)
  if (!rafId) rafId = requestAnimationFrame(loop)
  return () => {
    tickers.delete(t)
    if (!tickers.size && !forst && rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }
}

/** Samma sak som hook. Callbacken hålls i en ref — inga omprenumerationer. */
export function useTick(cb: Tick, enabled = true) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (!enabled) return
    return onTick((now) => ref.current(now))
  }, [enabled])
}

/* ── Magnetiska knappar ───────────────────────────────────────────────── */

/**
 * Drar elementet en aning mot pekaren när den är nära.
 *
 * Bara med riktig pekare. På pekskärm finns ingen svävande markör, och
 * effekten skulle bara ge ett hopp i samma stund som man trycker.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.28) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
    }
    const leave = () => { el.style.transform = '' }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strength])

  return ref
}
