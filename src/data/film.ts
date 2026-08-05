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

import { clamp01, lerp } from '../lib/math'

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
 * När skärmen i klippet tänder, i klippets egna sekunder.
 *
 * Skärmen står mörk medan kameran börjar närma sig, slår upp en bit in i
 * åkningen och lägger sig sedan på ett svagt bakgrundsljus. Tändningen är
 * över i god tid innan klippets eget slutskede, så att de två inte krockar,
 * och glöden lämnas över till sidan på samma sekunder som sidan tonas in.
 *
 * Det som gör att det läses som en skärm och inte som en animation är att
 * tiderna hör till klippet: drar man långsamt tänder skärmen långsamt, för
 * det är kamerarörelsen man styr.
 */
export const BOOT = {
  from: 0.55,
  to: 1.75,
  out: [CLIP.handIn, CLIP.enter] as [number, number],
}

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
   * Hur klippet är beskuret, i procent av bildrutan. Två platser som delar
   * klipp får skilda utsnitt, så att de läser som två vyer och inte som
   * samma bild igen.
   *
   * Siffrorna är valda för ett liggande fönster, där det finns bredd över
   * att flytta utsnittet i. På en stående telefon finns den bredden inte —
   * se `roomFraming` nedan.
   */
  framing: { x: number; y: number; scale: number }
}

/** Platserna kameran besöker efter skärmen, med sitt innehåll. */
export const SHOTS: Shot[] = [
  {
    id: 'window', place: 'Mot staden', clip: 'room-a', hold: 2.6, steps: 1,
    framing: { x: 50, y: 50, scale: 1 },
  },
  {
    id: 'shelf', place: 'Skrivbordet', clip: 'room-b', hold: 6.5, steps: 5,
    framing: { x: 38, y: 50, scale: 1.08 },
  },
  {
    // Samtalet. Klippet är två gestalter mitt emot varandra i tomrummet —
    // platsen finns för det klippet, inte tvärtom. Utsnittet är orört och
    // förstoringen är ett, för de två sitter mitt i bild och ska stanna
    // där: det är dem sidan handlar om här.
    id: 'dialog', place: 'Samtalet', clip: 'room-d', hold: 3.4, steps: 1,
    framing: { x: 50, y: 50, scale: 1 },
  },
  {
    id: 'lamp', place: 'Mot rummet', clip: 'room-a', hold: 2.6, steps: 1,
    framing: { x: 78, y: 55, scale: 1.14 },
  },
  {
    id: 'samples', place: 'Arbetsljuset', clip: 'room-c', hold: 2.6, steps: 1,
    framing: { x: 50, y: 45, scale: 1 },
  },
]

/**
 * Utsnittet anpassat efter fönstret.
 *
 * Klippen är liggande och fyller alltid rutan. I ett liggande fönster går
 * nästan hela bredden åt, och då finns det plats att flytta utsnittet i
 * sidled — det är så två platser kan dela klipp utan att se likadana ut.
 *
 * På en stående telefon är det tvärtom: höjden fyller, och bara en dryg
 * fjärdedel av klippets bredd får plats. Då kostar varje procent åt sidan
 * en procent av det lilla som syns, och motivet hamnar utanför rutan — kvar
 * blir en fönsterkarm eller en suddig bakgrund. Utsnitten dras därför mot
 * mitten ju smalare fönstret blir.
 *
 * Men två platser delar klipp, och skillnaden mellan dem satt just i
 * sidledsflytten. Dras båda till mitten blir de samma bild, och övertoningen
 * mellan dem läser som en dubbelexponering i stället för ett klipp. Därför
 * tar djupet över där bredden tar slut: skillnaden i förstoring växer när
 * fönstret smalnar, så att platserna skiljs åt av hur nära man står i
 * stället för av åt vilket håll man tittar. Det senare finns det inte plats
 * för på en telefon; det förra fungerar i vilken form som helst.
 */
export function roomFraming(shot: Shot, vw: number, vh: number) {
  const narrow = clamp01((1.15 - vw / vh) / 0.55)
  return {
    x: lerp(shot.framing.x, 50, narrow),
    y: lerp(shot.framing.y, 50, narrow),
    scale: 1 + (shot.framing.scale - 1) * lerp(1, 1.6, narrow),
  }
}

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

/**
 * Hur långt in i rumsresan webbplatsen är helt borta, i fönsterhöjder.
 *
 * Kortare än övertoningen mellan två rum, och det med flit. Skärmklippet
 * och rummet får korsa varandra i lugn och ro, men sidan måste vara borta
 * innan man står på första platsen — annars läser man om vad vi bygger
 * genom texten om vad vi gör.
 */
export const PAGE_OUT = 0.5
