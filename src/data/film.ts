/**
 * FILMEN
 * ══════
 * Hela sidan ligger på ett enda klipp: kameran åker in i bildskärmen, ut i
 * rummet, förbi fönstret, hyllan, lampan och till sist skrivbordet igen.
 * Klippet spelas aldrig av sig självt — scrollen sätter uppspelningspunkten,
 * så kameran rör sig exakt så långt och så fort som man drar.
 *
 * Skärmen i klippet är magenta. Den färgen nycklas bort i KeyedVideo, och
 * bakom den ligger den riktiga webbplatsen. När kameran åkt hela vägen in
 * och magentan fyller rutan är det alltså sidan man ser.
 *
 * Tiderna nedan är avlästa ur klippet: magentan täcker 5 % av rutan vid
 * start, 98 % vid 1,4 s, hela rutan vid 1,5 s och är borta vid 1,7 s.
 */

export const CLIP = {
  /** Samma klipp i två format. Chromium utan patentbelagda kodekar spelar
      inte H.264, och Safari spelar inte VP9 — tillsammans täcker de allt. */
  sources: [
    { src: 'clips/studio.webm', type: 'video/webm' },
    { src: 'clips/studio.mp4', type: 'video/mp4' },
  ],
  /** Klippets längd i sekunder. */
  duration: 9.04,
  /** Klippets proportioner, 1280 × 704. */
  aspect: 1280 / 704,
  /** Sekunden där skärmen fyller rutan och sidan tar över. */
  enter: 1.55,
  /**
   * Sekunden utflygningen backar tillbaka till.
   *
   * Klippet klipper rakt från den fyllda skärmen till rummet — kameran
   * backar aldrig ut av sig själv. Utflygningen görs därför genom att
   * spela inflygningen baklänges hit: skrivbordet och skärmen kommer
   * tillbaka, sidan krymper ned på skärmen igen, och först därefter
   * klipps rumsresan in.
   */
  exit: 0.5,
  /** Sekunden rummet börjar — första bildrutan efter klippet i materialet. */
  room: 1.62,
  /** Skärmens färg i klippet. */
  key: [200, 12, 210] as [number, number, number],
} as const

/**
 * Hur många fönsterhöjder man scrollar per sekund film.
 * Högre värde = långsammare kamera.
 */
export const SCROLL_PER_SECOND = 1.35

export type Shot = {
  id: string
  place: string
  /** Tidsintervall i klippet, i sekunder. */
  from: number
  to: number
}

/** Platserna kameran passerar efter skärmen, med sitt innehåll. */
export const SHOTS: Shot[] = [
  { id: 'window', place: 'Mot staden', from: 1.9, to: 3.2 },
  { id: 'shelf', place: 'Hyllan', from: 3.4, to: 5.4 },
  { id: 'lamp', place: 'Arbetsljuset', from: 5.8, to: 7.5 },
  { id: 'samples', place: 'Materialen', from: 7.7, to: 9.04 },
]
