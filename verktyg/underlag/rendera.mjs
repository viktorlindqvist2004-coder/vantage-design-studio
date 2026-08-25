/**
 * HTML -> PDF, och bort med spåren av verktyget.
 *
 * Chromium skriver sitt eget namn i PDF:ens metadata: "HeadlessChrome/141"
 * som skapare och "Skia/PDF" som producent. Ett underlag från en
 * designstudio ska inte tala om vilken webbläsare som råkade rendera det,
 * så posterna skrivs om.
 *
 * Att bara skriva om dem räcker inte. exiftool lägger till en ny post och
 * lämnar den gamla kvar i filen, där den går att läsa ur råbytena; därför
 * byggs filen om med qpdf efteråt, vilket kastar de överblivna objekten.
 * Kontrollen sist letar efter strängarna på nytt och stannar om någon
 * finns kvar.
 *
 * Kräver exiftool och qpdf. Sidfoten sätts här och inte i stilmallen —
 * Chromium kan inte räkna sidnummer i CSS.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Playwright är inte ett beroende i projektet och ska inte bli det: femtio
 * megabyte plus webbläsare för ett verktyg som körs när prislistan ändras.
 * Finns det installerat någonstans används det, annars sägs det rakt ut
 * vad som saknas.
 */
let chromium
try {
  ({ chromium } = await import('playwright'))
} catch {
  throw new Error(
    'playwright saknas. Kör `npx playwright@latest install chromium` och\n'
    + 'därefter det här skriptet med NODE_PATH satt till mappen där\n'
    + 'playwright ligger, eller `npm i -D playwright` i projektet.',
  )
}

const här = path.dirname(fileURLToPath(import.meta.url))
const källa = path.join(här, 'underlag.html')
const pdf = path.join(här, 'Vantage-Design-Studio.pdf')

/**
 * CHROMIUM_BANA pekar ut en webbläsare som redan finns på maskinen.
 * Utan den letar Playwright efter just den version det självt hämtat, och
 * det är inte alltid samma som den som ligger installerad.
 */
const webbläsare = await chromium.launch(
  process.env.CHROMIUM_BANA ? { executablePath: process.env.CHROMIUM_BANA } : {},
)
const sida = await (await webbläsare.newContext()).newPage()

const fel = []
sida.on('pageerror', (e) => fel.push(String(e)))

await sida.goto(`file://${källa}`, { waitUntil: 'load' })
await sida.evaluate(() => document.fonts.ready)

// Föll typsnittet tillbaka blir dokumentet satt i något annat än studions
// egen grad, och det syns tydligast i just de tabeller som ska läsas noga.
const laddade = await sida.evaluate(() =>
  [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))
if (!laddade.includes('Geist')) throw new Error('Geist laddades inte — avbryter')

await sida.pdf({
  path: pdf,
  format: 'A4',
  printBackground: true,
  margin: { top: '19mm', bottom: '20mm', left: '18mm', right: '18mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%;padding:0 18mm;font-family:sans-serif;font-size:7.4pt;color:#8a867d;display:flex;justify-content:space-between;">
      <span>Vantage Design Studio &nbsp;·&nbsp; priser exkl. moms, gäller från augusti 2026</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
})

await webbläsare.close()
if (fel.length) throw new Error(`fel vid rendering: ${fel.join(', ')}`)

const studio = 'Vantage Design Studio'
execFileSync('exiftool', [
  '-overwrite_original',
  `-Title=${studio}`,
  `-Author=${studio}`,
  '-Subject=Tjänster och prislista',
  `-Creator=${studio}`,
  `-Producer=${studio}`,
  '-Keywords=webbdesign, webbutveckling, bokningssystem, e-handel',
  pdf,
], { stdio: 'ignore' })

execFileSync('qpdf', ['--linearize', pdf, `${pdf}.ny`])
renameSync(`${pdf}.ny`, pdf)

const bytes = readFileSync(pdf)
const spår = ['HeadlessChrome', 'Skia', 'Chrome', 'Mozilla', 'AppleWebKit']
  .filter((s) => bytes.includes(s))
if (spår.length) throw new Error(`verktygsspår kvar i filen: ${spår.join(', ')}`)

const sidor = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
console.log(`${path.basename(pdf)}: ${sidor} sidor, ${Math.round(bytes.length / 1024)} kB, inga verktygsspår`)
