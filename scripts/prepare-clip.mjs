#!/usr/bin/env node
/**
 * KLIPPER UPP RÅMATERIALET TILL SIDANS KLIPP
 * ══════════════════════════════════════════
 * Sidan använder materialet på två helt olika sätt, och de vill ha varsin
 * kodning.
 *
 * SKÄRMKLIPPET är inflygningen mot bildskärmen. Det spelas aldrig av sig
 * självt — scrollen sätter uppspelningspunkten, och samma bit spelas
 * baklänges när man tar sig ut ur skärmen igen. Baklänges går bara att
 * göra med hopp, så här kodas varje bildruta som en nyckelbildruta. Filen
 * blir stor per sekund, men den är bara ett par sekunder lång.
 *
 * RUMSKLIPPEN är platserna kameran besöker efteråt. De rullar av sig
 * själva och byts ut när man scrollat vidare, så de behöver varken sökas
 * i eller vara skarpa — de ligger bakom text och är lätt oskarpa. Låg
 * bredd, gles nyckelbildruta, liten fil.
 *
 * Varje rumsklipp läggs ihop med sig självt baklänges. Ett kort klipp som
 * loopar rakt av hoppar till utgångsläget varje varv; går det i stället
 * fram och tillbaka finns ingen skarv att se.
 *
 *   node scripts/prepare-clip.mjs <råfil.mp4>
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const OUT = 'public/clips'
const FPS = 24

/** Inflygningen: sekund 0 fram till strax efter att skärmen fyllt rutan. */
const SCREEN = { name: 'studio', to: 1.75, width: 1280 }

/** Platserna i rummet, avlästa ur materialet. */
const ROOMS = [
  { name: 'room-window', from: 1.9, to: 3.2 },
  { name: 'room-shelf', from: 3.4, to: 5.4 },
  { name: 'room-lamp', from: 5.8, to: 7.5 },
  { name: 'room-samples', from: 7.7, to: 9.02 },
]
const ROOM_WIDTH = 960

const run = (args) =>
  execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] })

function report(file) {
  const kb = Math.round(statSync(file).size / 1024)
  console.log(`  ${basename(file).padEnd(24)} ${String(kb).padStart(5)} kB`)
}

/** Skriver samma filter i H.264 och VP9. Chromium utan patentbelagda
    kodekar spelar inte H.264, och Safari spelar inte VP9. */
function write(inputArgs, filter, out, { gop, crf, vp9crf }) {
  const common = [...inputArgs, '-an', '-filter_complex', filter, '-map', '[v]']

  run([...common,
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-g', String(gop),
    '-keyint_min', String(gop),
    '-sc_threshold', '0',
    '-crf', String(crf),
    '-preset', 'slow',
    '-movflags', '+faststart',
    `${out}.mp4`])
  report(`${out}.mp4`)

  run([...common,
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuv420p',
    '-g', String(gop),
    '-keyint_min', String(gop),
    '-crf', String(vp9crf),
    '-b:v', '0',
    '-row-mt', '1',
    '-deadline', 'good',
    '-cpu-used', '2',
    `${out}.webm`])
  report(`${out}.webm`)
}

const input = process.argv[2]
if (!input) {
  console.error('Ange råfilen: node scripts/prepare-clip.mjs <fil.mp4>')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

console.log('Skärmklippet — varje bildruta sökbar:')
write(
  ['-y', '-t', String(SCREEN.to), '-i', input],
  `[0:v]scale=${SCREEN.width}:-2:flags=lanczos,fps=${FPS}[v]`,
  `${OUT}/${SCREEN.name}`,
  // -g 1: varje bildruta är en nyckelbildruta, se resonemanget överst.
  { gop: 1, crf: 22, vp9crf: 30 },
)

console.log('\nRumsklippen — fram och tillbaka, sömlös loop:')
for (const r of ROOMS) {
  const frames = Math.round((r.to - r.from) * FPS)
  // Vändningen tas utan första och sista bildrutan; annars står bilden
  // still ett ögonblick i varje ände och loopen får en hicka.
  const filter =
    `[0:v]scale=${ROOM_WIDTH}:-2:flags=lanczos,fps=${FPS},split[a][b];`
    + `[b]reverse,trim=start_frame=1:end_frame=${frames - 1},setpts=PTS-STARTPTS[r];`
    + `[a][r]concat=n=2:v=1[v]`

  write(
    ['-y', '-ss', String(r.from), '-t', String(r.to - r.from), '-i', input],
    filter,
    `${OUT}/${r.name}`,
    { gop: FPS, crf: 27, vp9crf: 36 },
  )
}
