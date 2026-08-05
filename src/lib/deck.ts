import { clamp, easeInOutCubic } from './math'

/**
 * HÅLLPLATSERNA
 * ═════════════
 * Sidan rullar inte fritt. Den har ett bestämt antal lägen — skrivbordet,
 * varje vy inne i skärmen, varje plats ute i rummet — och en dragning
 * flyttar precis ett steg. Man hamnar alltså alltid på något, aldrig mellan
 * två saker med halva texten inne.
 *
 * Motorn nedan äger både inmatningen och förflyttningen. Den räknar fram en
 * position i samma skala som den gamla scrollen använde, så allt som redan
 * lyssnar på `Frame` fungerar oförändrat: skillnaden är bara att positionen
 * kommer från en styrd förflyttning i stället för från fönstrets scroll.
 *
 * Inflygningen är ett eget fall. Den ska spelas i sin egen takt — man drar
 * en gång, kameran åker in, skärmen laddar och släpper fram sidan, allt utan
 * att man rör något mer. Därför har den en egen, längre speltid och en rak
 * kurva: klippet ska rulla som klippet är gjort, inte som en animation med
 * inbromsning.
 */

/** En hållplats: ett läge i den gamla scrollskalan, med ett namn. */
export type Station = { id: string; y: number }

/** Så länge tar en vanlig förflyttning mellan två grannar. */
const STEP_MS = 900
/** Inflygningen får den tid klippet behöver, plus en andhämtning. */
const ENTRY_MS = 4150
/** Steget ut ur skärmen är en övertoning, och tål att ta lite längre tid. */
const LEAVE_MS = 1500

/** Hur mycket hjul som krävs för att räknas som en dragning. */
const WHEEL_THRESHOLD = 40
/** Hur långt fingret ska föras för att räknas som en dragning. */
const TOUCH_THRESHOLD = 48
/** Lugn stund efter en förflyttning, så att slängen inte utlöser nästa. */
const COOLDOWN_MS = 140

let stations: Station[] = [{ id: 'start', y: 0 }]
let index = 0

let fromY = 0
let toY = 0
let startedAt = 0
let duration = STEP_MS
let linear = false
/** Positionen just nu, i samma skala som den gamla scrollen. */
let position = 0

let wheelAcc = 0
let touchStartY = 0
let touchLocked = false
let readyAt = 0
let attached = false

const moving = (now: number) => now < startedAt + duration

/**
 * Hur lång tid ett steg får ta.
 *
 * Inflygningen är en kamerarörelse med egen längd — den ska rulla i klippets
 * takt. Vägen tillbaka till skrivbordet är däremot ingen rörelse alls: där
 * ställs klippet om till sin början, och det ska gå fort.
 */
function stepTime(from: number, to: number) {
  if (to > from && from === 0) return ENTRY_MS
  const ids = [stations[from]?.id, stations[to]?.id]
  const crossesRoom = ids.some((id) => id?.startsWith('room'))
    && ids.some((id) => id?.startsWith('inner'))
  return crossesRoom ? LEAVE_MS : STEP_MS
}

/** Sätter listan av lägen. Nuvarande hållplats behålls om den finns kvar. */
export function setStations(next: Station[]) {
  if (!next.length) return
  stations = next
  index = clamp(index, 0, stations.length - 1)
  // Vid en omräkning — nytt fönster, nytt innehåll — ska vi stå kvar på
  // samma hållplats, inte på samma pixel.
  const y = stations[index].y
  if (!moving(performance.now())) {
    fromY = toY = position = y
  } else {
    toY = y
  }
}

export function stationIndex() {
  return index
}

export function findStation(id: string) {
  return stations.findIndex((s) => s.id === id)
}

/** Flyttar till en hållplats. `now` gör steget omedelbart. */
export function goTo(next: number, immediate = false) {
  const target = clamp(Math.round(next), 0, stations.length - 1)
  if (target === index && !immediate) return
  index = target
  fromY = position
  toY = stations[index].y
  duration = immediate ? 0 : stepTime(findFrom(fromY), index)
  linear = duration === ENTRY_MS
  startedAt = performance.now()
  readyAt = startedAt + duration + COOLDOWN_MS
  if (immediate) position = toY
}

/** Vilken hållplats en position ligger närmast — bara för speltiden. */
function findFrom(y: number) {
  let best = 0
  let bestGap = Infinity
  stations.forEach((s, i) => {
    const gap = Math.abs(s.y - y)
    if (gap < bestGap) { bestGap = gap; best = i }
  })
  return best
}

function step(dir: number) {
  const now = performance.now()
  if (now < readyAt) return
  goTo(index + dir)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const now = performance.now()
  if (now < readyAt) {
    // Slängen efter en dragning ska inte räknas som nästa dragning.
    wheelAcc = 0
    return
  }
  wheelAcc += e.deltaY
  if (Math.abs(wheelAcc) < WHEEL_THRESHOLD) return
  const dir = Math.sign(wheelAcc)
  wheelAcc = 0
  step(dir)
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? 0
  touchLocked = false
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (touchLocked) return
  const y = e.touches[0]?.clientY ?? 0
  const delta = touchStartY - y
  if (Math.abs(delta) < TOUCH_THRESHOLD) return
  touchLocked = true
  step(Math.sign(delta))
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable]')) return

  switch (e.key) {
    case 'ArrowDown': case 'PageDown': case ' ': step(1); break
    case 'ArrowUp': case 'PageUp': step(-1); break
    case 'Home': goTo(0); break
    case 'End': goTo(stations.length - 1); break
    default: return
  }
  e.preventDefault()
}

export function attach() {
  if (attached) return
  attached = true
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('keydown', onKey)
}

export function detach() {
  if (!attached) return
  attached = false
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('keydown', onKey)
}

/** Positionen den här bildrutan. Anropas en gång per bildruta av scroll.ts. */
export function advance(now: number) {
  if (duration <= 0) {
    position = toY
    return position
  }
  const t = clamp((now - startedAt) / duration, 0, 1)
  // Inflygningen går rakt igenom: klippet har sin egen inbromsning inbyggd,
  // och lägger man en till ovanpå blir slutet sirapigt.
  position = fromY + (toY - fromY) * (linear ? t : easeInOutCubic(t))
  return position
}

/** Hur långt in i den pågående förflyttningen vi är, 0–1. */
export function progress(now: number) {
  return duration <= 0 ? 1 : clamp((now - startedAt) / duration, 0, 1)
}
