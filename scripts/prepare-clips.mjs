#!/usr/bin/env node
/**
 * KODAR OM SIDANS KLIPP
 * ═════════════════════
 * Tre råfiler in, sex filer ut. Två sorters klipp med rakt motsatta krav.
 *
 * SKÄRMKLIPPET är kameran som åker in i bildskärmen och skärmen som sedan
 * laddar. Scrollen sätter uppspelningspunkten, så det måste kunna stå
 * still, gå framåt och gå bakåt. Bakåt kan en webbläsare inte spela — den
 * kan bara hoppa, och ett hopp per bildruta ser trasigt ut. Därför skrivs
 * rullen två gånger: en framlänges och en baklänges. Utflygningen spelar
 * den vända rullen framåt, och rörelsen blir lika mjuk åt båda hållen.
 *
 * Eftersom båda hållen numera spelas i stället för sökas behövs inga täta
 * nyckelbildrutor. En halv sekund emellan räcker: det enda som söker är
 * starten och ögonblicket rullarna byts, och en halv sekund att avkoda tar
 * några millisekunder.
 *
 * RUMSKLIPPEN rullar för sig själva bakom texten. De rör sig redan nästan
 * omärkligt, så de behöver ingen nedsaktning i kodningen — de spelas
 * långsammare i webbläsaren i stället, vilket vid den här rörelsemängden
 * inte syns som stillastående bildrutor. Varje klipp läggs ihop med sig
 * självt baklänges, så loopen inte har någon skarv att haka upp sig på.
 *
 *   node scripts/prepare-clips.mjs <skärm.mp4> <rum-a.mov> <rum-b.mp4>
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

/** Läser klippets längd, som behövs för att vända det utan dubblerad ruta. */
function frames(input) {
  let err = ''
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', input], { stdio: 'pipe' })
  } catch (e) {
    err = String(e.stderr ?? '')
  }
  const m = err.match(/Duration: (\d+):(\d+):([\d.]+)/)
  if (!m) throw new Error('Kunde inte läsa längden på ' + input)
  const seconds = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])
  return Math.round(seconds * FPS)
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

const [, , screen, roomA, roomB] = process.argv
if (!screen || !roomA || !roomB) {
  console.error('Ange: node scripts/prepare-clips.mjs <skärm> <rum-a> <rum-b>')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const scale = `scale=${WIDTH}:-2:flags=lanczos,fps=${FPS}`
const reel = { gop: 12, crf: 22, vp9crf: 32 }

console.log('Skärmklippet, framlänges:')
write(screen, `[0:v]${scale}[v]`, `${OUT}/screen`, reel)

console.log('\nSkärmklippet, baklänges — utflygningen spelar den framåt:')
write(screen, `[0:v]${scale},reverse,setpts=PTS-STARTPTS[v]`, `${OUT}/screen-rev`, reel)

console.log('\nRumsklippen, fram och tillbaka:')
for (const [name, input] of [['room-a', roomA], ['room-b', roomB]]) {
  const n = frames(input)
  // Vändningen tas utan första och sista bildrutan; annars står bilden
  // still ett ögonblick i varje ände och loopen får en hicka.
  const filter =
    `[0:v]${scale},split[a][b];`
    + `[b]reverse,trim=start_frame=1:end_frame=${n - 1},setpts=PTS-STARTPTS[rev];`
    + `[a][rev]concat=n=2:v=1[v]`
  write(input, filter, `${OUT}/${name}`, { gop: FPS, crf: 24, vp9crf: 33 })
}
