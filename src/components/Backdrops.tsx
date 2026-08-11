import { useRef } from 'react'
import { flode, fro, glod, useCanvas, type Scen } from '../lib/canvas'

/**
 * BAKGRUNDERNA
 * ════════════
 * Bakom varje parti går något. Inte samma sak överallt — då hade det blivit
 * ett tapetmönster — utan en egen idé per parti, och alla svarar på pekaren.
 *
 * Regeln som håller dem läsbara: bakgrunden får aldrig konkurrera med
 * texten. Den ligger under, den är dov, och den rör sig långsamt. Det man
 * ska märka är att ytan lever, inte vad som händer i den. Vill man titta
 * närmare finns det något att titta på — det är hela skillnaden mot en
 * platta.
 *
 * Alla ärver riggen i lib/canvas.ts: bara den som syns ritas.
 */

/* ── Strömningen: bakom manifestet ────────────────────────────────────── */

type Korn = { x: number; y: number; px: number; py: number; liv: number; max: number }

/**
 * Partiklar som följer ett osynligt strömningsfält och lämnar spår.
 *
 * Fältet är lagrat brus: varje punkt i ytan har en riktning, och kornen
 * följer den. Det ger banor som ser strömmade ut utan att någon ritat dem.
 * Pekaren böjer fältet omkring sig, så strömmen viker av kring handen.
 *
 * Spåren ritas genom att duken tonas ned i stället för att tömmas — varje
 * ruta lägger ett tunt lager mörker över det gamla, och banorna klingar av
 * av sig själva. Att spara banorna som listor hade kostat minne och tid
 * för exakt samma bild.
 */
export function Flow() {
  const korn = useRef<Korn[]>([])
  const W = useRef(0)
  const H = useRef(0)

  const ref = useCanvas(
    (w, h) => {
      W.current = w
      H.current = h
      const antal = Math.min(220, Math.round((w * h) / 5200))
      korn.current = Array.from({ length: antal }, (_, i) => {
        const x = fro(i) * w
        const y = fro(i + 999) * h
        return { x, y, px: x, py: y, liv: fro(i + 5) * 200, max: 120 + fro(i + 7) * 180 }
      })
    },
    ({ ctx, w, h, px, py, inne, t, dt }: Scen) => {
      // Tona ned i stället för att tömma. Det är spåren.
      ctx.fillStyle = 'rgba(11,11,12,0.055)'
      ctx.fillRect(0, 0, w, h)

      ctx.lineWidth = 1
      for (const k of korn.current) {
        k.px = k.x
        k.py = k.y

        let a = flode(k.x, k.y, t)
        if (inne) {
          const dx = k.x - px
          const dy = k.y - py
          const d = Math.hypot(dx, dy)
          // Nära handen vrids fältet mot en cirkel runt pekaren, så att
          // strömmen sveper förbi i stället för rakt igenom.
          if (d < 260 && d > 1) {
            const runt = Math.atan2(dy, dx) + Math.PI * 0.5
            const vikt = (1 - d / 260) ** 2
            a = a * (1 - vikt) + runt * vikt
          }
        }

        // Farten sätter spårets längd tillsammans med hur snabbt duken
        // tonas ned ovan. Låg fart gav spår på några bildpunkter, vilket
        // läste som brus i stället för som strömning.
        const fart = 105
        k.x += Math.cos(a) * fart * dt
        k.y += Math.sin(a) * fart * dt
        k.liv += 1

        // Ut ur rutan eller för gammal: sätt om på en ny plats. Utan
        // åldrande samlas allt i fältets sänkor och ytan blir tom.
        if (k.liv > k.max || k.x < -20 || k.x > w + 20 || k.y < -20 || k.y > h + 20) {
          k.x = Math.random() * w
          k.y = Math.random() * h
          k.px = k.x
          k.py = k.y
          k.liv = 0
          continue
        }

        // Ljusstyrkan följer livet: tänds, brinner, slocknar.
        const b = Math.sin((k.liv / k.max) * Math.PI)
        ctx.strokeStyle = `rgba(255,110,45,${(b * 0.62).toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(k.px, k.py)
        ctx.lineTo(k.x, k.y)
        ctx.stroke()
      }
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <canvas className="bg bg--flow" ref={ref} />
    </div>
  )
}

/* ── Rastret: bakom varför ────────────────────────────────────────────── */

/**
 * Ett rutnät av prickar som viker undan för handen.
 *
 * Prickarna sitter stilla tills pekaren närmar sig; då skjuts de utåt och
 * växer, som en duk man trycker på underifrån. En långsam våg går genom
 * fältet hela tiden så att det lever även när ingen rör vid det.
 *
 * Ritas som en enda bana med rektanglar i stället för en cirkel per prick.
 * Tusen `arc` per bildruta är mätbart; tusen små fyrkanter i samma bana är
 * det inte, och på den här storleken syns ingen skillnad.
 */
export function Dots() {
  // Vågorna per rad och kolumn räknas en gång per bildruta i stället för
  // en gång per prick. Med fyrtio kolumner och trettio rader är det
  // sjuttio sinusanrop i stället för tolvhundra.
  const vagX = useRef<number[]>([])
  const vagY = useRef<number[]>([])

  const ref = useCanvas(
    () => {},
    ({ ctx, w, h, px, py, inne, t }: Scen) => {
      ctx.clearRect(0, 0, w, h)
      const steg = 48
      const rack = 175
      const rack2 = rack * rack

      const kx = vagX.current
      const ky = vagY.current
      let n = 0
      for (let x = steg; x < w; x += steg) kx[n++] = Math.sin(x * 0.012 + t * 0.7)
      n = 0
      for (let y = steg; y < h; y += steg) ky[n++] = Math.cos(y * 0.014 - t * 0.5)

      ctx.fillStyle = 'rgba(12,12,13,0.5)'
      ctx.beginPath()
      let iy = 0
      for (let y = steg; y < h; y += steg, iy++) {
        // Rader långt från handen kan hoppa över hela pekarräkningen.
        const dy = y - py
        const nara = inne && dy * dy < rack2
        let ix = 0
        for (let x = steg; x < w; x += steg, ix++) {
          let ox = 0
          let oy = 0
          let r = 1 + kx[ix] * ky[iy] * 0.35

          if (nara) {
            const dx = x - px
            const d2 = dx * dx + dy * dy
            // Kvadraten jämförs mot kvadraten: roten dras bara för de få
            // prickar som faktiskt ligger inom räckhåll.
            if (d2 < rack2 && d2 > 0.25) {
              const d = Math.sqrt(d2)
              const k = (1 - d / rack) ** 2
              ox = (dx / d) * k * 26
              oy = (dy / d) * k * 26
              r += k * 2.6
            }
          }
          const s = r * 2
          ctx.rect(x + ox - r, y + oy - r, s, s)
        }
      }
      ctx.fill()
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <canvas className="bg bg--dots" ref={ref} />
    </div>
  )
}

/* ── Strålarna: bakom vad vi bygger ───────────────────────────────────── */

/**
 * Snett infallande ljus som driver, med en strålkastare vid pekaren.
 *
 * Banden är breda och mycket dova — de ska läsa som ljus i ett rum, inte
 * som ränder. Strålkastaren följer handen med eftersläpning; utan
 * eftersläpningen sitter den fast vid pekaren och blir en till markör.
 *
 * Banden ligger i CSS och inte i duken, och det är en prestandasak.
 * Ritade i duken måste hela den vridna ytan kopieras om varje bildruta,
 * och det ensamt halverade bildrutorna i partiet. Banden är dessutom det
 * enda på sidan som inte behöver svara på något — de bara driver — och då
 * hör de hemma i ett lager som grafikkortet kan flytta utan att någon
 * ritar om det. Duken får behålla strålkastaren, som är det som lyssnar.
 */
export function Beams() {
  const lampa = useRef({ x: -9999, y: -9999 })
  const flack = useRef<HTMLCanvasElement | null>(null)

  const ref = useCanvas(
    () => { flack.current ??= glod(160, 'rgba(255,110,45,1)') },
    ({ ctx, w, h, px, py, inne }: Scen) => {
      ctx.clearRect(0, 0, w, h)
      const m = lampa.current
      const målX = inne ? px : w * 0.5
      const målY = inne ? py : h * 0.4
      if (m.x < -9000) { m.x = målX; m.y = målY }
      m.x += (målX - m.x) * 0.055
      m.y += (målY - m.y) * 0.055
      const r = Math.min(w, h) * 0.55
      if (flack.current) {
        ctx.globalAlpha = inne ? 0.11 : 0.05
        ctx.drawImage(flack.current, m.x - r, m.y - r, r * 2, r * 2)
        ctx.globalAlpha = 1
      }
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <div className="beams" />
      <canvas className="bg bg--beams" ref={ref} />
    </div>
  )
}

/* ── Pelarna: bakom talen ─────────────────────────────────────────────── */

/**
 * Ljuspelare som stiger ur underkanten och svarar på var handen är.
 *
 * Talen ovanför är fyra påståenden som ska kännas som mätvärden, och
 * pelare läser som mätning. Höjden pendlar i sin egen takt per pelare; nära
 * pekaren skjuter de upp. Det ser ut som något som mäts i realtid, vilket
 * är precis vad partiet påstår att studion gör.
 */
export function Columns() {
  const hojd = useRef<number[]>([])
  const antal = useRef(0)

  const toning = useRef<CanvasGradient | null>(null)

  const ref = useCanvas(
    (w) => {
      antal.current = Math.max(10, Math.round(w / 46))
      hojd.current = Array.from({ length: antal.current }, () => 0)
      toning.current = null
    },
    ({ ctx, w, h, px, py, inne, t }: Scen) => {
      ctx.clearRect(0, 0, w, h)
      if (!toning.current) {
        const g = ctx.createLinearGradient(0, h, 0, 0)
        g.addColorStop(0, 'rgba(255,90,35,0.16)')
        g.addColorStop(1, 'rgba(255,140,80,0)')
        toning.current = g
      }
      const n = antal.current
      const bredd = w / n

      for (let i = 0; i < n; i++) {
        const x = i * bredd
        // Grundhöjden pendlar långsamt, olika per pelare.
        let mal = 0.1 + (Math.sin(t * 0.5 + i * 0.55) * 0.5 + 0.5) * 0.22

        if (inne) {
          const d = Math.abs(x + bredd / 2 - px)
          if (d < 300) {
            const k = (1 - d / 300) ** 2
            // Höjden följer också hur högt upp handen är.
            mal += k * 0.5 * (1 - Math.min(1, Math.max(0, py / h)) * 0.5)
          }
        }

        hojd.current[i] += (mal - hojd.current[i]) * 0.07
        const ph = hojd.current[i] * h

        // En enda toning för hela ytan, skapad en gång. Förut gjordes en
        // per pelare och bildruta — trettio toningar i sekunden sextio
        // gånger om, för en bild som ser likadan ut.
        ctx.fillStyle = toning.current!
        ctx.fillRect(x + bredd * 0.16, h - ph, bredd * 0.68, ph)
      }
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <canvas className="bg bg--columns" ref={ref} />
    </div>
  )
}

/* ── Ringarna: bakom frågorna ─────────────────────────────────────────── */

/**
 * Ringar som breder ut sig från där handen rör sig.
 *
 * En fråga som ställs sprider sig — det är bilden. Ringar föds där pekaren
 * är, men bara när den faktiskt flyttat sig en bit, annars föds hundra i
 * samma punkt och det blir en klump. Ligger handen still glesnar ytan tills
 * bara de långsamma grundringarna är kvar.
 */
type Ring = { x: number; y: number; r: number; liv: number }

export function Rings() {
  const ringar = useRef<Ring[]>([])
  const sist = useRef({ x: -9999, y: -9999 })

  const ref = useCanvas(
    () => { ringar.current = [] },
    ({ ctx, w, h, px, py, inne, t, dt }: Scen) => {
      ctx.clearRect(0, 0, w, h)

      if (inne) {
        const d = Math.hypot(px - sist.current.x, py - sist.current.y)
        if (d > 46) {
          sist.current = { x: px, y: py }
          ringar.current.push({ x: px, y: py, r: 6, liv: 1 })
          // Taket finns för att en hand som far fram och tillbaka annars
          // hinner lägga på fler än som hinner dö.
          if (ringar.current.length > 14) ringar.current.shift()
        }
      }

      ctx.lineWidth = 1
      ringar.current = ringar.current.filter((r) => r.liv > 0)
      for (const r of ringar.current) {
        r.r += 90 * dt
        r.liv -= dt * 0.55
        ctx.strokeStyle = `rgba(255,74,23,${(r.liv * 0.3).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Grundringarna: två stora, långsamma, alltid där. Ytan ska aldrig
      // vara död även när ingen rör vid den.
      ctx.strokeStyle = 'rgba(12,12,13,0.05)'
      for (let i = 0; i < 3; i++) {
        const r = ((t * 26 + i * 240) % 720) + 40
        ctx.beginPath()
        ctx.arc(w * 0.82, h * 0.3, r, 0, Math.PI * 2)
        ctx.stroke()
      }
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <canvas className="bg bg--rings" ref={ref} />
    </div>
  )
}

/* ── Djupet: bakom skärmarna ──────────────────────────────────────────── */

/**
 * Ett golv i perspektiv som försvinner mot en horisont.
 *
 * Skärmarna framför ska stå någonstans, inte sväva på en svart platta. Ett
 * golv med linjer som glesnar mot horisonten ger rummet ett djup som
 * skärmarnas egen vridning ensam inte kan ge — det är först när golvet
 * finns som de läser som föremål på ett bord.
 *
 * Linjerna åt djupet ritas med jämna mellanrum i marken och projiceras;
 * ritades de med jämna mellanrum på skärmen skulle golvet se platt ut.
 * Marken rullar mot en, så att man känner att man färdas.
 */
export function Depth() {
  const ref = useCanvas(
    () => {},
    ({ ctx, w, h, px, inne, t }: Scen) => {
      ctx.clearRect(0, 0, w, h)

      // Horisonten ligger en bit ovanför mitten, och flyktpunkten följer
      // pekaren en aning i sidled — då vrider sig hela rummet med handen.
      const hy = h * 0.46
      const fx = w * 0.5 + (inne ? (px - w * 0.5) * 0.08 : 0)

      const g = ctx.createLinearGradient(0, hy - 90, 0, hy + 30)
      g.addColorStop(0, 'rgba(255,110,45,0)')
      g.addColorStop(0.75, 'rgba(255,110,45,0.1)')
      g.addColorStop(1, 'rgba(255,110,45,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, hy - 90, w, 120)

      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(243,242,239,0.09)'
      ctx.beginPath()
      // Linjer på djupet: jämnt fördelade i marken, projicerade till rutan.
      for (let i = -14; i <= 14; i++) {
        ctx.moveTo(fx + i * 26, hy)
        ctx.lineTo(fx + i * 300, h + 40)
      }
      ctx.stroke()

      // Tvärlinjer. Avståndet mellan dem följer 1/z, vilket är vad som gör
      // att golvet läser som ett golv och inte som en solfjäder.
      ctx.strokeStyle = 'rgba(243,242,239,0.07)'
      ctx.beginPath()
      const rull = (t * 0.22) % 1
      for (let i = 0; i < 16; i++) {
        const z = i + 1 - rull
        const y = hy + (h - hy) / z
        if (y > h + 40) continue
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <canvas className="bg bg--depth" ref={ref} />
    </div>
  )
}

/* ── Kabeln: bakom arbetsgången ───────────────────────────────────────── */

/** En ledare inuti manteln. */
type Ledare = {
  /** Var den hamnar längst ned, som andel av bredden räknat från stammen. */
  mal: number
  /** Hur brett den viker ut sig i sidled på vägen. */
  bukt: number
  tj: number
  farg: string
  /** Den mörka kanten, framräknad en gång och inte varje bildruta. */
  kant: string
  /**
   * Hur nära betraktaren ledaren ligger, 0–1.
   *
   * Ett knippe där varje ledare har samma kontrast ligger i ett enda plan,
   * och ett plan är en teckning. De bakre får sin kant dragen mot
   * mittentonen och sin glans dämpad — luften mellan dem och ögat tar bort
   * kontrast innan avstånd gör något annat. De ritas dessutom först, så de
   * hamnar bakom.
   */
  djup: number
  /** Egen fas och fördröjning, så att de inte växer i takt. */
  fas: number
  vanta: number
}

/**
 * KABELNS GENOMSKINLIGHET LIGGER I FÄRGEN, INTE PÅ DUKEN
 * ══════════════════════════════════════════════════════
 * Kabeln ska ligga dovt bakom texten, och det enklaste sättet att få dit
 * den är `opacity` på duken. Det var också det dyraste: en genomskinlig
 * duk på 1440 × 900 är ett eget lager som måste blandas med sidan under
 * varje bildruta, och det ensamt kostade sexton millisekunder — exakt en
 * bildruta, så partiet låg på trettio bilder i sekunden i stället för
 * sextio. Mätt: samma duk med `opacity: 1` gick på 16,7 ms, med 0,55 på
 * 33,3 ms, och att göra duken osynlig men låta all ritning vara kvar tog
 * den tillbaka till 16,7. Kostnaden låg alltså aldrig i det som ritades.
 *
 * Kabeln ligger på ett känt papper, och då behövs ingen genomskinlighet:
 * en färg blandad 55 % mot pappret ser likadan ut som samma färg lagd med
 * 55 % täckning ovanpå det. Skillnaden syns bara där kabeln överlappar sig
 * själv, och där är det ogenomskinliga svaret det riktiga — ett föremål
 * lyser inte igenom sig självt.
 */
const PAPPER = '#f3f2ef'
const TACK = 0.7

/** Samma färg som den skulle ha sett ut med `TACK` täckning över pappret. */
const ton = (f: string) => blanda(f, PAPPER, 1 - TACK)

const SNITT_INSIDA = ton('#78838f')

/**
 * GLANSEN TONAS INTE
 * ══════════════════
 * Allt annat på kabeln blandas mot pappret, och det betyder att kabelns
 * ljusaste möjliga färg är exakt papprets. Ett föremål vars högdager har
 * samma ljusstyrka som väggen bakom kan aldrig se blankt ut — det ser ut
 * som en urklippt form, hur många skuggsteg man än lägger i den.
 *
 * Glansen är därför den enda färg här som är otonad. Den är ett smalt
 * drag, förskjutet mot ljuset, och den ska vara ljusare än pappret. Det
 * är den enda punkten i bilden där något är det, och det räcker: det är
 * högdagern som säger att ytan är hård och rund, allt annat säger bara
 * att den är rund.
 *
 * Studsljuset är samma idé åt andra hållet. En verklig cylinder är inte
 * mörkast längst ut i skuggan utan en bit innanför kanten, för ytterst
 * fångar den ljus som studsat tillbaka från underlaget. Utan det bandet
 * läser kabeln som ritad, med det som fotograferad.
 */
const GLANS = '#ffffff'
const STUDS = ton('#c3ccd6')

/**
 * MANTELNS TVÄRSNITT, MÄTT PÅ ETT FOTOGRAFI
 * ═════════════════════════════════════════
 * Fyrtioåtta punkter tvärs över en blank vit kabel, medelvärde över mitten
 * av bilden. De är inte valda för hand utan avlästa ur ett studiofotografi,
 * och det är hela poängen: ljuset på en cylinder gör saker man inte gissar
 * rätt, och tre av dem satt fel i den handritade versionen.
 *
 *  · Ljussidan tänder inte mjukt. Silhuettens kant är redan 238 av 255,
 *    alltså nästan full styrka på första bildpunkten. En kant som tonar in
 *    utifrån läser som dimma, inte som plast.
 *  · Högdagern ligger en femtedel in från kanten och är bara måttligt
 *    ljusare än omgivningen — tjugofem steg av tvåhundratjugo. Handritad
 *    var den bredare och mycket starkare, alltså mer krom än gummi.
 *  · Mörkast är inte kanten utan åttiofem procent in. De sista sex
 *    procenten vänder brant tillbaka upp, och gör det varmt: 206,185,163
 *    mot en i övrigt kall yta. Det är golvet som lyser tillbaka, och det
 *    är den detaljen ögat läser som fotografi.
 *
 * Värdena ligger mot en bakgrund på 223,219,215 och räknas om mot sidans
 * papper i `bygYta` nedan.
 */
const YTA_PROFIL: number[][] = [
  [238, 239, 238], [237, 239, 238], [239, 241, 240], [241, 243, 242],
  [241, 243, 242], [242, 243, 242], [241, 243, 242], [241, 242, 242],
  [241, 242, 242], [246, 247, 246], [246, 248, 247], [247, 249, 248],
  [247, 249, 248], [247, 248, 248], [244, 246, 245], [242, 244, 243],
  [241, 243, 242], [237, 238, 239], [230, 230, 232], [228, 228, 230],
  [227, 227, 229], [225, 225, 227], [223, 223, 225], [221, 222, 223],
  [219, 219, 221], [217, 218, 220], [215, 216, 218], [211, 212, 213],
  [208, 209, 211], [204, 204, 207], [199, 200, 203], [192, 194, 197],
  [184, 185, 187], [177, 178, 180], [172, 172, 174], [165, 165, 167],
  [163, 163, 165], [157, 157, 159], [150, 150, 152], [144, 143, 145],
  [139, 137, 138], [128, 125, 123], [126, 122, 121], [131, 126, 123],
  [133, 126, 123], [162, 147, 134], [206, 185, 163], [165, 152, 142],
]

/** Bakgrunden i fotografiet profilen är mätt på. */
const FOTO_BG = [223, 219, 215]

/**
 * Ett värde ur den mätta profilen, omräknat mot sidans papper.
 *
 * Skuggan behåller hela sitt djup steg för steg medan ljussidan trycks
 * ihop till hälften, och skälet är att pappret ligger högt: från 243 finns
 * bara tolv steg kvar upp till vitt, medan fotografiets bakgrund på 223
 * hade trettiotvå. Skalar man båda lika får man välja mellan en kabel utan
 * högdager och en utan skugga.
 */
function ytaVarde(i: number, kanal: number) {
  const rad = YTA_PROFIL[Math.max(0, Math.min(YTA_PROFIL.length - 1, i))]
  const d = rad[kanal] - FOTO_BG[kanal]
  const p = tal(PAPPER)[kanal]
  const rå = p + (d < 0 ? d : d * 0.5)
  return Math.max(0, Math.min(255, Math.round(p + (rå - p) * TACK)))
}

/** Samma punkt i profilen som en hexfärg. */
function ytaFarg(i: number) {
  const h = (k: number) => ytaVarde(i, k).toString(16).padStart(2, '0')
  return `#${h(0)}${h(1)}${h(2)}`
}

/**
 * Ledarna får sina färger ur samma mätning som manteln.
 *
 * De hade en egen palett av bleka gråtoner förut, och det syntes: manteln
 * var fotograferad plast och knippet var ritade streck bredvid den. Samma
 * kurva, avläst på tre ställen — kärnskuggan, mellantonen och högdagern —
 * gör dem till samma material i olika grovlek, vilket är vad de är.
 */
const LEDAR_KANT = ytaFarg(41)
const LEDAR_MITT = ytaFarg(24)
const LEDAR_LJUS = ytaFarg(11)

/**
 * Profilen som en remsa att mappa längs kabelns bana.
 *
 * Omräkningen mot sidans papper är inte en enkel skalning, och skälet är
 * att pappret ligger högt: från 243 finns bara tolv steg kvar upp till
 * vitt, medan fotografiets bakgrund på 223 hade trettiotvå. Skuggan får
 * därför behålla hela sitt djup steg för steg, medan ljussidan trycks ihop
 * till hälften. Skalar man båda lika mycket får man välja mellan en kabel
 * utan högdager och en utan skugga.
 */
function bygYta() {
  const B = 128
  const c = document.createElement('canvas')
  c.width = B
  c.height = 2
  const g = c.getContext('2d')
  if (!g) return c
  const sista = YTA_PROFIL.length - 1
  for (let i = 0; i < B; i++) {
    const f = ((i + 0.5) / B) * sista
    const k0 = Math.floor(f)
    const k1 = Math.min(sista, k0 + 1)
    const m = f - k0
    // Mellan två mätpunkter tas den ljusare av de omräknade värdena med
    // vikt: profilen är tät nog att en rak blandning räcker.
    const kanal = (kanalNr: number) =>
      Math.round(ytaVarde(k0, kanalNr) + (ytaVarde(k1, kanalNr) - ytaVarde(k0, kanalNr)) * m)
    g.fillStyle = `rgb(${kanal(0)},${kanal(1)},${kanal(2)})`
    g.fillRect(i, 0, 1, 2)
  }
  return c
}

/** Mjuk in- och utgång, 0–1. Linjärt läser som en maskin som startar. */
const mjuk = (x: number) => {
  const s = Math.min(1, Math.max(0, x))
  return s * s * (3 - 2 * s)
}

/** Samma för en färg som redan har egen alfa: alfan skalas i stället. */
const tonA = (r: number, g: number, b: number, a: number) =>
  `rgba(${r},${g},${b},${(a * TACK).toFixed(3)})`

/**
 * KABELN SOM ÖPPNAR SIG
 * ═════════════════════
 * En grov kabel hänger ned längs partiets vänsterkant, bakom rubriken och
 * stegmätaren, och går hela vägen ned. En bit ned skalas manteln upp,
 * viker sig utåt, och inuti ligger ett knippe ledare som rullar ut och
 * breder ut sig åt höger och förbi underkanten. Allt sker i takt med att
 * man rullar: manteln växer, snittet öppnar sig, ledarna kommer fram.
 *
 * Det är arbetsgången i bild. Fem steg där ett blir till många — en
 * kartläggning blir en riktning, en riktning blir vyer, vyer blir kod och
 * en sajt som är i drift. En kabel som skalas upp gör exakt det, och den
 * gör det medan man läser stegen i stället för att stå färdig från början.
 *
 * SÅ BLIR EN LINJE ETT FÖREMÅL
 * En kabel ritad som ett streck är ett streck. Rundningen här kommer av
 * att samma bana dras sju gånger: bredast och mörkast underst, sedan allt
 * smalare och ljusare drag förskjutna uppåt vänster mot ljuset. Ögat
 * summerar dem till en cylinder. Det är samma sak som en toning tvärs över
 * kabeln, fast till priset av sju penseldrag i stället för en beräkning
 * per bildpunkt — och det syns ingen skillnad.
 *
 * Ovanpå det ligger två saker som gör att man tror på gummit: en tunn
 * spegling längst upp på kabelns rygg, och ett mönster av ringar tvärsöver
 * som följer banan. Utan ringarna är det en slang; med dem är det en kabel.
 */
export function Cord() {
  const hall = useRef<HTMLDivElement>(null)
  const ledare = useRef<Ledare[]>([])
  /**
   * Glöd och stoft ritas en gång till egna dukar och kopieras sedan.
   *
   * Elva spetsar med två toningar var, plus sexton stoftkorn, blir
   * fyrtio radiella toningar per bildruta — och att skapa en toning är
   * dyrt. Det tog partiet från sextio bilder i sekunden till trettio.
   * Kopiering av en färdig fläck kostar nästan ingenting.
   */
  const bloom = useRef<HTMLCanvasElement | null>(null)
  const karna = useRef<HTMLCanvasElement | null>(null)
  const svalt = useRef<HTMLCanvasElement | null>(null)
  const varmt = useRef<HTMLCanvasElement | null>(null)
  /** Mantelns mätta tvärsnitt som en remsa att mappa längs banan. */
  const yta = useRef<HTMLCanvasElement | null>(null)
  /* Diset ligger i CSS, se `.bg--cord` i site.css. Det är den enda saken
     här som varken rör sig eller lyssnar, och den täckte samtidigt mer än
     hela skärmen: att kopiera artonhundra gånger artonhundra genomskinliga
     bildpunkter varje bildruta kostade sexton millisekunder och halverade
     partiets bildfrekvens helt på egen hand. Som en toning i CSS ritas den
     en gång och flyttas sedan av grafikkortet utan att någon ritar om
     något alls. */

  const ref = useCanvas(
    () => {
      // Färgerna är en riktig kabels, men nedtonade till sidans värld:
      // koppar, accent, grafit och ben. En regnbåge hade varit mer
      // verklighetstrogen och helt fel på den här sidan.
      // Ledarna är ljusa som manteln, inte färgade. Ett knippe brokiga
      // trådar läser som en elinstallation; ett knippe ljusa former som
      // skulptur, och det är det senare bilden ska vara.
      const fargr = ['#e6eaef', '#dfe4ea', '#eef1f4', '#d7dce3', '#e9edf1', '#d2d8e0']
      bloom.current ??= glod(90, 'rgba(255,150,60,1)')
      karna.current ??= glod(46, 'rgba(255,208,130,1)')
      svalt.current ??= glod(30, 'rgba(178,192,210,1)')
      varmt.current ??= glod(30, 'rgba(255,168,90,1)')
      yta.current ??= bygYta()

      ledare.current = Array.from({ length: 9 }, (_, i) => {
        const f = fro(i * 3 + 1)
        const g = fro(i * 7 + 5)
        // Stammen står till vänster, så knippet faller ut åt höger. Ett
        // par ledare hålls nästan lodräta: de bär blicken vidare nedåt
        // förbi underkanten, medan de andra vecklar ut sig i bredd.
        // Jämnt utspridda men inte uppradade — en jämn solfjäder läser
        // som ett diagram, en ojämn som ett knippe som fallit ut.
        const mal = -0.12 + (i / 8) * 1.12 + (f - 0.5) * 0.09
        const farg = fargr[i % fargr.length]
        const djup = fro(i * 13 + 2)
        return {
          mal,
          bukt: (f - 0.5) * 0.3,
          // De närmare ledarna är grövre. Samma grovlek på alla säger att de
          // ligger på samma avstånd, och det gör knippet platt.
          tj: (5 + g * 4.4) * (0.82 + djup * 0.36),
          // Kulören varierar en gnutta mellan ledarna, men alla ligger på
          // samma mätta kurva. `farg` var förut en egen blek palett.
          farg: blanda(LEDAR_MITT, farg, 0.18),
          kant: blanda(LEDAR_MITT, LEDAR_KANT, 0.45 + djup * 0.5),
          djup,
          fas: f * Math.PI * 2,
          vanta: g * 0.16,
        }
      }).sort((a, b) => a.djup - b.djup)
    },
    ({ ctx, w, h, px, inne, t }: Scen) => {
      ctx.clearRect(0, 0, w, h)

      const el = hall.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const langd = r.height - h
      const p = langd > 4 ? Math.min(1, Math.max(0, -r.top / langd)) : 1

      // Kabeln kommer in i vänsterkanten, bakom rubriken. Där står texten
      // still medan stegen rullar förbi till höger, så det är den enda
      // spalten som tål något stort bakom sig.
      const bas = w * (w < 760 ? 0.2 : 0.17)
      const drag = inne ? (px - bas) * 0.045 : 0
      const x0 = bas + drag

      /**
       * Grovleken följer partiets bredd. En kabel som är lika grov på en
       * telefon som på en bildskärm är antingen ett rep eller en tråd —
       * aldrig samma föremål.
       */
      const TJ = Math.min(84, Math.max(52, w * 0.058))

      /**
       * KABELNS BANA
       * ════════════
       * `u` går från noll ovanför bildens överkant till ett nedanför dess
       * underkant, så kabeln fyller höjden vid varje läge i rullningen.
       *
       * I sidled är den en dämpad sinus: ett tydligt utslag åt höger uppe,
       * ett mindre tillbaka, och sedan nästan rakt ned. En odämpad sinus
       * slingrar lika mycket hela vägen och läser som ett dekorband; en
       * som klingar av läser som en kabel någon dragit — den svänger ut
       * där den kommer in i bild och rätar upp sig när den faller.
       */
      const bana = (u: number): [number, number] => [
        x0
        + w * 0.24 * Math.sin(u * Math.PI * 1.3) * Math.exp(-u * 1.4)
        + Math.sin(u * 4.6 + t * 0.28) * 11,
        -TJ * 1.6 + u * (h * 1.18 + TJ * 1.6),
      ]

      /**
       * HUR LÅNGT KABELN HAR MATATS IN, SOM ANDEL AV BANAN
       * ══════════════════════════════════════════════════
       * Noll betyder ingen kabel alls. Banans början ligger ovanför bildens
       * överkant, så det första som händer när man rullar in i partiet är
       * att en ände kommer ned uppifrån — kabeln firas ned genom bilden i
       * takt med att man läser sig ned genom stegen.
       *
       * Den stannar på knappa två tredjedelar av banan. Där är änden nere i
       * partiets nedre tredjedel med gott om plats under sig, och det är
       * först då den öppnar sig. Att låta manteln fortsätta ut ur bild hade
       * betytt att uppvecklingen skedde utanför rutan.
       *
       * Ingången är mjuk i båda ändar men förskjuten en gnutta framåt: rakt
       * mjuk startar så långsamt att kabeln står stilla ovanför kanten under
       * hela den första femtedelen, och då ser partiet tomt ut just när man
       * kommer in i det.
       */
      const SLUT = 0.62
      const uFram = SLUT * mjuk((p + 0.06) / 0.66)
      /**
       * Uppvecklingen. Den börjar när änden är framme och inte förr — det
       * är hela poängen med den här ordningen: man ser en hel kabel komma
       * ned, och först när man är nere hos den öppnar den sig.
       */
      const veckla = mjuk((p - 0.6) / 0.34)
      /** Hur uppskalad manteln är vid änden, 0–1. */
      const oppen = mjuk((p - 0.6) / 0.16)
      /** Hur brett knippet har vecklat ut sig. Bredden ligger efter fallet. */
      const ute = veckla * veckla

      /**
       * MANTELN MAPPAD MED DEN MÄTTA YTAN
       * ═════════════════════════════════
       * I stället för att måla fram rundningen med förskjutna penseldrag
       * läggs det fotograferade tvärsnittet ut längs banan, ett segment i
       * taget. Varje segment får en egen matris där remsans bredd blir
       * kabelns tvärled och dess höjd blir segmentets längd.
       *
       * Det är samma sak en 3D-motor gör med en textur, och skillnaden mot
       * penseldragen är att ingenting här är en gissning: mikrovariationen
       * i plasten, exakt var högdagern vänder, den varma studsen längst ut
       * — allt följer med.
       *
       * `transform` och inte `setTransform`: den senare skriver över
       * dukens egen skalning för bildpunktstätheten, och kabeln hade då
       * ritats i halv storlek på en tät skärm.
       */
      const mappa = (pkt: [number, number][], tj: number, remsa: HTMLCanvasElement) => {
        const B = remsa.width
        const H = remsa.height
        for (let i = 0; i < pkt.length - 1; i++) {
          const [ax, ay] = pkt[i]
          const [bx, by] = pkt[i + 1]
          const len = Math.hypot(bx - ax, by - ay)
          if (len < 0.01) continue
          const tx = (bx - ax) / len
          const ty = (by - ay) / len
          const nx = -ty
          const ny = tx
          /* Varje segment dras ut åt båda håll så att grannarna överlappar.
             En affin matris kan bara ge en parallellogram, alltså kan två
             segment på en böjd bana aldrig dela kant: på kurvans yttersida
             blir det ett litet hack i varje skarv, och en rad hack läser
             som gradering på en linjal — samma fel som räfflorna en gång
             gav. Överlappet täcker hacket, och tätare punkter gör det
             mindre att täcka. */
          const skarv = 2.2
          const L = len + skarv * 2
          ctx.save()
          ctx.transform(
            (nx * tj) / B, (ny * tj) / B,
            (tx * L) / H, (ty * L) / H,
            ax - (nx * tj) / 2 - tx * skarv, ay - (ny * tj) / 2 - ty * skarv,
          )
          ctx.drawImage(remsa, 0, 0)
          ctx.restore()
        }
      }

      /**
       * Ett kabeldrag: lager från mörk kant till ljus rygg.
       * `ljus` styr hur mycket spegling draget får — ledare inuti är
       * mattare än manteln utanpå.
       *
       * Antalet lager är en kostnad och inte en smaksak. Varje lager är
       * ett eget penseldrag längs hela banan, och kabeln ritar ett tiotal
       * banor per bildruta. Grova drag behöver många lager för att bli
       * runda; en tunn ledare på åtta bildpunkter blir precis lika rund av
       * tre, för det finns inte plats för fler steg i bredden. Skuggan
       * hoppas över på ledarna av samma skäl: den är ett extra drag som är
       * bredare än ledaren själv, och den syns inte under en tråd som ändå
       * hänger i luften.
       */
      /** Banan som en mjuk kurva genom punkterna. */
      const kurva = (pkt: [number, number][]) => {
        ctx.beginPath()
        ctx.moveTo(pkt[0][0], pkt[0][1])
        for (let i = 1; i < pkt.length - 1; i++) {
          ctx.quadraticCurveTo(
            pkt[i][0], pkt[i][1],
            (pkt[i][0] + pkt[i + 1][0]) / 2, (pkt[i][1] + pkt[i + 1][1]) / 2,
          )
        }
        ctx.lineTo(pkt[pkt.length - 1][0], pkt[pkt.length - 1][1])
      }

      /** Ett förskjutet drag längs en bana. */
      const lagerDrag = (
        pkt: [number, number][],
        dx: number, dy: number,
        bredd: number, farg: string, alfa = 1,
      ) => {
        ctx.save()
        ctx.globalAlpha = alfa
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.translate(dx, dy)
        kurva(pkt)
        ctx.lineWidth = bredd
        ctx.strokeStyle = farg
        ctx.stroke()
        ctx.restore()
      }

      /**
       * Skuggan på underlaget, i tre steg i stället för ett.
       *
       * En kastskugga med en enda kant är en till kontur; tre drag som blir
       * bredare och svagare utåt ger den en mjuk kant utan oskärpa, som är
       * dyr att räkna fram i en duk.
       */
      const kastskugga = (pkt: [number, number][], tj: number) => {
        if (pkt.length < 2) return
        lagerDrag(pkt, tj * 0.24, tj * 0.3, tj * 1.34, tonA(52, 64, 80, 0.05))
        lagerDrag(pkt, tj * 0.22, tj * 0.28, tj * 1.14, tonA(52, 64, 80, 0.07))
        lagerDrag(pkt, tj * 0.2, tj * 0.26, tj + 3, tonA(52, 64, 80, 0.1))
      }

      const dra = (
        pkt: [number, number][],
        tj: number,
        kant: string,
        mitt: string,
        ljus: string,
        lager = 7,
        skugga = true,
        /** Hur blank ytan är, 0–1. Manteln är gummi och blank, ledarna matta. */
        glans = 0,
      ) => {
        if (pkt.length < 2) return
        const lager1 = (dx: number, dy: number, bredd: number, farg: string, alfa = 1) =>
          lagerDrag(pkt, dx, dy, bredd, farg, alfa)

        if (skugga) kastskugga(pkt, tj)

        for (let k = 0; k < lager; k++) {
          const f = k / (lager - 1)
          // Varje lager smalnar och kryper uppåt vänster mot ljuset.
          lager1(
            -tj * 0.2 * f,
            -tj * 0.22 * f,
            tj * (1 - f * 0.82),
            f < 0.5 ? blanda(kant, mitt, f * 2) : blanda(mitt, ljus, (f - 0.5) * 2),
          )
        }

        if (glans > 0) {
          // Studsljuset ligger innanför skuggkanten, inte på den.
          lager1(tj * 0.29, tj * 0.3, tj * 0.13, STUDS, glans * 0.75)
          // Högdagern: smal, ljusare än pappret, en bit in från kanten.
          lager1(-tj * 0.31, -tj * 0.33, tj * 0.11, GLANS, glans)
          // En andra, bredare och svagare glans runt den. En högdager med
          // hård kant läser som en påmålad rand; en med en svag gloria
          // omkring sig läser som ljus i en yta. Bara på grova drag: på en
          // ledare på tio bildpunkter finns ingen yta att lägga den i, och
          // den skulle kosta ett helt penseldrag per ledare.
          if (tj > 20) lager1(-tj * 0.28, -tj * 0.3, tj * 0.3, GLANS, glans * 0.22)
        }
      }

      /**
       * En glödande spets: bloom, glöd, kärna.
       *
       * Tre lager utifrån och in. Bara det yttersta breder ut sig; kärnan
       * är liten och nästan vit. Utan den lilla vita punkten läser glöden
       * som dimma, utan bloomen som en prick.
       */
      const spets = (x: number, y: number, r: number) => {
        const b = bloom.current
        const k = karna.current
        if (b) {
          const d = r * 6.8
          ctx.globalAlpha = 0.34 * TACK
          ctx.drawImage(b, x - d / 2, y - d / 2, d, d)
        }
        if (k) {
          const d = r * 2
          ctx.globalAlpha = 0.85 * TACK
          ctx.drawImage(k, x - d / 2, y - d / 2, d, d)
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = tonA(255, 244, 220, 0.95)
        ctx.beginPath()
        ctx.arc(x, y, r * 0.24, 0, Math.PI * 2)
        ctx.fill()
      }

      /* ── Diset och stoftet, underst ───────────────────────────────────
         Ett svalt blågrått dis ger djup åt de ljusa formerna. Utan det
         ligger vita kablar mot vitt papper och tappar sin volym. */
      for (let i = 0; i < 16; i++) {
        const f = fro(i * 11 + 3)
        const g2 = fro(i * 5 + 9)
        const bx = ((f + t * 0.006 * (0.4 + g2)) % 1) * w
        const by = ((g2 - t * 0.008 * (0.3 + f)) % 1 + 1) % 1 * h
        const br = 3 + g2 * 12
        const sprite = i % 3 === 0 ? varmt.current : svalt.current
        if (!sprite) continue
        ctx.globalAlpha = 0.2 * TACK
        ctx.drawImage(sprite, bx - br, by - br, br * 2, br * 2)
        ctx.globalAlpha = 1
      }

      /* ── Ledarna, som ligger under manteln där de kommer ut ──────────── */
      for (const l of ledare.current) {
        // Varje ledare vecklar ut sig i sin egen takt.
        const fram = Math.min(1, Math.max(0, (veckla - l.vanta) / (1 - l.vanta)))
        // Kabeln är hel tills änden är nere. Då finns inget knippe att rita.
        if (fram <= 0.001) continue
        const vidd = Math.min(1, Math.max(0, (ute - l.vanta) / (1 - l.vanta)))
        /**
         * Ledarna lämnar änden spridda över mynningens bredd, inte ur en
         * och samma punkt. Utgår alla ur en punkt blir knippet en solfjäder
         * av ekrar — ett hjul, inte ett knippe. Några bildpunkters skillnad
         * i utgångsläge är hela skillnaden.
         */
        const [sxk, syk] = bana(uFram)
        const ax = sxk + l.bukt * TJ * 1.1
        const ay = syk + 4
        /**
         * Fallet är det viktiga. En ledare som går rakt ut i sidled är en
         * eker; en som faller först och vecklar ut sig på vägen ned är en
         * kabel som hänger. Sidledsrörelsen växer därför med kvadraten på
         * hur långt ned man kommit, medan fallet är jämnt.
         *
         * Bredden börjar inte på noll utan på en dryg tiondel: ett knippe
         * som faller exakt rakt ned är en enda tjock linje, inte flera
         * ledare som ännu inte skilts åt.
         *
         * Hela knippet växer dessutom ut ur änden med `fram`. Det är det
         * som är uppvecklingen: när man väl är nere hos kabeln rullar
         * ledarna ut ur den, de ligger inte och väntar färdiga.
         */
        const mx = ax + l.mal * w * (0.05 + 0.35 * vidd)
        const my = h * (1.18 - Math.min(0.95, Math.abs(l.mal)) * 0.32 * vidd)
        const bx = ax + (mx - ax) * fram
        const by = ay + (my - ay) * fram
        if (by - ay < 8) continue

        const pkt: [number, number][] = []
        const n = 14
        for (let i = 0; i <= n; i++) {
          const s = i / n
          // Liten våg längs ledaren, som en tråd som inte är spänd.
          const vag = Math.sin(s * 8 + l.fas + t * 0.6) * 6 * s
          pkt.push([
            ax + (bx - ax) * s * s * (1.15 - 0.15 * s) + vag,
            ay + (by - ay) * s,
          ])
        }
        // Färre lager och mindre svärta i kanten än manteln har. En tunn
        // ledare som skuggas lika hårt som en grov mantel tappar sin färg
        // och blir grå — det är kulören som ska säga att de är många och
        // olika, så den får väga tyngst.
        // Ledarna grovnar med manteln. Ett knippe hårstrån ur en
        // brandslang är inte samma föremål som en kabel som skalats upp.
        const ltj = l.tj * (TJ / 58)
        dra(pkt, ltj, l.kant, l.farg, LEDAR_LJUS, 3, false, 0.6 * (0.5 + l.djup * 0.5))

        // Spetsen glöder alltid, inte bara medan den växer. Det är
        // glöden mot det ljusa som gör bilden — en vit kabel som slutar i
        // ingenting är en vit kabel som tar slut.
        const [sx, sy] = pkt[pkt.length - 1]
        const puls = 0.82 + Math.sin(t * 1.6 + l.fas) * 0.18
        spets(sx, sy, (10 + ltj) * puls)
      }

      /* ── Manteln, från kabelns början fram till snittet ──────────────── */
      const mp: [number, number][] = []
      // Tätare punkter än penseldragen behövde. Mappningen har inga mjuka
      // kurvor mellan punkterna — varje segment är rakt — så det är
      // upplösningen på polylinjen som avgör hur mjuk banan ser ut.
      const n = 40
      // Ingen kabel alls förrän änden hunnit in i bilden. Utan det ritas en
      // bana med noll längd, och ett penseldrag med rund ände blir en prick
      // uppe i hörnet — en kabel som ännu inte finns ska inte finnas.
      if (uFram < 0.004) return
      for (let i = 0; i <= n; i++) mp.push(bana((uFram * i) / n))
      kastskugga(mp, TJ)
      if (yta.current) mappa(mp, TJ, yta.current)

      /* ── Änden: hel medan den firas ned, uppskuren när den är framme ─── */
      {
        const [sx, sy] = bana(uFram)
        // Kabelns egen riktning vid änden. Flikarna räknas i den och inte
        // i bildens lodräta: en kabel som svänger måste ha sitt snitt tvärs
        // sig själv, annars sitter flikarna snett på sin egen mantel.
        const [fx0, fy0] = bana(Math.max(0, uFram - 0.02))
        const tl = Math.hypot(sx - fx0, sy - fy0) || 1
        const tx = (sx - fx0) / tl
        const ty = (sy - fy0) / tl
        const nx = -ty
        const ny = tx

        for (const sida of oppen > 0.01 ? [-1, 1] : []) {
          /**
           * Fliken viker sig utåt och tillbaka uppför kabeln, inte rakt ut
           * åt sidan. Det är så man skalar: man skär manteln och drar den
           * bakåt, och gummit blir kvar som två uppkrupna kragar. Rakt ut
           * åt sidan blev de i stället två vingar på var sin sida om
           * snittet — ett propellerblad, inte en avskalad kabel.
           *
           * De två är olika långa med flit. Ingen som skalat en kabel har
           * fått två lika stora flikar, och symmetrin var det som såg
           * tillverkat ut även när formen var rätt.
           */
          const flik: [number, number][] = []
          const langdF = TJ * (sida < 0 ? 1.35 : 1.05) * oppen
          let fx = sx + nx * sida * TJ * 0.24 - tx * TJ * 0.1
          let fy = sy + ny * sida * TJ * 0.24 - ty * TJ * 0.1
          flik.push([fx, fy])
          for (let i = 1; i <= 9; i++) {
            const s = i / 9
            // Vinkeln vrider sig från framåt längs kabeln till bakåt-utåt.
            const a = Math.PI * (0.1 + 0.66 * s * oppen)
            fx += (tx * Math.cos(a) + nx * sida * Math.sin(a)) * (langdF / 9)
            fy += (ty * Math.cos(a) + ny * sida * Math.sin(a)) * (langdF / 9)
            flik.push([fx, fy])
          }
          kastskugga(flik, TJ * 0.3)
          if (yta.current) mappa(flik, TJ * 0.3, yta.current)
        }

        /**
         * Ändytan, tvärs kabeln och inte vågrätt i bilden.
         *
         * Medan kabeln firas ned är det en hel, ren avskuren ände: mörkare
         * än manteln men inte svart, med en ljus kant mot ljuset. Utan den
         * slutar mappningen tvärt i en rak kant, och en rak kant tvärs en
         * cylinder läser som att kabeln är avklippt av bildens ram i
         * stället för att ha en ände.
         *
         * När den öppnar sig blir samma ellips i stället hålet in i
         * knippet: bredare och mörkare.
         */
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(Math.atan2(ty, tx))
        // Mynningen blir inte längre i kabelns riktning när den öppnar
        // sig — det är flikarna som viker undan, inte hålet som växer
        // på längden. Lät man den bli det blev änden en grå slant
        // klistrad på kabeln.
        const rb = TJ * (0.12 + 0.05 * oppen)
        ctx.fillStyle = blanda(LEDAR_MITT, SNITT_INSIDA, 0.4 + oppen * 0.6)
        ctx.beginPath()
        ctx.ellipse(0, 0, rb, TJ * 0.44, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = ytaFarg(6)
        ctx.lineWidth = Math.max(1.2, TJ * 0.035)
        ctx.beginPath()
        ctx.ellipse(0, 0, rb, TJ * 0.44, 0, Math.PI * 0.55, Math.PI * 1.45)
        ctx.stroke()
        ctx.restore()
      }
    },
    /**
     * Kabeln har tunna, ljusa kanter mot ett ljust papper och behöver
     * tätheten. Att sänka den lönar sig inte heller: en duk som inte är
     * lika stor som sin ruta måste skalas när den läggs på plats, och
     * tre fjärdedelars täthet mättes långsammare än full — inte snabbare,
     * trots fyrtiofyra procent färre bildpunkter att rita.
     */
    1.5,
  )

  return (
    <div className="bg-hall" aria-hidden="true" ref={hall}>
      <canvas className="bg bg--cord" ref={ref} />
    </div>
  )
}

/* ── Små färghjälpare för kabeln ──────────────────────────────────────── */

/* Funktionsdeklaration och inte en konstant med pil: kabelns färger räknas
   fram när modulen läses in, alltså ovanför den här raden i filen, och en
   konstant finns inte förrän raden körts. */
function tal(h: string) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
}

/**
 * Blandar två hexfärger och svarar med hex.
 *
 * Svaret måste vara hex och inte `rgb(...)`, för blandningar blandas
 * vidare: kabelns lager räknas fram ur redan blandade färger, och den här
 * funktionen kan bara läsa hex.
 */
function blanda(a: string, b: string, f: number) {
  const [ar, ag, ab] = tal(a)
  const [br, bg, bb] = tal(b)
  const par = (x: number, y: number) =>
    Math.round(x + (y - x) * f).toString(16).padStart(2, '0')
  return `#${par(ar, br)}${par(ag, bg)}${par(ab, bb)}`
}

