#!/usr/bin/env node
/**
 * KODAR OM ETT KLIPP FÖR ATT KUNNA SCRUBBAS
 * ═════════════════════════════════════════
 * En vanlig MP4 har en nyckelbildruta ungefär varannan sekund. Webbläsaren
 * kan bara hoppa till en sådan, så när scrollen styr uppspelningspunkten
 * blir rörelsen ryckig — bilden fastnar och skuttar.
 *
 * Här kodas varje bildruta som en nyckelbildruta (-g 1). Filen blir
 * betydligt större, vilket vi betalar tillbaka genom att hålla bredden
 * nere: bakgrunden ligger ändå bakom text och är lätt oskarp, så mer än
 * ~1100 px gör ingen synlig nytta.
 *
 *   node scripts/prepare-clip.mjs <in.mp4> <ut.mp4> [bredd] [fps]
 *
 * Utan argument körs alla filer i clips-raw/ till public/clips/.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const WIDTH = 1100
const FPS = 25

function encode(input, output, width = WIDTH, fps = FPS) {
  execFileSync(ffmpeg, [
    '-y',
    '-i', input,
    '-an',                                   // ljudet fyller bara plats
    '-vf', `scale=${width}:-2:flags=lanczos,fps=${fps}`,
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-g', '1',                               // varje bildruta sökbar
    '-crf', '25',
    '-preset', 'slow',
    '-movflags', '+faststart',               // spelbar innan hela filen laddats
    output,
  ], { stdio: ['ignore', 'ignore', 'inherit'] })

  const mb = (statSync(output).size / 1024 / 1024).toFixed(1)
  console.log(`${basename(output).padEnd(28)} ${mb} MB`)
}

const [, , inFile, outFile, w, f] = process.argv

if (inFile && outFile) {
  encode(inFile, outFile, Number(w) || WIDTH, Number(f) || FPS)
} else {
  mkdirSync('public/clips', { recursive: true })
  const files = readdirSync('clips-raw').filter((n) => /\.(mp4|mov|webm)$/i.test(n))
  if (!files.length) {
    console.error('Inga klipp i clips-raw/')
    process.exit(1)
  }
  for (const name of files) {
    encode(join('clips-raw', name), join('public/clips', `${basename(name, extname(name))}.mp4`))
  }
}
