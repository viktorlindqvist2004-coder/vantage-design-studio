/**
 * FILMEN
 * ══════
 * Sidan använder rörlig bild på två sätt, och de fungerar tvärtom mot
 * varandra.
 *
 * SKÄRMKLIPPET spelas alltid framlänges, från början. En dragning startar
 * det, och sedan rullar det klart av sig självt. Går man tillbaka spolas
 * det inte baklänges — det ställs om till sin första bildruta och står
 * still där tills man går in igen.
 *
 * Bildskärmen i klippet är magenta. Den färgen nycklas bort i KeyedVideo,
 * och bakom den finns ingenting — bara sidans egen svarta botten. Skärmen
 * läser alltså som en svart skärm, inte som en färgad platta. Klippet
 * fortsätter sedan av sig självt: skärmen fyller rutan, studions namn och
 * en väntesnurra ligger kvar en stund, och när de tonar ut tonar
 * webbplatsen in i deras ställe.
 *
 * RUMSKLIPPEN rullar tvärtom helt för sig själva, i sin egen takt och
 * mycket långsamt. De börjar om från början varje varv. Scrollen bestämmer
 * bara vilket av dem som visas: en plats i taget, med en övertoning
 * emellan.
 *
 * Tiderna nedan är avlästa ur materialet.
 */

export const CLIP = {
  /** Samma klipp i två format. Chromium utan patentbelagda kodekar spelar
      inte H.264, och Safari spelar inte VP9 — tillsammans täcker de allt. */
  sources: [
    { src: 'clips/screen.webm', type: 'video/webm' },
    { src: 'clips/screen.mp4', type: 'video/mp4' },
  ],
  /** Klippets längd i sekunder. */
  duration: 4.04,
  /** Klippets proportioner, 1280 × 720. */
  aspect: 16 / 9,
  /** Sekunden skärmens namnskylt börjar tona ut och sidan tona in. */
  handIn: 3.45,
  /** Sekunden sidan tagit över helt. */
  enter: 3.95,
  /** Skärmens färg i klippet. */
  key: [237, 0, 238] as [number, number, number],
} as const

/**
 * Hur långt man drar för att komma in i skärmen, i fönsterhöjder.
 *
 * Drygt två skärmfullar. Kort nog att man är inne efter ett par dragningar,
 * långt nog att åkningen hinner läsas som en åkning — man ska se kameran
 * närma sig och skärmen ladda, inte upptäcka att man plötsligt är framme.
 */
export const APPROACH_HEIGHTS = 2.3

/**
 * Hur fort rumsklippen spelas.
 *
 * De rör sig redan nästan omärkligt i sitt eget material. Halva takten gör
 * dem nästan till stillbilder utan att bildrutorna börjar stå still för
 * ögat — förflyttningen mellan två bildrutor är mindre än en bildpunkt
 * ändå, så det finns inget steg att se.
 */
export const ROOM_RATE = 0.5

export type Shot = {
  id: string
  place: string
  /** Filnamnet i public/clips, utan ändelse. */
  clip: string
  /** Hur många fönsterhöjder platsen får innan nästa tar över. */
  hold: number
  /**
   * Hur många lägen platsen har.
   *
   * De flesta platser är en enda vy och har ett läge. Processen är fem steg
   * som ska gå att stanna på var för sig — annars passerar man alla fem på
   * en dragning och hinner bara läsa ett. En plats med flera lägen behöver
   * också mer sträcka, så att lägena får plats mellan övertoningarna.
   */
  steps: number
  /**
   * Hur klippet är beskuret. Två platser som delar klipp får skilda
   * utsnitt, så att de läser som två vyer och inte som samma bild igen.
   */
  framing: { position: string; scale: number }
}

/** Platserna kameran besöker efter skärmen, med sitt innehåll. */
export const SHOTS: Shot[] = [
  {
    id: 'window', place: 'Mot staden', clip: 'room-a', hold: 2.6, steps: 1,
    framing: { position: '50% 50%', scale: 1 },
  },
  {
    id: 'shelf', place: 'Skrivbordet', clip: 'room-b', hold: 6.5, steps: 5,
    framing: { position: '38% 50%', scale: 1.08 },
  },
  {
    id: 'lamp', place: 'Mot rummet', clip: 'room-a', hold: 2.6, steps: 1,
    framing: { position: '78% 55%', scale: 1.14 },
  },
  {
    id: 'samples', place: 'Arbetsljuset', clip: 'room-c', hold: 2.6, steps: 1,
    framing: { position: '50% 45%', scale: 1 },
  },
]

/**
 * Övertoningen mellan två platser, i fönsterhöjder.
 *
 * Den mäts i sträcka, men det är tid den ska motsvara: förflyttningen mellan
 * två lägen tar en knapp sekund, och övertoningen ska fylla den. Är den för
 * kort hinner den undan på ett par tiondelar mitt i steget och läses som ett
 * hårt klipp; är den för lång ligger två rum ovanpå varandra även när man
 * står stilla. Den här bredden täcker det mesta av ett steg utan att nå fram
 * till lägena i vardera änden.
 */
export const CROSSFADE = 1.7
