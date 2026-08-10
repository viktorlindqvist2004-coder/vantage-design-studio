import { useEffect, useRef, useState } from 'react'

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

const tickers = new Set<Tick>()
let rafId = 0

function loop(now: number) {
  // Kopia, så att en prenumerant som säger upp sig mitt i varvet inte
  // ändrar mängden vi går igenom.
  for (const t of [...tickers]) t(now)
  rafId = tickers.size ? requestAnimationFrame(loop) : 0
}

/** Prenumererar på bildrutevarvet. Varvet startas och stoppas av sig självt. */
export function onTick(t: Tick) {
  tickers.add(t)
  if (!rafId) rafId = requestAnimationFrame(loop)
  return () => {
    tickers.delete(t)
    if (!tickers.size && rafId) {
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

/* ── Framträdanden ────────────────────────────────────────────────────── */

/**
 * En enda observer för hela sidan.
 *
 * Ett IntersectionObserver-objekt per element blir hundratals objekt på en
 * sida som den här. Ett delat kostar ett.
 *
 * Elementet får klassen `in` när det kommit in i rutan, och slutar sedan
 * bevakas. Framträdanden spelas en gång — rullar man tillbaka ska texten
 * stå kvar, inte spelas om. Det andra är en effekt man tröttnar på vid
 * andra genomläsningen.
 */
let io: IntersectionObserver | null = null

function observer() {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('in')
        io?.unobserve(e.target)
      }
    },
    // Nedre marginalen gör att något som nätt och jämnt sticker upp under
    // vikningen inte räknas som synligt — annars är rörelsen redan spelad
    // när man rullar dit.
    { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
  )
  return io
}

/** Ger en ref som får klassen `in` när elementet syns. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) {
      el.classList.add('in')
      return
    }

    // Det som redan står på första skärmen träder fram direkt.
    //
    // Observern har en nedre marginal så att något som nätt och jämnt
    // sticker upp under vikningen inte räknas som sett. På första skärmen
    // blir samma marginal fel: en knapp som ligger längst ned i hjälten är
    // fullt synlig men hamnar i den avräknade tiondelen, och då visades
    // den aldrig — den låg kvar osynlig tills man rullade, vilket är
    // ungefär det värsta ett anrop till handling kan göra.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('in')
      return
    }

    const ob = observer()
    ob.observe(el)
    return () => ob.unobserve(el)
  }, [])
  return ref
}

/* ── Skrubb: hur långt ett element hunnit genom rutan ─────────────────── */

type ScrubOpts = {
  /** Var mätningen börjar, som andel av fönsterhöjden under överkanten. */
  start?: number
  /** Var den slutar. */
  end?: number
}

/**
 * Anropar `cb` med 0–1 för hur långt elementet rest genom fönstret.
 *
 * 0 när elementets överkant står vid `start` (förvalt: fönstrets nederkant),
 * 1 när den passerat `end` (förvalt: fönstrets överkant). Mätningen görs i
 * bildrutevarvet i stället för på scroll-händelser, för scroll levereras i
 * en annan takt än sidan ritas och ger då hack.
 */
export function useScrub<T extends HTMLElement>(
  cb: (p: number) => void,
  { start = 1, end = 0 }: ScrubOpts = {},
) {
  const ref = useRef<T>(null)
  const fn = useRef(cb)
  fn.current = cb

  useTick(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const from = vh * start
    const to = vh * end - r.height
    // Nämnaren kan bli noll när elementet är exakt lika högt som sträckan.
    const span = from - to
    const p = span === 0 ? 1 : (from - r.top) / span
    fn.current(p < 0 ? 0 : p > 1 ? 1 : p)
  })

  return ref
}

/* ── Siffror som räknas upp ───────────────────────────────────────────── */

/**
 * Räknar från noll till `to` när elementet kommer in i rutan.
 *
 * Bara heltal räknas. `2026` och `100` går att räkna upp; `1:1` och `0` gör
 * det inte, och de lämnas därför i fred av anroparen.
 */
export function useCountUp(to: number, ms = 1400) {
  const [value, setValue] = useState(reducedMotion() ? to : 0)
  const ref = useRef<HTMLSpanElement>(null)
  const startAt = useRef(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    const ob = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        startAt.current = performance.now()
        setRunning(true)
        ob.disconnect()
      },
      { threshold: 0.4 },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  useTick((now) => {
    if (!running) return
    const t = Math.min(1, (now - startAt.current) / ms)
    // Snabbt först, långsamt sist — annars ser slutet ut som ett stopp.
    const eased = 1 - Math.pow(1 - t, 3)
    setValue(Math.round(to * eased))
    if (t >= 1) setRunning(false)
  }, running)

  return [value, ref] as const
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

/* ── Tonen under listen ───────────────────────────────────────────────── */

/**
 * Håller reda på om partiet just under sidhuvudet är ljust eller mörkt, och
 * skriver det på `<html>`.
 *
 * Listan ligger fast över innehållet och måste byta färg när den passerar
 * in i ett mörkt parti — annars försvinner den i det. Bandet som mäts är
 * några bildpunkter högt och ligger precis under listen: det som råkar
 * ligga där bestämmer.
 */
export function useToneUnderNav(navHeight = 72) {
  useEffect(() => {
    const parts = [...document.querySelectorAll<HTMLElement>('[data-tone]')]
    if (!parts.length) return

    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const tone = (e.target as HTMLElement).dataset.tone
          if (tone) document.documentElement.dataset.tone = tone
        }
      },
      { rootMargin: `-${navHeight}px 0px -${window.innerHeight - navHeight - 4}px 0px` },
    )
    for (const p of parts) ob.observe(p)
    return () => ob.disconnect()
  }, [navHeight])
}
