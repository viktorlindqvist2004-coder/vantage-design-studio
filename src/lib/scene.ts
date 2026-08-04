import { clamp } from './math'
import { PHOTO, type PhotoScreen } from '../data/scene-photo'

/**
 * KAMERAN
 * ───────
 * Scenen är två plan på olika avstånd från kameran:
 *
 *   • RUMMET — fotografiet, närmast. Där bildskärmen sitter är planet
 *              genomskinligt, som en öppning i en vägg.
 *   • SIDAN  — webbplatsen, längre bort, bakom öppningen.
 *
 * Ett plan på avståndet `d` skalas med `d / (d - t)` när kameran flyttat sig
 * `t` framåt. Eftersom rummet ligger närmare växer det snabbare än sidan
 * bakom — man ser mer och mer av sidan genom en allt större öppning, och
 * ramen sveper till slut förbi kameran.
 *
 * Det är hela poängen. Skalas båda planen lika mycket — som ett vanligt foto
 * som zoomas — får ögat inga djupledsledtrådar, och rörelsen läses som en
 * inzoomning i stället för som en förflyttning framåt.
 */

/**
 * Hur mycket bredare än fönstret scenen som mest får bli.
 *
 * Fotot är liggande och ett mobilfönster är stående. Rak cover-beskärning
 * skulle då visa en så smal remsa av bilden att bildskärmen blir nästan lika
 * bred som rutan — rummet försvinner och kvar blir en stor svart fyrkant.
 * Med taket här beskärs bilden måttligt och ytorna över och under fylls i
 * stället av en suddad kopia.
 */
export const MAX_OVERSCAN = 2

/** Avstånd till rumsplanet. Godtyckligt; allt annat räknas relativt det. */
export const ROOM_DEPTH = 1

/**
 * Avstånd till sidan bakom öppningen. Större värde ger tydligare djup, men
 * också mer av sidan synlig redan på håll.
 */
export const CONTENT_DEPTH = 1.55

export type Camera = {
  stageW: number
  stageH: number
  /** Öppningens storlek i px när kameran står stilla. */
  screenW: number
  screenH: number
  /** Kamerans läge när öppningen precis täcker fönstret. */
  travel: number
  /** Förflyttning som centrerar öppningen i fönstret. */
  dx: number
  dy: number
  /** Transform-origin i px, relativt scenens låda. */
  originX: number
  originY: number
  vw: number
  vh: number
}

export function computeCamera(
  vw: number,
  vh: number,
  aspect: number = PHOTO.aspect,
  screen: PhotoScreen = PHOTO.screen,
): Camera {
  // Cover, men aldrig så hårt beskuren att rummet försvinner.
  const stageW = Math.min(Math.max(vw, vh * aspect), vw * MAX_OVERSCAN)
  const stageH = stageW / aspect

  const screenW = stageW * screen.w
  const screenH = stageH * screen.h

  // Så mycket måste öppningen växa för att täcka fönstret.
  const coverScale = Math.max(vw / screenW, vh / screenH)

  const stageLeft = (vw - stageW) / 2
  const stageTop = (vh - stageH) / 2

  const originX = (screen.x + screen.w / 2) * stageW
  const originY = (screen.y + screen.h / 2) * stageH

  const dx = vw / 2 - (stageLeft + originX)
  const dy = vh / 2 - (stageTop + originY)

  // ROOM_DEPTH / (ROOM_DEPTH - travel) = coverScale
  const travel = ROOM_DEPTH * (1 - 1 / coverScale)

  return { stageW, stageH, screenW, screenH, travel, dx, dy, originX, originY, vw, vh }
}

/** Rummets skala vid kameraläget `t`. */
export const roomScale = (t: number) =>
  ROOM_DEPTH / Math.max(ROOM_DEPTH - t, 0.0001)

/**
 * Sidans skala vid kameraläget `t`, normaliserad så att den landar på exakt 1
 * när kameran är hela vägen inne — då ligger sidan i 1:1 och texten är lika
 * skarp som på vilken vanlig webbsida som helst.
 */
export function contentScale(t: number, cam: Camera) {
  const natural =
    (CONTENT_DEPTH - cam.travel) / Math.max(CONTENT_DEPTH - t, 0.0001)

  // Sidan måste alltid fylla det som faktiskt syns av öppningen, annars
  // blottas en tunn rand bakgrund längs kanterna strax innan man är inne.
  // Öppningens delar utanför fönstret spelar ingen roll.
  const hole = roomScale(t)
  const needW = Math.min(hole * cam.screenW, cam.vw) / cam.vw
  const needH = Math.min(hole * cam.screenH, cam.vh) / cam.vh

  return Math.max(natural, needW, needH)
}

/**
 * "Insidan" — 0 vid skrivbordet, 1 när sidan fyller fönstret.
 * Under akt 3 backar samma värde tillbaka mot 0.
 */
export function insideness(act1: number, act3: number, ease: (t: number) => number) {
  return clamp(ease(act1) * (1 - ease(act3)), 0, 1)
}
