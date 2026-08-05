import { clamp, clamp01, damp } from './math'

/**
 * Sidans hela dramaturgi styrs av ett enda scrollvärde. Motorn nedan läser
 * `window.scrollY`, jämnar ut det och räknar fram alla härledda storheter en
 * gång per bildruta. Komponenter prenumererar med `subscribe()` och skriver
 * direkt till DOM:en — ingen React-omrendering sker per bildruta.
 */

export type Metrics = {
  /** Scrollsträcka (px) för inzoomningen mot skärmen. */
  act1: number
  /** Scrollsträcka (px) för utzoomningen ut ur skärmen. */
  act3: number
  /** Hur långt innehållet inuti skärmen kan rulla (px). */
  innerMax: number
  /** Scrollsträcka för kameraresan genom rummet efter utzoomningen (px). */
  filmMax: number
  /** Höjden på rutan sidan rullar i — filmens ram, inte alltid fönstret. */
  pageH: number
}

export type Frame = {
  /** Utjämnad scrollposition i px. */
  y: number
  /** Rå scrollposition i px. */
  raw: number
  /** Utjämnad hastighet i px per bildruta — driver skew och suddighet. */
  velocity: number
  vw: number
  vh: number
  dt: number
  time: number
  /** 0→1 medan kameran åker in i skärmen. */
  act1: number
  /** Hur långt vi rullat inuti skärmen (px). */
  inner: number
  innerMax: number
  /** 0→1 medan kameran backar ut ur skärmen. */
  act3: number
  /** Hur långt vi kommit i kameraresan genom rummet (px). */
  film: number
  filmMax: number
  /** Höjden på rutan sidan rullar i. Se Metrics. */
  pageH: number
  /** 0 = i rummet, 1 = helt inne i skärmen. */
  inside: number
  reduced: boolean
  pointerX: number
  pointerY: number
}

type Listener = (f: Frame) => void

const listeners = new Set<Listener>()

let metrics: Metrics = { act1: 0, act3: 0, innerMax: 0, filmMax: 0, pageH: 0 }
let running = false
let rafId = 0
let lastTime = 0

let smoothY = 0
let smoothVelocity = 0
let prevY = 0

let pointerTargetX = 0
let pointerTargetY = 0
let pointerX = 0
let pointerY = 0

const media = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null

let reduced = media?.matches ?? false
media?.addEventListener?.('change', (e) => { reduced = e.matches })

export const frame: Frame = {
  y: 0, raw: 0, velocity: 0,
  vw: typeof window !== 'undefined' ? window.innerWidth : 1440,
  vh: typeof window !== 'undefined' ? window.innerHeight : 900,
  dt: 16.67, time: 0,
  act1: 0, inner: 0, innerMax: 0, act3: 0, film: 0, filmMax: 0, pageH: 0, inside: 0,
  reduced: false, pointerX: 0, pointerY: 0,
}

export function setMetrics(next: Metrics) {
  metrics = next
}

export function getMetrics() {
  return metrics
}

/** Total scrollhöjd sidan behöver för att rymma hela dramaturgin. */
export function totalScrollHeight(vh: number) {
  return metrics.act1 + metrics.innerMax + metrics.act3 + metrics.filmMax + vh
}

export function subscribe(fn: Listener) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

function onPointerMove(e: PointerEvent) {
  pointerTargetX = (e.clientX / window.innerWidth) * 2 - 1
  pointerTargetY = (e.clientY / window.innerHeight) * 2 - 1
}

function tick(time: number) {
  const dt = lastTime ? clamp(time - lastTime, 1, 64) : 16.67
  lastTime = time

  const raw = window.scrollY || window.pageYOffset || 0
  // Utan utjämning blir inzoomningen ryckig; med utjämning "glider" kameran.
  // För mjukt blir den däremot seg — filmen ligger då kvar efter handen.
  smoothY = reduced ? raw : damp(smoothY, raw, 0.2, dt)

  const instant = smoothY - prevY
  prevY = smoothY
  smoothVelocity = damp(smoothVelocity, instant, 0.2, dt)

  pointerX = reduced ? 0 : damp(pointerX, pointerTargetX, 0.06, dt)
  pointerY = reduced ? 0 : damp(pointerY, pointerTargetY, 0.06, dt)

  const { act1, act3, innerMax, filmMax } = metrics
  const y = smoothY

  const a1 = act1 > 0 ? clamp01(y / act1) : 1
  const inner = clamp(y - act1, 0, innerMax)
  const a3 = act3 > 0 ? clamp01((y - act1 - innerMax) / act3) : 0
  const film = clamp(y - act1 - innerMax - act3, 0, filmMax)

  frame.raw = raw
  frame.y = y
  frame.velocity = smoothVelocity
  frame.vw = window.innerWidth
  frame.vh = window.innerHeight
  frame.dt = dt
  frame.time = time
  frame.act1 = a1
  frame.inner = inner
  frame.innerMax = innerMax
  frame.act3 = a3
  frame.film = film
  frame.filmMax = filmMax
  frame.pageH = metrics.pageH || frame.vh
  frame.reduced = reduced
  frame.pointerX = pointerX
  frame.pointerY = pointerY

  for (const fn of listeners) fn(frame)

  rafId = requestAnimationFrame(tick)
}

export function start() {
  if (running) return
  running = true
  smoothY = prevY = window.scrollY || 0
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  rafId = requestAnimationFrame(tick)
}

export function stop() {
  if (!running) return
  running = false
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
  lastTime = 0
}

export function isReduced() {
  return reduced
}
