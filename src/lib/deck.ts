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

/**
 * Så länge tar en vanlig förflyttning mellan två grannar.
 *
 * Kort nog att sidan svarar direkt på handen — ett steg som tar närmare en
 * sekund läses som tröghet, inte som lugn, och det är samma sekund varje
 * gång man tar sig någonstans. Långt nog att man ser vad som rör sig.
 */
const STEP_MS = 620
/**
 * Inflygningen.
 *
 * Kortare än klippets egen längd — klippet spelas alltså raskare än en
 * gång i sekunden, vilket det tål: kamerarörelsen är gjord med inbromsning
 * och laddningen i slutet behöver bara hinna läsas, inte inväntas.
 */
const ENTRY_MS = 2800
/** Steget ut ur skärmen är en övertoning, och tål att ta lite längre tid. */
const LEAVE_MS = 1150

/** Hur mycket hjul som krävs för att räknas som en dragning. */
const WHEEL_THRESHOLD = 40
/**
 * Hur trögheten klingar av, uttryckt som halveringstid i millisekunder.
 *
 * Det här är det enda som skiljer en hand från en eftersläng, och det går
 * att räkna på. När fingrarna lämnar plattan fortsätter webbläsaren skicka
 * hjulhändelser i en till två sekunder, med utslag som halveras ungefär var
 * fjärdedels sekund. Kurvan är förutsägbar och den vänder aldrig uppåt.
 *
 * Sidan följer därför med i den kurvan och vet vad trögheten *borde* ge
 * härnäst. Kommer det något betydligt större än så är det en hand.
 */
const TAIL_HALFLIFE = 500
/** Hur mycket över den väntade trögheten ett utslag ska ligga för att räknas. */
const RISE = 1.5
/** Golv under RISE, så att en döende svans inte triggar på ren avrundning. */
const RISE_FLOOR = 5
/**
 * Hur långt under toppen utslagen ska ha fallit innan svansen räknas börjad.
 *
 * Före toppen finns ingen svans att lägga på i — då stiger utslagen för att
 * handen fortfarande drar på, och varje sådan ökning skulle annars läsas som
 * en ny svepning. En enda hård flick blev då tre steg.
 */
const FALLEN = 0.7
/**
 * Så lång tystnad som avslutar en dragning.
 *
 * En enda svepning på en styrplatta ger dussintals hjulhändelser, och räknas
 * varje tröskelpassering för sig läses den som fem dragningar. Händelserna
 * kommer tätt så länge handen är kvar och slutar när den släpper — en paus
 * längre än så här är alltså nästa dragning.
 *
 * Rundligt tilltaget. En styrplatta skickar sextio till hundratjugo
 * händelser i sekunden och kommer aldrig i närheten av gränsen mitt i en
 * gest; en hand som lägger om gör en betydligt längre paus än så.
 */
const GESTURE_GAP_MS = 140
/** Hur långt fingret ska föras för att räknas som en dragning. */
const TOUCH_THRESHOLD = 48
/**
 * Hur många dragningar som får ligga och vänta.
 *
 * En dragning är alltid ett steg — aldrig två, aldrig noll. Drar man igen
 * medan ett steg pågår kastas det inte om till nästa läge, för då skulle
 * det mellanliggande aldrig visas och det ser ut som att sidan hoppar
 * förbi. I stället ställer sig dragningen i kö och tar vid när den
 * pågående är framme.
 *
 * Bara en får vänta. Med tre i kö kunde tre lägen passera på drygt en
 * sekund, och hur riktigt det än var — tre dragningar, tre steg — såg det
 * ut som att sidan skenade.
 */
const MAX_QUEUE = 2
/**
 * Så länge efter en landning innan nästa steg får börja.
 *
 * Varje läge ska vara ett eget parti, inte en punkt man far förbi. Utan
 * pausen kan steg följa på steg tätt nog att resan läses som en enda lång
 * rörelse, och då hjälper det inte att räkningen är riktig.
 */
const SETTLE_MS = 140

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
/** Största utslaget i den pågående gesten. */
let wheelPeak = 0
/** Sant när utslagen fallit från toppen, alltså när svansen börjat. */
let wheelFell = false
/** Var trögheten borde ligga just nu. Bara nedåt — aldrig uppåt. */
let wheelEnv = 0
/** När den senaste förflyttningen landade, för pausen mellan partierna. */
let landedAt = 0
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
  // Varje steg tar sin fulla tid, också när fler står på tur. Kortades de
  // ned när kön växte flöt de ihop till en enda rörelse, och då spelade det
  // ingen roll att antalet steg var riktigt — det såg ut som ett skutt.
  duration = immediate ? 0 : stepTime(from, index)
  startedAt = performance.now()
  if (immediate) position = toY
}

function step(dir: number) {
  const now = performance.now()

  // Står sidan stilla och har hunnit vila: gå direkt.
  if (!moving(now) && now - landedAt >= SETTLE_MS) {
    queued = 0
    goTo(index + dir)
    return
  }

  // Inflygningen spelar klart av sig själv; den ska inte gå att jäkta.
  if (linear) return

  // Annars ställer sig dragningen i kö — antingen för att ett steg pågår,
  // eller för att det just landat och partiet ska få stå kvar ett ögonblick.
  // Kön ska läggas till, inte skrivas över: två hjulhack i rad medan sidan
  // vilar är två handlingar och ska bli två steg.
  if (queued !== 0 && Math.sign(queued) !== dir) queued = 0
  if (Math.abs(queued) >= MAX_QUEUE) return
  queued += dir
}

/** Börjar om mätningen — ny gest, eller en hand som lagt på i svansen. */
function freshGesture(mag: number) {
  wheelAcc = 0
  wheelSpent = false
  wheelPeak = mag
  wheelFell = false
  wheelEnv = 0
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  // Händelsens egen tid, inte den tid koden råkar köra på.
  //
  // Gestgränsen är en tystnad: kommer inget hjul på en stund är nästa
  // händelse en ny gest. Men en bildruta som tar för lång tid ger också
  // tystnad — hjulet fortsätter komma medan huvudtråden är upptagen, och
  // händelserna körs alla på en gång när den blir fri. Mätt på klockan i
  // hanteraren såg det ut som en paus mitt i svepningen, och en enda
  // svepning blev två gester och därmed två steg. Det var det som fick
  // sidan att hoppa dubbelt just där den hackade.
  //
  // Tidsstämpeln sätts när webbläsaren skapar händelsen, alltså innan kön.
  // Den visar mellanrummen som handen faktiskt gjorde dem. Samma nollpunkt
  // som performance.now(), så de går att jämföra med varandra.
  const now = e.timeStamp || performance.now()

  const mag = Math.abs(e.deltaY)
  const since = now - wheelAt
  wheelAt = now

  // Ny gest så fort hjulet varit tyst en stund.
  if (since > GESTURE_GAP_MS) freshGesture(mag)

  if (!wheelFell) {
    // Före svansen: följ med uppåt. Så länge utslagen växer drar handen
    // fortfarande på, och det är samma svepning hur mycket den än växer.
    if (mag > wheelPeak) wheelPeak = mag
    if (wheelSpent && mag < wheelPeak * FALLEN) {
      wheelFell = true
      wheelEnv = mag
    }
  } else {
    // I svansen: kurvan går bara nedåt, och den vet vi hur den ser ut.
    // Kommer något betydligt över den är det en hand som lagt på igen.
    //
    // Kurvan får inte följa med uppåt här. Gjorde den det skulle en ny
    // svepning aldrig hinna över sin egen kurva — den stiger mjukt, och
    // kurvan steg med den. Sidan blev stendöv i just den sekund då man
    // faktiskt drar igen, vilket är precis då man gör det.
    const expected = wheelEnv * Math.pow(0.5, since / TAIL_HALFLIFE)
    if (mag > expected * RISE + RISE_FLOOR) {
      freshGesture(mag)
    } else {
      wheelEnv = expected
    }
  }

  // En gest ger ett steg. En eftersläng ger inget.
  if (wheelSpent) return

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

  // Framme: notera när, så att nästa steg kan hålla sin paus.
  if (!moving(now)) {
    if (landedAt < startedAt) landedAt = startedAt + duration

    // Någon står på tur. Steget tar vid när pausen är över, så att läget vi
    // just nådde hinner läsas som ett eget parti.
    if (queued !== 0 && now - landedAt >= SETTLE_MS) {
      const dir = Math.sign(queued)
      queued -= dir
      goTo(index + dir)
    }
  }

  return position
}

/** Hur långt in i den pågående förflyttningen vi är, 0–1. */
export function progress(now: number) {
  return duration <= 0 ? 1 : clamp((now - startedAt) / duration, 0, 1)
}
