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
const STEP_MS = 850
/** Kortaste tid ett steg får ta, hur bråttom man än har. */
const MIN_STEP_MS = 320
/**
 * Inflygningen.
 *
 * Kortare än klippets egen längd — klippet spelas alltså raskare än en
 * gång i sekunden, vilket det tål: kamerarörelsen är gjord med inbromsning
 * och laddningen i slutet behöver bara hinna läsas, inte inväntas.
 */
const ENTRY_MS = 2800
/** Steget ut ur skärmen är en övertoning, och tål att ta lite längre tid. */
const LEAVE_MS = 1500

/** Hur mycket hjul som krävs för att räknas som en dragning. */
const WHEEL_THRESHOLD = 40
/**
 * Så lång tystnad som avslutar en dragning.
 *
 * En enda svepning på en styrplatta ger dussintals hjulhändelser, och räknas
 * varje tröskelpassering för sig läses den som fem dragningar. Händelserna
 * kommer tätt så länge handen är kvar och slutar när den släpper — en paus
 * längre än så här är alltså nästa dragning.
 */
const GESTURE_GAP_MS = 90
/**
 * Vad som skiljer ett hjulhack från en svepning.
 *
 * De två sorternas inmatning måste hanteras olika, och tiden räcker inte
 * för att skilja dem åt: en svepning med tröghet kan pågå längre än en
 * långsam serie hjulhack. Storleken skiljer dem däremot tydligt. Ett hack
 * på ett mushjul kommer som ett enda stort utslag; en styrplatta börjar
 * mjukt och skickar många små.
 *
 * Sorten avgörs på gestens första händelse och gäller sedan hela gesten —
 * en snabb svepning kan nämligen växa till stora utslag på vägen, men den
 * började litet.
 */
const NOTCH_MIN = 45
/**
 * Hur mycket ett utslag ska växa över svansens botten för att räknas som en
 * ny svepning.
 *
 * Trögheten efter en svepning klingar av: utslagen blir mindre och mindre,
 * men de fortsätter komma i nästan en sekund. Utan det här räknas hela den
 * svansen som samma gest, och drar man igen medan den pågår händer
 * ingenting — det är precis då man drar igen.
 *
 * Jämförelsen måste dock gå mot svansens botten och inte mot förra
 * utslaget. En svepning växer nämligen fortfarande när dess första steg
 * går: fingret drar på, utslagen tredubblas mellan händelserna, och varje
 * sådan ökning ser ut som en ny påläggning. En enda snabb flick blev då
 * ett dussin steg. Först när utslagen börjat falla från sin topp finns det
 * en svans att lägga på i.
 */
const NEW_PUSH = 1.8
/** Golv under NEW_PUSH, så att skakningar i en döende svans inte räcker. */
const NEW_PUSH_FLOOR = 6
/** Så långt under toppen utslagen ska ha fallit innan svansen räknas börjad. */
const FALLEN = 0.55
/** Hur långt fingret ska föras för att räknas som en dragning. */
const TOUCH_THRESHOLD = 48
/**
 * Hur många dragningar som får ligga och vänta.
 *
 * En dragning är alltid ett steg — aldrig två, aldrig noll. Drar man igen
 * medan ett steg pågår kastas det inte om till nästa läge, för då skulle
 * det mellanliggande aldrig visas och det ser ut som att sidan hoppar
 * förbi. I stället ställer sig dragningen i kö: det pågående steget snabbas
 * på och nästa tar vid direkt när det är framme. Man passerar alltså varje
 * läge, bara fortare.
 */
const MAX_QUEUE = 3
/** Hur mycket ett pågående steg snabbas på av en ny dragning. */
const HURRY = 0.55

let stations: Station[] = [{ id: 'start', y: 0 }]
let index = 0

let fromY = 0
let toY = 0
let startedAt = 0
let duration = STEP_MS
let linear = false
/** Positionen just nu, i samma skala som den gamla scrollen. */
let position = 0

/** Dragningar som väntar på tur, med tecken för riktningen. */
let queued = 0
let wheelAcc = 0
let wheelAt = 0
/** Sant när den pågående dragningen redan gett sitt steg. */
let wheelSpent = false
/** Sant när gesten kommer från ett mushjul och inte från en styrplatta. */
let wheelNotches = false
/** Största utslaget i den pågående gesten. */
let wheelPeak = 0
/** Minsta utslaget sedan toppen — svansens botten just nu. */
let wheelLow = 0
/** Sant när utslagen fallit tydligt från toppen, alltså när svansen börjat. */
let wheelFell = false
let touchStartY = 0
let touchLocked = false
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

/** Flyttar till en hållplats. `immediate` gör steget utan rörelse. */
export function goTo(next: number, immediate = false) {
  const target = clamp(Math.round(next), 0, stations.length - 1)
  if (target === index && !immediate) return
  const from = index
  index = target
  fromY = position
  toY = stations[index].y
  linear = !immediate && stepTime(from, index) === ENTRY_MS
  // Ju fler som väntar, desto kortare får varje steg vara — men aldrig så
  // kort att läget hinner passera obemärkt.
  const base = immediate ? 0 : stepTime(from, index)
  duration = linear || immediate
    ? base
    : Math.max(base * HURRY ** Math.abs(queued), MIN_STEP_MS)
  startedAt = performance.now()
  if (immediate) position = toY
}

function step(dir: number) {
  const now = performance.now()

  if (!moving(now)) {
    queued = 0
    goTo(index + dir)
    return
  }

  // Inflygningen spelar klart av sig själv; den ska inte gå att jäkta.
  if (linear) return

  // Byter man riktning mitt i faller kön — det man ville var att vända.
  if (queued !== 0 && Math.sign(queued) !== dir) queued = 0
  if (Math.abs(queued) >= MAX_QUEUE) return
  queued += dir

  // Det pågående steget snabbas på utan att bilden hoppar: andelen som
  // spelats hålls konstant medan speltiden kortas.
  const t = clamp((now - startedAt) / duration, 0, 1)
  const next = Math.max(duration * HURRY, MIN_STEP_MS)
  startedAt = now - t * next
  duration = next
}

/** Börjar om formmätningen — ny gest, eller ny påläggning i en gammal. */
function freshGesture(mag: number) {
  wheelPeak = mag
  wheelLow = mag
  wheelFell = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const now = performance.now()

  const mag = Math.abs(e.deltaY)

  // Ny gest så fort hjulet varit tyst en stund. Sorten avgörs här och
  // gäller sedan hela gesten.
  if (now - wheelAt > GESTURE_GAP_MS) {
    wheelAcc = 0
    wheelSpent = false
    wheelNotches = mag >= NOTCH_MIN
    freshGesture(mag)
  }
  wheelAt = now

  // Följ gestens form: hur högt den nådde, och hur långt ned svansen gått
  // sedan dess. Det är de två som skiljer en hand som drar på från en
  // tröghet som klingar av.
  if (mag > wheelPeak) {
    wheelPeak = mag
    wheelLow = mag
  } else if (mag < wheelLow) {
    wheelLow = mag
  }
  if (mag < wheelPeak * FALLEN) wheelFell = true

  // En svepning ger ett steg, hur länge trögheten än fortsätter efteråt —
  // men lägger handen på igen mitt i svansen är det en ny svepning, och den
  // ska räknas. En ny påläggning är ett tydligt uppsving ur svansens botten,
  // inte vilken ökning som helst: under uppdraget växer utslagen också, och
  // den växten är samma svepning.
  const pushedAgain = wheelFell
    && mag > wheelLow * NEW_PUSH + NEW_PUSH_FLOOR
    && mag > wheelPeak * 0.25
  if (wheelSpent && pushedAgain) {
    wheelSpent = false
    wheelAcc = 0
    freshGesture(mag)
  }

  // Ett hjul ger ett steg per hack, för varje hack är en egen handling.
  if (wheelSpent && !wheelNotches) return

  wheelAcc += e.deltaY
  if (Math.abs(wheelAcc) < WHEEL_THRESHOLD) return

  const dir = Math.sign(wheelAcc)
  wheelAcc = 0
  wheelSpent = true
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
  } else {
    const t = clamp((now - startedAt) / duration, 0, 1)
    // Inflygningen går rakt igenom: klippet har sin egen inbromsning
    // inbyggd, och lägger man en till ovanpå blir slutet sirapigt.
    position = fromY + (toY - fromY) * (linear ? t : easeInOutCubic(t))
  }

  // Framme, och någon står på tur: nästa steg tar vid direkt. Läget vi just
  // nådde har alltså hunnit visas, om än kort.
  if (queued !== 0 && !moving(now)) {
    const dir = Math.sign(queued)
    queued -= dir
    goTo(index + dir)
  }

  return position
}

/** Hur långt in i den pågående förflyttningen vi är, 0–1. */
export function progress(now: number) {
  return duration <= 0 ? 1 : clamp((now - startedAt) / duration, 0, 1)
}
