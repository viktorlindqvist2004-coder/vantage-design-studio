#!/usr/bin/env node
/**
 * MÄTER UPP SKÄRMEN I KLIPPET
 * ═══════════════════════════
 * Sidan ska ligga på bildskärmen i filmen, inte bakom den. För det räcker
 * det inte att gissa: sidan måste stå exakt där skärmen står i varje
 * bildruta, och växa i takt med att kameran närmar sig.
 *
 * Skärmen är magenta i klippet — samma färg som nycklas bort när filmen
 * visas. Här letas den i stället upp: varje bildruta skalas ned, magentan
 * plockas ut på färgtonen, och den rektangel den upptar skrivs ned som
 * andelar av bildrutan. Resultatet blir en tabell som Film.tsx läser.
 *
 *   node scripts/measure-screen.mjs [klipp] [till-sekund]
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const input = process.argv[2] ?? 'public/clips/studio.mp4'
const until = Number(process.argv[3] ?? 1.8)
const OUT = 'src/data/screen-track.ts'

/** Mätupplösning. Skärmen är stor nog att hittas långt under filmens egen. */
const W = 192
const FPS = 24

const raw = execFileSync(ffmpeg, [
  '-v', 'error',
  '-i', input,
  '-t', String(until),
  '-vf', `scale=${W}:-2,fps=${FPS}`,
  '-f', 'rawvideo',
  '-pix_fmt', 'rgb24',
  '-',
], { maxBuffer: 1 << 28 })

// Höjden faller ur bildens proportioner; -2 rundar till jämnt tal.
const frames = Math.round(until * FPS)
const H = Math.round(raw.length / (frames * W * 3))
const frameBytes = W * H * 3
const count = Math.floor(raw.length / frameBytes)

/** Magenta: rött och blått högt, grönt tydligt lägre. */
function isKey(r, g, b) {
  return r > 70 && b > 70 && g < Math.min(r, b) * 0.72 && Math.abs(r - b) < Math.max(r, b) * 0.55
}

const track = []
for (let f = 0; f < count; f++) {
  const base = f * frameBytes
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = base + (y * W + x) * 3
      if (!isKey(raw[i], raw[i + 1], raw[i + 2])) continue
      n++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (n < 12) continue
  track.push({
    t: +(f / FPS).toFixed(4),
    // Mitten och bredden som andelar av bildrutan. Höjden följer av sidans
    // egna proportioner och behövs inte.
    cx: +(((x0 + x1 + 1) / 2) / W).toFixed(4),
    cy: +(((y0 + y1 + 1) / 2) / H).toFixed(4),
    w: +((x1 - x0 + 1) / W).toFixed(4),
    h: +((y1 - y0 + 1) / H).toFixed(4),
  })
}

const body = track
  .map((p) => `  [${p.t}, ${p.cx}, ${p.cy}, ${p.w}, ${p.h}],`)
  .join('\n')

writeFileSync(OUT, `/**
 * SKÄRMENS PLATS I BILDRUTAN
 * ══════════════════════════
 * Genererad av scripts/measure-screen.mjs — redigera inte för hand.
 *
 * En rad per bildruta fram till att skärmen fyller rutan:
 *   [sekund, mitt-x, mitt-y, bredd, höjd]
 * allt utom sekunden som andelar av bildrutan.
 *
 * Film.tsx lägger sidan precis här, så att texten står på skärmen och
 * växer i takt med att kameran kommer närmare.
 */
export type ScreenSample = readonly [t: number, cx: number, cy: number, w: number, h: number]

export const SCREEN_TRACK: readonly ScreenSample[] = [
${body}
]
`)

console.log(`${OUT}: ${track.length} bildrutor, ${W}×${H}`)
if (track.length) {
  const a = track[0]
  const z = track[track.length - 1]
  console.log(`  ${a.t}s: bredd ${(a.w * 100).toFixed(1)} % vid (${a.cx}, ${a.cy})`)
  console.log(`  ${z.t}s: bredd ${(z.w * 100).toFixed(1)} % vid (${z.cx}, ${z.cy})`)
}
