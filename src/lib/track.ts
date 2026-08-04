import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useShotRange } from '../components/RoomFilm'
import { clamp, clamp01 } from './math'
import type { Frame } from './scroll'

export type Track = {
  /** 0 när elementets överkant når fönstrets underkant, 1 när det lämnat uppåt. */
  enter: number
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
      return { enter: p, pin: p, offset: 0, top: 0, height: 0 }
    }

    const { top, height } = box.current
    const span = height - f.vh

    const enter = clamp01((f.inner + f.vh - top) / (f.vh + height || 1))
    const offset = clamp(f.inner - top, 0, Math.max(span, 0))
    const pin = span > 0 ? clamp01((f.inner - top) / span) : enter

    return { enter, pin, offset, top, height }
  }, [shot])
}
