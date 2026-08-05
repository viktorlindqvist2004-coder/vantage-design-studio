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
const W = 640
const FPS = 24
/**
 * Hur många bildrutor åt vardera hållet som vägs in i utjämningen.
 *
 * Kameran rör sig jämnt; det som hoppar mellan bildrutorna är mätfel — en
 * kant som råkar hamna på andra sidan en bildpunkt, en skärmkant som är
 * suddig i just den rutan. Läggs det bruset på sidan syns det direkt, för
 * sidan står still i förhållande till skärmen och allt annat rör sig runt
 * den. Ett par bildrutors medelvärde tar bort bruset utan att ta bort
 * rörelsen.
 */
const SMOOTH = 3

/**
 * Höjden måste läsas av, inte räknas ut.
 *
 * Den går att härleda ur antalet bytes bara om man vet exakt hur många
 * bildrutor ffmpeg gav — och det vet man inte: ett klipp som är 1,75 s
 * långt ger inte samma antal som `längd × bildfrekvens` avrundat. Gissar
 * man fel blir höjden fel, och då hamnar hela mätningen några procent vid
 * sidan om utan att något ser trasigt ut.
 */
function sourceSize() {
  let out = ''
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', input], { stdio: 'pipe' })
  } catch (err) {
    out = String(err.stderr ?? '')
  }
  const m = out.match(/Video:.*?(\d{2,5})x(\d{2,5})/)
  if (!m) throw new Error('Kunde inte läsa klippets mått')
  return { w: Number(m[1]), h: Number(m[2]) }
}

const src = sourceSize()
// -2 rundar till jämnt tal; samma beräkning som ffmpeg gör.
const H = Math.round((W * src.h) / src.w / 2) * 2

const raw = execFileSync(ffmpeg, [
  '-v', 'error',
  '-i', input,
  '-t', String(until),
  '-vf', `scale=${W}:${H},fps=${FPS}`,
  '-f', 'rawvideo',
  '-pix_fmt', 'rgb24',
  '-',
], { maxBuffer: 1 << 28 })

const frameBytes = W * H * 3
const count = Math.floor(raw.length / frameBytes)

/** Magenta: rött och blått högt, grönt tydligt lägre. */
function isKey(r, g, b) {
  return r > 70 && b > 70 && g < Math.min(r, b) * 0.72 && Math.abs(r - b) < Math.max(r, b) * 0.55
}

/**
 * Kanten på en profil, med bråkdelar av en bildpunkt.
 *
 * Skärmen är en rektangel, så antalet nyckelpunkter per kolumn bildar en
 * platå. Kanten ligger där platån går upp respektive ned genom halva sin
 * höjd — och eftersom kanten är suddig över en bildpunkt eller två går det
 * att interpolera fram var däremellan den ligger. Utan det steget hoppar
 * måttet en hel bildpunkt i taget, och en bildpunkt här är sju på skärmen.
 */
function edges(profile) {
  const peak = Math.max(...profile)
  if (peak <= 0) return null
  const half = peak / 2

  let lo = profile.findIndex((v) => v >= half)
  let hi = profile.length - 1 - [...profile].reverse().findIndex((v) => v >= half)

  const before = lo > 0 ? profile[lo - 1] : 0
  const after = hi < profile.length - 1 ? profile[hi + 1] : 0
  // Linjär interpolation mot punkten utanför kanten.
  const a = profile[lo] - before || 1
  const b = profile[hi] - after || 1
  return [lo - (profile[lo] - half) / a, hi + 1 + (profile[hi] - half) / b]
}

const raw2 = []
for (let f = 0; f < count; f++) {
  const base = f * frameBytes
  const cols = new Float64Array(W)
  const rows = new Float64Array(H)
  let n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = base + (y * W + x) * 3
      if (!isKey(raw[i], raw[i + 1], raw[i + 2])) continue
      n++
      cols[x]++
      rows[y]++
    }
  }
  if (n < 60) continue
  const ex = edges(cols)
  const ey = edges(rows)
  if (!ex || !ey) continue
  raw2.push({
    t: f / FPS,
    cx: (ex[0] + ex[1]) / 2 / W,
    cy: (ey[0] + ey[1]) / 2 / H,
    w: (ex[1] - ex[0]) / W,
    h: (ey[1] - ey[0]) / H,
  })
}

/** Glidande medelvärde över SMOOTH bildrutor åt vardera hållet. */
const smooth = (key, i) => {
  let sum = 0
  let n = 0
  for (let j = Math.max(0, i - SMOOTH); j <= Math.min(raw2.length - 1, i + SMOOTH); j++) {
    sum += raw2[j][key]
    n++
  }
  return sum / n
}

const track = raw2.map((p, i) => ({
  t: +p.t.toFixed(4),
  cx: +smooth('cx', i).toFixed(5),
  cy: +smooth('cy', i).toFixed(5),
  // Skärmen växer hela vägen in. Blir måttet ändå mindre än föregående
  // bildruta är det brus, och då backar sidan ett ögonblick — det syns.
  w: +Math.min(smooth('w', i), 1).toFixed(5),
  h: +Math.min(smooth('h', i), 1).toFixed(5),
}))

for (let i = 1; i < track.length; i++) {
  track[i].w = +Math.max(track[i].w, track[i - 1].w).toFixed(5)
  track[i].h = +Math.max(track[i].h, track[i - 1].h).toFixed(5)
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
