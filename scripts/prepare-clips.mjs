#!/usr/bin/env node
/**
 * KODAR OM SIDANS KLIPP
 * ═════════════════════
 * En råfil per plats in, två filer ut per klipp. Två sorters klipp med
 * rakt motsatta krav.
 *
 * SKÄRMKLIPPET är kameran som åker in i bildskärmen och skärmen som sedan
 * laddar. Det spelas alltid framlänges, från början. Går man bakåt spolas
 * det inte tillbaka — det ställs om till början och står stilla där tills
 * man går in igen.
 *
 * RUMSKLIPPEN rullar för sig själva bakom texten och börjar om från början
 * varje varv. De rör sig redan nästan omärkligt, så de behöver ingen
 * nedsaktning i kodningen — de spelas långsammare i webbläsaren i stället,
 * vilket vid den här rörelsemängden inte syns som stillastående bildrutor.
 *
 *   node scripts/prepare-clips.mjs <skärm> <rum-a> <rum-b> <rum-c>
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const OUT = 'public/clips'
const FPS = 24
const WIDTH = 1280

const run = (args) =>
  execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] })

function report(file) {
  const kb = Math.round(statSync(file).size / 1024)
  console.log(`  ${basename(file).padEnd(20)} ${String(kb).padStart(5)} kB`)
}

/** Samma klipp i H.264 och VP9: Chromium utan patentbelagda kodekar spelar
    inte H.264, och Safari spelar inte VP9. */
function write(input, filter, out, { gop, crf, vp9crf }) {
  const common = ['-y', '-i', input, '-an', '-filter_complex', filter, '-map', '[v]']

  run([...common,
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0',
    '-crf', String(crf), '-preset', 'slow', '-movflags', '+faststart',
    `${out}.mp4`])
  report(`${out}.mp4`)

  run([...common,
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p',
    '-g', String(gop), '-keyint_min', String(gop),
    '-crf', String(vp9crf), '-b:v', '0',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
    `${out}.webm`])
  report(`${out}.webm`)
}

const [, , screen, ...rooms] = process.argv
if (!screen || rooms.length < 1) {
  console.error('Ange: node scripts/prepare-clips.mjs <skärm> <rum-a> <rum-b> …')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const scale = `scale=${WIDTH}:-2:flags=lanczos,fps=${FPS}`
const reel = { gop: 12, crf: 22, vp9crf: 32 }

console.log('Skärmklippet:')
write(screen, `[0:v]${scale}[v]`, `${OUT}/screen`, reel)

console.log('\nRumsklippen:')
rooms.forEach((input, i) => {
  const name = `room-${String.fromCharCode(97 + i)}`
  write(input, `[0:v]${scale}[v]`, `${OUT}/${name}`, { gop: FPS, crf: 24, vp9crf: 33 })
})
