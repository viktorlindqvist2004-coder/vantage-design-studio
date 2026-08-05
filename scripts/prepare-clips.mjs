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
 * Ett rumsklipp som faktiskt rör kameran måste däremot gå ihop på varvet.
 * Skriv då `fil@start:slut` så klipps det till den sträckan och sista
 * halvsekunden tonas över i den första — slutet blir samma bild som början,
 * och skarven syns inte. Sträckan väljs genom att leta upp de två
 * bildrutor som liknar varandra mest; `--skarvar` gör den mätningen och
 * skriver ut kandidaterna i stället för att koda något.
 *
 *   node scripts/prepare-clips.mjs <skärm> <rum-a> <rum-b> <rum-c> <rum-d@0.75:5.88>
 *   node scripts/prepare-clips.mjs --skarvar <fil>
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

/** Så lång är övertoningen som döljer skarven i ett loopande klipp. */
const SEAM = 0.4

/**
 * Filtret för ett rumsklipp.
 *
 * Utan sträcka går klippet rakt igenom. Med sträcka läggs skarven först:
 * klippets sista `SEAM` sekunder tonas över i dess första, och därefter
 * följer mitten orörd. Sista bildrutan blir då samma bild som den första,
 * och varvet går ihop.
 */
function roomFilter(from, to) {
  if (from === undefined) return `[0:v]${scale}[v]`

  // Bildpunktsformatet skrivs ut innan strömmen delas: `blend` och `concat`
  // vägrar sätta ihop grenar som säger sig ha olika format, och en gren som
  // ärvt ett odefinierat format räknas som olik.
  const cut = to - SEAM
  return [
    `[0:v]${scale},setsar=1,format=gbrp,split=3[a][b][c]`,
    `[a]trim=${cut}:${to},setpts=PTS-STARTPTS[svans]`,
    `[b]trim=${from}:${from + SEAM},setpts=PTS-STARTPTS[huvud]`,
    `[c]trim=${from + SEAM}:${cut},setpts=PTS-STARTPTS[mitt]`,
    `[svans][huvud]blend=all_expr='A*(1-min(T/${SEAM},1))+B*min(T/${SEAM},1)'[skarv]`,
    `[skarv][mitt]concat=n=2:v=1:a=0,format=yuv420p[v]`,
  ].join(';')
}

/**
 * Letar upp den sträcka som loopar bäst.
 *
 * Klippet läses ned till en liten gråskalebild per bildruta, och varje par
 * av bildrutor jämförs. Det par som liknar varandra mest är den sträcka
 * som går ihop med minst hopp — resten sköter övertoningen.
 */
function seams(input) {
  const w = 160
  const h = 90
  const n = w * h
  const raw = execFileSync(
    ffmpeg,
    ['-v', 'error', '-i', input, '-vf', `fps=${FPS},scale=${w}:${h}`,
      '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
    { maxBuffer: 5e8 },
  )

  const count = Math.floor(raw.length / n)
  const frames = Array.from({ length: count }, (_, i) => raw.subarray(i * n, (i + 1) * n))
  const apart = (a, b) => {
    let sum = 0
    for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i])
    return sum / n
  }

  const found = []
  // Kortare än så här blir loopen märkbar som en loop.
  const shortest = FPS * 4
  for (let a = 0; a < count; a++) {
    for (let b = a + shortest; b < count; b++) found.push([a / FPS, b / FPS, apart(frames[a], frames[b])])
  }

  found.sort((x, y) => x[2] - y[2])
  console.log(`${basename(input)} — sträckor som loopar bäst:\n`)
  console.log('  start    slut    längd   skillnad')
  for (const [a, b, d] of found.slice(0, 8)) {
    console.log(`  ${a.toFixed(2)}s   ${b.toFixed(2)}s   ${(b - a).toFixed(2)}s   ${d.toFixed(2)}`)
  }
}

const scale = `scale=${WIDTH}:-2:flags=lanczos,fps=${FPS}`

const [, , first, ...rest] = process.argv

if (first === '--skarvar') {
  if (!rest[0]) {
    console.error('Ange: node scripts/prepare-clips.mjs --skarvar <fil>')
    process.exit(1)
  }
  seams(rest[0])
  process.exit(0)
}

const screen = first
const rooms = rest
if (!screen || rooms.length < 1) {
  console.error('Ange: node scripts/prepare-clips.mjs <skärm> <rum-a> <rum-b> …')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const reel = { gop: 12, crf: 22, vp9crf: 32 }

console.log('Skärmklippet:')
write(screen, `[0:v]${scale}[v]`, `${OUT}/screen`, reel)

console.log('\nRumsklippen:')
rooms.forEach((arg, i) => {
  // `fil@start:slut` klipper ut sträckan och syr ihop varvet.
  const [input, span] = arg.split('@')
  const [from, to] = span ? span.split(':').map(Number) : []
  const name = `room-${String.fromCharCode(97 + i)}`

  // Rummen är dämpad, suddig film där kompressionen inte har mycket att
  // förstöra. Samtalsklippet är tvärtom tunna vita linjer mot svart — den
  // sortens detalj är både dyrast att koda och känsligast för att kodas
  // hårt, och eftersom klippet dessutom skalas upp mot en tät skärm syns
  // varje utsmetad linje. Det får därför kosta det det kostar; klippet
  // hämtas ändå först när man närmar sig platsen.
  const quality = span
    ? { gop: FPS, crf: 20, vp9crf: 26 }
    : { gop: FPS, crf: 24, vp9crf: 33 }

  write(input, roomFilter(from, to), `${OUT}/${name}`, quality)
})
