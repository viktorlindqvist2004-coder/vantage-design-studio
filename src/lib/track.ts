import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useShotRange } from '../components/Film'
import { clamp, clamp01, mapRange } from './math'
import type { Frame } from './scroll'

export type Track = {
  /** 0 när elementets överkant når fönstrets underkant, 1 när det lämnat uppåt. */
  enter: number
  /**
   * 0 när sektionen börjar komma in, 1 när den står på sin plats.
   *
   * Skillnaden mot `enter` är var kurvan tar slut. `enter` mäter hela
   * passagen förbi fönstret och når 1 först när sektionen lämnat uppåt —
   * står man stilla mitt i den är den halvvägs. Sidan stannar numera på
   * bestämda lägen, ett per sektion, och då måste rörelsen vara färdig
   * precis där man stannar. Annars står halva texten kvar och väntar.
   */
  settle: number
  /** 0→1 över den sträcka elementet är fastnålat (för `height` > 100vh). */
  pin: number
  /** Hur många px elementets innehåll ska förskjutas för att ligga still. */
  offset: number
  top: number
  height: number
}

/**
 * Innehållet inuti skärmen rullas med transform, inte med en riktig
 * scrollbar. Därför fungerar varken `position: sticky` eller
 * IntersectionObserver härinne — sektionerna räknar i stället ut sin egen
 * position utifrån hur långt vi rullat.
 *
 * Hooken returnerar en läsfunktion som anropas inne i komponentens egen
 * bildruteloop, så att värdet alltid är färskt (ingen ordningsberoende
 * eftersläpning mellan prenumeranter).
 */
export function useTrack<T extends HTMLElement>(ref: RefObject<T | null>) {
  // Ute i rummet styrs sektionerna av sin tagning i stället för av
  // scrollpositionen inuti skärmen. Samma komponenter fungerar på båda
  // ställena utan att veta vilket det är.
  const shot = useShotRange()
  const box = useRef({ top: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      box.current = { top: el.offsetTop, height: el.offsetHeight }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.offsetParent instanceof HTMLElement) ro.observe(el.offsetParent)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref])

  return useCallback((f: Frame): Track => {
    if (shot) {
      const p = clamp01((f.film - shot.start) / shot.length)
      // Platsens läge ligger mitt i intervallet, så rörelsen ska vara klar
      // en bit dessförinnan.
      return { enter: p, settle: mapRange(p, 0.02, 0.42), pin: p, offset: 0, top: 0, height: 0 }
    }

    // Rutan här inne är filmens ram, inte fönstret — på en telefon är den
    // märkbart lägre, och mäter man mot fönstret hamnar sektionerna i
    // otakt med det man faktiskt ser.
    const { top, height } = box.current
    const span = height - f.pageH

    const enter = clamp01((f.inner + f.pageH - top) / (f.pageH + height || 1))
    const offset = clamp(f.inner - top, 0, Math.max(span, 0))
    const pin = span > 0 ? clamp01((f.inner - top) / span) : enter
    // Färdig när sektionens överkant nått fönstrets överkant — vilket är
    // exakt där sektionens hållplats ligger.
    const settle = clamp01((f.inner + f.pageH - top) / (f.pageH || 1))

    return { enter, settle, pin, offset, top, height }
  }, [shot])
}
