/**
 * FILMEN
 * ══════
 * Sidan använder rörlig bild på två sätt, och de fungerar tvärtom mot
 * varandra.
 *
 * SKÄRMKLIPPET spelas aldrig av sig självt. Scrollen sätter
 * uppspelningspunkten, så kameran åker in mot bildskärmen exakt så långt
 * och så fort som man drar — och backar ut igen när man drar åt andra
 * hållet. Skärmen i klippet är magenta; den färgen nycklas bort i
 * KeyedVideo, och bakom den ligger den riktiga webbplatsen. När kameran
 * åkt hela vägen in och magentan fyller rutan är det alltså sidan man ser.
 *
 * RUMSKLIPPEN rullar tvärtom helt för sig själva, i sin egen takt. Scrollen
 * bestämmer bara vilket av dem som visas: en plats i taget, med en
 * övertoning emellan. En plats som stannar när man slutar scrolla vore ett
 * fotografi, inte ett rum.
 *
 * Tiderna nedan är avlästa ur materialet: magentan täcker en femtedel av
 * rutan vid start, fyller den vid 1,55 s och är borta strax efter.
 */

export const CLIP = {
  /** Samma klipp i två format. Chromium utan patentbelagda kodekar spelar
      inte H.264, och Safari spelar inte VP9 — tillsammans täcker de allt. */
  sources: [
    { src: 'clips/studio.webm', type: 'video/webm' },
    { src: 'clips/studio.mp4', type: 'video/mp4' },
  ],
  /** Skärmklippets längd i sekunder. */
  duration: 1.75,
  /** Klippets proportioner, 1280 × 704. */
  aspect: 1280 / 704,
  /** Sekunden där skärmen fyller rutan och sidan tar över. */
  enter: 1.55,
  /**
   * Sekunden utflygningen backar tillbaka till.
   *
   * Materialet har ingen utflygning — kameran backar aldrig ur skärmen av
   * sig själv. Rörelsen finns bara om inflygningen spelas baklänges, och
   * det är vad som händer här.
   */
  exit: 0.2,
  /** Skärmens färg i klippet. */
  key: [200, 12, 210] as [number, number, number],
} as const

/**
 * Hur många fönsterhöjder man scrollar per sekund skärmklipp.
 * Högre värde = långsammare kamera.
 */
export const SCROLL_PER_SECOND = 1.35

export type Shot = {
  id: string
  place: string
  /** Filnamnet i public/clips, utan ändelse. */
  clip: string
  /** Hur många fönsterhöjder platsen får innan nästa tar över. */
  hold: number
}

/** Platserna kameran besöker efter skärmen, med sitt innehåll. */
export const SHOTS: Shot[] = [
  { id: 'window', place: 'Mot staden', clip: 'room-window', hold: 2.4 },
  { id: 'shelf', place: 'Hyllan', clip: 'room-shelf', hold: 2.7 },
  { id: 'lamp', place: 'Arbetsljuset', clip: 'room-lamp', hold: 2.4 },
  { id: 'samples', place: 'Materialen', clip: 'room-samples', hold: 2.2 },
]

/**
 * Övertoningen mellan två platser, i fönsterhöjder.
 *
 * Kort nog att läsas som ett klipp. Dras den ut blir den ett tillstånd i
 * stället — två rum ovanpå varandra under en fjärdedel av sträckan, vilket
 * ser ut som att två filmer spelas samtidigt snarare än att den ena tar
 * över efter den andra.
 */
export const CROSSFADE = 0.42
