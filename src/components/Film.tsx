import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { KeyedVideo } from './KeyedVideo'
import { useFrame, useViewport } from '../lib/hooks'
import { clamp01, lerp, mapRange } from '../lib/math'
import { APPROACH_HEIGHTS, BOOT, CLIP, CROSSFADE, PAGE_OUT, SHOTS } from '../data/film'
import { RoomFilm } from './RoomFilm'
import { About, Dialogue, Services } from './inner/Sections'
import { Process } from './inner/Process'
import { Contact } from './Plates'
import type { Frame } from '../lib/scroll'

/** En plats sträcka, uttryckt i samma skala som resten av rörelsen. */
export type ShotRange = {
  start: number
  length: number
  /** Hur många lägen platsen har. */
  steps: number
  /** Hur stor del av vardera änden som är övertoning och inte går att stanna i. */
  margin: number
}

/**
 * Platsernas sträckor, i ordning och kant i kant.
 *
 * Både hållplatserna och innehållet räknas ur den här listan, så den finns
 * på ett ställe: räknades de var för sig skulle ett läge kunna hamna någon
 * procent vid sidan om det innehållet tror är mitten.
 */
export function shotRanges(vh: number) {
  const map: Record<string, ShotRange> = {}
  let at = 0
  for (const s of SHOTS) {
    const length = s.hold * vh
    const margin = s.steps === 1 ? 0 : (CROSSFADE * vh) / 2 / length + 0.06
    map[s.id] = { start: at, length, steps: s.steps, margin }
    at += length
  }
  return map
}

/** Var ett av platsens lägen ligger. */
export function stationY(range: ShotRange, i: number) {
  const p = range.steps === 1
    ? 0.5
    : range.margin + ((1 - range.margin * 2) * i) / (range.steps - 1)
  return range.start + range.length * p
}

const ShotRangeContext = createContext<ShotRange | null>(null)
export const useShotRange = () => useContext(ShotRangeContext)

/** Scrollsträckan för inflygningen fram till skärmen. */
export const approachLength = (vh: number) => APPROACH_HEIGHTS * vh

/**
 * Scrollsträckan för resan genom rummet.
 *
 * Den räknas inte i filmsekunder, för rumsklippen rullar i sin egen takt.
 * Varje plats får den sträcka den behöver för sitt innehåll.
 */
export const roomLength = (vh: number) =>
  SHOTS.reduce((sum, s) => sum + s.hold, 0) * vh

/**
 * Klippets ram i fönstret.
 *
 * På en liggande skärm ryms hela bildrutan, och då visas hela bildrutan.
 * På en stående telefon gör den inte det: en 16:9-ruta i fönstrets bredd
 * blir en remsa på ett par hundra pixlar mitt i rutan. Där fyller filmen
 * i stället höjden och beskärs i sidled — rummet syns, om än en smalare
 * del av det.
 *
 * Sidan har ingen egen ram längre. Den satt förr på bildskärmen i klippet
 * och måste följa den bildruta för bildruta; nu tonar den i stället in
 * över den svarta skärmen när klippets namnskylt tonar ut, och kan då lika
 * gärna fylla fönstret som vilken sida som helst.
 */
export function frameSize(vw: number, vh: number) {
  const contain = Math.min(vw, vh * CLIP.aspect)
  const cover = Math.max(vw, vh * CLIP.aspect)
  const portrait = vh > vw
  const w = portrait ? cover : contain
  return {
    w,
    h: w / CLIP.aspect,
    /**
     * Hur mycket rutan ska krympas för att hela bildrutan ska synas.
     *
     * På en stående telefon fyller filmen höjden och beskärs i sidled, för
     * annars vore rummet en remsa mitt i rutan. Men klippet slutar med
     * studions namn skrivet tvärs över bilden, och den texten går inte att
     * beskära — då står det "ntage Design Stu". Rutan krymper därför till
     * hela bildrutan medan skärmen tar över; vid det laget är kanterna
     * svarta åt alla håll, så omramningen syns inte.
     */
    fitScale: portrait ? contain / cover : 1,
  }
}

/**
 * Varje tagning bär ett stycke av sidan. En tagning är exakt en fönsterhöjd
 * hög och rullar inte — det som ligger här måste alltså rymmas i rutan.
 * Siffrorna hör därför hemma inne i skärmen, inte ute i rummet.
 */
const SECTIONS: Record<string, ReactNode> = {
  window: <Services />,
  shelf: <Process />,
  dialog: <Dialogue />,
  lamp: <About />,
  samples: <Contact variant="film" />,
}

/**
 * Vilken sekund i skärmklippet vi står på just nu.
 *
 * Två skeden: kameran åker in mot skärmen, och sedan står klippet stilla
 * vid sitt slut medan sidan rullar. Går man tillbaka mot början följer
 * klippet med dit — men det spelas aldrig baklänges, det ställs om.
 * Vägen ut ur skärmen är ingen kamerarörelse längre utan en övertoning:
 * sidan lämnar, rummet träder fram.
 */
function clipSecond(f: Frame) {
  return f.act1 * CLIP.enter
}

/**
 * Hur framme webbplatsen är, 0–1.
 *
 * Klippet slutar med att skärmen står svart med studions namn och en
 * väntesnurra, som tonar ut. Sidan tonar in i deras ställe — samma
 * ögonblick, motsatt riktning — så att laddningen i filmen övergår i den
 * riktiga sidan utan att något klipps.
 */
function pageIn(second: number) {
  return mapRange(second, CLIP.handIn, CLIP.enter)
}

const clipProgress = (f: Frame) => clipSecond(f) / CLIP.duration

export function Film({ page, onFail, onReady }: {
  page: ReactNode
  onFail?: () => void
  /** Anropas när klippets första bildruta finns att visa. */
  onReady?: () => void
}) {
  const { vw, vh } = useViewport()

  const { w: frameW, h: frameH, fitScale } = frameSize(vw, vh)
  const pageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  /** Sekunden som faktiskt ligger på duken — skrivs av KeyedVideo. */
  const shown = useRef(0)

  // Platserna ligger kant i kant längs rumsresan; den enas slut är den
  // andras början, så övertoningen mellan dem blir en korsning.
  const ranges = useMemo(() => shotRanges(vh), [vh])

  useFrame((f) => {
    // Skärmklippet lämnar över till rummet med en övertoning. Skrivbordet
    // ligger kvar under den första platsen medan den träder fram, så
    // övergången blir en korsning och inte ett hopp.
    const handover = mapRange(f.film, 0, CROSSFADE * f.vh)
    if (frameRef.current) {
      frameRef.current.style.opacity = (1 - handover).toFixed(3)
      frameRef.current.style.visibility = handover >= 1 ? 'hidden' : 'visible'
      // Omramningen sker medan skärmen fyller rutan — se fitScale ovan.
      const fit = lerp(1, fitScale, mapRange(shown.current, 1.45, 2.15))
      frameRef.current.style.transform =
        `translate(-50%, -50%) scale(${fit.toFixed(4)})`
    }

    // Sidan tonar in när klippets namnskylt tonar ut, och lämnar snabbt när
    // rummet tar vid — snabbare än skärmklippet, som får korsa i lugn och ro. Opaciteten, inte `visibility`: sidans egna
    // lager sätter sin synlighet själva, och ett barn som säger `visible`
    // slår ut en förälder som säger `hidden`. Genomskinlighet går inte att
    // ta tillbaka underifrån.
    //
    // Måttet tas ur den bildruta som ligger på duken, inte ur den scrollen
    // ber om — klippet ligger nästan alltid någon hundradel efter, och
    // tonar sidan in före bilden syns skarven.
    if (pageRef.current) {
      const o = pageIn(shown.current) * (1 - mapRange(f.film, 0, PAGE_OUT * f.vh))
      pageRef.current.style.opacity = o.toFixed(3)
      pageRef.current.style.visibility = o <= 0.002 ? 'hidden' : 'visible'
    }

    // Scrimmen finns för texten ute i rummet. Medan skärmen är motivet
    // skulle den bara lägga en grå hinna över sidan.
    if (scrimRef.current) {
      const atScreen = mapRange(f.act1, 0.55, 0.95) * (1 - handover)
      scrimRef.current.style.opacity = (1 - atScreen).toFixed(3)
    }

  })

  return (
    <div className="film">
      {/* Rummet ligger underst och rullar för sig självt. */}
      <RoomFilm ranges={ranges} />

      {/* Webbplatsen. Den fyller fönstret och tonar in över den svarta
          skärmen — den ligger inte längre på bildskärmen i klippet. */}
      <div className="film__page" ref={pageRef}>{page}</div>

      <div
        className="film__frame"
        ref={frameRef}
        style={{ width: `${frameW}px`, height: `${frameH}px` }}
      >
        <KeyedVideo
          className="film__video"
          sources={CLIP.sources.map((s) => ({
            src: `${import.meta.env.BASE_URL}${s.src}`,
            type: s.type,
          }))}
          keyColor={CLIP.key}
          progress={clipProgress}
          boot={BOOT}
          onReady={onReady}
          onFail={onFail}
          timeRef={shown}
        />
      </div>

      <div className="film__scrim" ref={scrimRef} />

      {SHOTS.map((shot, i) => (
        <ShotStage
          key={shot.id}
          id={shot.id}
          range={ranges[shot.id]}
          last={i === SHOTS.length - 1}
        >
          {SECTIONS[shot.id]}
        </ShotStage>
      ))}
    </div>
  )
}

/** Innehållet som hör till en plats, med sitt eget spår att animera mot. */
function ShotStage({
  id,
  range,
  last = false,
  children,
}: {
  id: string
  range: ShotRange
  /** Sista tagningen bär kontaktuppgifterna och ska stanna kvar. */
  last?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    const el = ref.current
    if (!el) return
    const p = clamp01((f.film - range.start) / range.length)
    // Texten kommer in tidigt och lämnar innan kameran nått fram, så att
    // rummet får ett ögonblick för sig själv mellan platserna.
    const inn = mapRange(p, 0.02, 0.14)
    const out = last ? 0 : mapRange(p, 0.86, 0.99)
    const o = inn * (1 - out)
    el.style.opacity = o.toFixed(3)
    el.style.visibility = o <= 0.005 ? 'hidden' : 'visible'
    el.style.transform = `translate3d(0, ${((1 - inn) * 30 - out * 24).toFixed(1)}px, 0)`
  })

  return (
    <ShotRangeContext.Provider value={range}>
      <div className={`film__stage film__stage--${id}`} ref={ref}>
        {children}
      </div>
    </ShotRangeContext.Provider>
  )
}
