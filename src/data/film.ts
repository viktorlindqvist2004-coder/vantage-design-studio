/**
 * KAMERARESAN
 * ═══════════
 * Efter att kameran backat ut ur bildskärmen fortsätter den genom studion.
 * Varje tagning nedan är en plats i rummet, och varje plats bär en del av
 * webbplatsen. Kameran står aldrig still: den glider från `from` till `to`
 * medan man scrollar, och tagningarna korstonas i varandra så att det läser
 * som en enda lång tagning i stället för klipp.
 *
 * `x` och `y` är den punkt i bilden kameran tittar på (0–1). `scale` är hur
 * nära den står. Skillnaden mellan `from` och `to` är alltså själva
 * kamerarörelsen — panorering, åkning eller båda.
 */

export type CameraMark = {
  /** Punkt i bilden som hamnar mitt i rutan. */
  x: number
  y: number
  /** 1 = bilden täcker rutan precis. Högre värde = närmare. */
  scale: number
}

export type Shot = {
  id: string
  /** Bild under `public/`. */
  plate: string
  /** Kort etikett som visas medan tagningen spelar. */
  place: string
  from: CameraMark
  to: CameraMark
  /** Tagningens längd i fönsterhöjder. */
  length: number
}

export const SHOTS: Shot[] = [
  {
    id: 'window',
    plate: 'images/room-window.jpg',
    place: 'Mot staden',
    // Kameran svänger vänsterut längs fönstren och backar samtidigt något.
    from: { x: 0.66, y: 0.52, scale: 1.34 },
    to: { x: 0.36, y: 0.48, scale: 1.08 },
    length: 3.4,
  },
  {
    id: 'shelf',
    plate: 'images/room-shelf.jpg',
    place: 'Hyllan',
    // Långsam åkning in mot böckerna och den upplysta mellanhyllan.
    from: { x: 0.38, y: 0.44, scale: 1.06 },
    to: { x: 0.58, y: 0.54, scale: 1.32 },
    length: 3.8,
  },
  {
    id: 'samples',
    plate: 'images/room-samples.jpg',
    place: 'Materialen',
    // Nära på färgproverna, drar sedan tillbaka mot staden i fönstret.
    from: { x: 0.3, y: 0.62, scale: 1.42 },
    to: { x: 0.56, y: 0.5, scale: 1.05 },
    length: 3.4,
  },
  {
    id: 'lamp',
    plate: 'images/room-lamp.jpg',
    place: 'Studion',
    // Lugn avslutning: kameran lyfter mot lampan och stannar i mörkret.
    from: { x: 0.5, y: 0.58, scale: 1.2 },
    to: { x: 0.5, y: 0.4, scale: 1.02 },
    length: 3.6,
  },
]

/** Hur stor del av en tagning som används till att tona in nästa. */
export const CROSSFADE = 0.26
