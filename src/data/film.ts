/**
 * FILMEN
 * ══════
 * Sidan använder rörlig bild på två sätt, och de fungerar tvärtom mot
 * varandra.
 *
 * SKÄRMKLIPPET spelas aldrig av sig självt. Scrollen sätter
 * uppspelningspunkten, så kameran åker in mot bildskärmen exakt så långt
 * och så fort som man drar — och backar ut igen när man drar åt andra
 * hållet.
 *
 * Bildskärmen i klippet är magenta. Den färgen nycklas bort i KeyedVideo,
 * och bakom den finns ingenting — bara sidans egen svarta botten. Skärmen
 * läser alltså som en svart skärm, inte som en färgad platta. Klippet
 * fortsätter sedan av sig självt: skärmen fyller rutan, studions namn och
 * en väntesnurra ligger kvar en stund, och när de tonar ut tonar
 * webbplatsen in i deras ställe.
 *
 * RUMSKLIPPEN rullar tvärtom helt för sig själva, i sin egen takt och
 * mycket långsamt. Scrollen bestämmer bara vilket av dem som visas: en
 * plats i taget, med en övertoning emellan.
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
  /** Samma rulle bildruta för bildruta baklänges — se KeyedVideo. */
  reverse: [
    { src: 'clips/screen-rev.webm', type: 'video/webm' },
    { src: 'clips/screen-rev.mp4', type: 'video/mp4' },
  ],
  /** Klippets längd i sekunder. */
  duration: 4.04,
  /** Klippets proportioner, 1280 × 720. */
  aspect: 16 / 9,
  /** Sekunden skärmens namnskylt börjar tona ut och sidan tona in. */
  handIn: 3.45,
  /** Sekunden sidan tagit över helt. */
  enter: 3.95,
  /**
   * Sekunden utflygningen backar tillbaka till.
   *
   * Materialet har ingen utflygning — kameran backar aldrig ur skärmen av
   * sig själv. Rörelsen finns bara om inflygningen spelas baklänges, och
   * det är vad som händer här.
   */
  exit: 0.2,
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
 * Hur långt man drar för att komma ut igen.
 *
 * Utflygningen får ta längre tid än inflygningen. In vill man snabbt; ut
 * är ögonblicket man lämnar sidan, och det tål att dröja.
 */
export const EXIT_HEIGHTS = 2.6

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
   * Hur klippet är beskuret. Två platser som delar klipp får skilda
   * utsnitt, så att de läser som två vyer och inte som samma bild igen.
   */
  framing: { position: string; scale: number }
}

/** Platserna kameran besöker efter skärmen, med sitt innehåll. */
export const SHOTS: Shot[] = [
  {
    id: 'window', place: 'Mot staden', clip: 'room-a', hold: 2.4,
    framing: { position: '50% 50%', scale: 1 },
  },
  {
    id: 'shelf', place: 'Skrivbordet', clip: 'room-b', hold: 2.7,
    framing: { position: '38% 50%', scale: 1.08 },
  },
  {
    id: 'lamp', place: 'Mot rummet', clip: 'room-a', hold: 2.4,
    framing: { position: '78% 55%', scale: 1.14 },
  },
  {
    id: 'samples', place: 'Arbetsljuset', clip: 'room-b', hold: 2.2,
    framing: { position: '62% 45%', scale: 1 },
  },
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
