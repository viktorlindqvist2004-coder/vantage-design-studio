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
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const OUT = 'public/clips'
const FPS = 24

/** Inflygningen: sekund 0 fram till strax efter att skärmen fyllt rutan. */
const SCREEN = { name: 'studio', to: 1.75, width: 1280 }

/**
 * Platserna i rummet.
 *
 * De måste gå att skilja åt vid en blick. Två avsnitt som tagits ur samma
 * kamerarörelse med en sekunds mellanrum visar samma sak ur nästan samma
 * vinkel, och när det ena tonar över i det andra ser det inte ut som ett
 * klipp — det ser ut som två filmer som råkat hamna ovanpå varandra.
 * Avsnitten nedan är valda för att vara fyra olika platser: fönstret,
 * hyllan, lampan, skrivbordet.
 */
const ROOMS = [
  { name: 'room-window', from: 1.8, to: 3.05 },
  { name: 'room-shelf', from: 4.0, to: 5.45 },
  { name: 'room-lamp', from: 6.35, to: 7.55 },
  { name: 'room-samples', from: 8.3, to: 9.02 },
]
const ROOM_WIDTH = 960

/**
 * Hur många gånger långsammare rummet ska röra sig.
 *
 * Att sänka uppspelningshastigheten i webbläsaren räcker inte: klippet har
 * fortfarande bara 24 bildrutor per sekund, så varje bildruta blir stående
 * tre gånger så länge och den mjuka kameraåkningen blir en stapplande rad
 * av stillbilder. Här räknas i stället mellanbilderna fram, med
 * rörelsekompensering, så att den långsamma åkningen har lika många egna
 * bildrutor som den snabba hade.
 */
const SLOW = 3.2
const ROOM_FPS = 30

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

console.log('\nRumsklippen — fram och tillbaka, i långsam takt:')
mkdirSync('.clip-tmp', { recursive: true })

for (const r of ROOMS) {
  const frames = Math.round((r.to - r.from) * FPS)
  const tmp = `.clip-tmp/${r.name}.mp4`

  // Vändningen tas utan första och sista bildrutan; annars står bilden
  // still ett ögonblick i varje ände och loopen får en hicka. Nedsaktningen
  // görs efter vändningen, så att `reverse` bara behöver hålla det korta
  // klippets bildrutor i minnet.
  const filter =
    `[0:v]scale=${ROOM_WIDTH}:-2:flags=lanczos,fps=${FPS},split[a][b];`
    + `[b]reverse,trim=start_frame=1:end_frame=${frames - 1},setpts=PTS-STARTPTS[rev];`
    + `[a][rev]concat=n=2:v=1,setpts=${SLOW}*PTS,`
    + `minterpolate=fps=${ROOM_FPS}:mi_mode=mci:me_mode=bidir:mc_mode=aobmc[v]`

  // Mellanbildsberäkningen är dyr och behöver bara göras en gång, inte en
  // gång per format. Resultatet mellanlandar därför i en nästan förlustfri
  // fil som båda kodningarna läser.
  console.log(`  ${r.name} — räknar fram mellanbilder …`)
  run(['-y', '-ss', String(r.from), '-t', String(r.to - r.from), '-i', input,
    '-an', '-filter_complex', filter, '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12',
    '-pix_fmt', 'yuv420p', tmp])

  write(['-y', '-i', tmp], '[0:v]null[v]', `${OUT}/${r.name}`,
    { gop: ROOM_FPS, crf: 28, vp9crf: 37 })
}

rmSync('.clip-tmp', { recursive: true, force: true })
