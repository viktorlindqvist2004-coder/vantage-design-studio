#!/usr/bin/env node
/**
 * KODAR OM ETT KLIPP FÖR ATT KUNNA DRAS MED SCROLLEN
 * ══════════════════════════════════════════════════
 * Klippet spelas aldrig av sig självt — scrollen bestämmer takten. Det
 * ställer två krav som drar åt olika håll:
 *
 *   1. Det ska gå att hoppa i klippet, för när man scrollar bakåt går det
 *      inte att spela. Ju tätare nyckelbildrutor, desto snabbare hopp.
 *   2. Det ska gå att spela upp i flerdubbel hastighet utan att avkodningen
 *      tappar bilder. Ju glesare nyckelbildrutor, desto mindre att avkoda.
 *
 * En nyckelbildruta varannan sekund (webbläsarens standard) gör hoppen
 * ryckiga. Varje bildruta som nyckelbildruta (-g 1) gör filen flera gånger
 * så stor och avkodningen tung. En halv sekund emellan (-g 12 vid 24 b/s)
 * träffar mitten: hoppen känns direkta, och filen är liten nog att kunna
 * avkodas snabbare än realtid när man drar fort.
 *
 *   node scripts/prepare-clip.mjs <in.mp4> <ut-utan-ändelse> [bredd] [fps]
 *
 * Utan argument körs alla filer i clips-raw/ till public/clips/. Varje
 * klipp skrivs i två format: Chromium utan patentbelagda kodekar spelar
 * inte H.264, och Safari spelar inte VP9.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path

const WIDTH = 1280
const FPS = 24
/** Bildrutor mellan nyckelbildrutorna — se resonemanget överst. */
const GOP = 12
/**
 * Fram till den här sekunden får varje bildruta vara en nyckelbildruta.
 * Inflygningen mot skärmen spelas nämligen också baklänges, när man tar sig
 * ut ur den igen, och baklängesrörelse kan bara göras med hopp. Just den
 * biten måste alltså vara billig att hoppa i — resten spelas framåt.
 */
const ALL_KEY_UNTIL = 1.75

const run = (args) =>
  execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] })

function report(file) {
  const mb = (statSync(file).size / 1024 / 1024).toFixed(1)
  console.log(`${basename(file).padEnd(28)} ${mb} MB`)
}

function encode(input, out, width = WIDTH, fps = FPS) {
  // `-an`: klippet är stumt på sidan, ljudet fyller bara plats.
  const common = ['-y', '-i', input, '-an',
    '-vf', `scale=${width}:-2:flags=lanczos,fps=${fps}`,
    '-force_key_frames', `expr:lt(t,${ALL_KEY_UNTIL})`]

  run([...common,
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-g', String(GOP),
    '-keyint_min', String(GOP),
    '-sc_threshold', '0',        // jämnt avstånd, inte scenberoende
    '-crf', '22',
    '-preset', 'slow',
    '-movflags', '+faststart',   // spelbar innan hela filen laddats
    `${out}.mp4`])
  report(`${out}.mp4`)

  run([...common,
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuv420p',
    '-g', String(GOP),
    '-keyint_min', String(GOP),
    '-crf', '32',
    '-b:v', '0',
    '-row-mt', '1',
    '-deadline', 'good',
    '-cpu-used', '2',
    `${out}.webm`])
  report(`${out}.webm`)
}

const [, , inFile, outFile, w, f] = process.argv

if (inFile && outFile) {
  encode(inFile, outFile.replace(/\.(mp4|webm)$/i, ''), Number(w) || WIDTH, Number(f) || FPS)
} else {
  mkdirSync('public/clips', { recursive: true })
  const files = readdirSync('clips-raw').filter((n) => /\.(mp4|mov|webm)$/i.test(n))
  if (!files.length) {
    console.error('Inga klipp i clips-raw/')
    process.exit(1)
  }
  for (const name of files) {
    encode(join('clips-raw', name), join('public/clips', basename(name, extname(name))))
  }
}
