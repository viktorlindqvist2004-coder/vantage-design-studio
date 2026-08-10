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
  /** Egen fas och fördröjning, så att de inte växer i takt. */
  fas: number
  vanta: number
}

/**
 * KABELN SOM ÖPPNAR SIG
 * ═════════════════════
 * En grov gummikabel hänger ned genom partiet. En bit in skalas manteln
 * upp, viker sig utåt, och inuti ligger ett knippe färgade ledare som
 * rullar ut och breder ut sig mot underkanten. Allt sker i takt med att
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

      ledare.current = Array.from({ length: 11 }, (_, i) => {
        const f = fro(i * 3 + 1)
        const g = fro(i * 7 + 5)
        return {
          // Jämnt utspridda men inte uppradade: en jämn solfjäder läser
          // som ett diagram, en ojämn som ett knippe som fallit ut.
          mal: (i / 10 - 0.5) * 1.55 + (f - 0.5) * 0.1,
          bukt: (f - 0.5) * 0.34,
          tj: 3.4 + g * 2.6,
          farg: fargr[i % fargr.length],
          fas: f * Math.PI * 2,
          vanta: g * 0.16,
        }
      })
    },
    ({ ctx, w, h, px, inne, t }: Scen) => {
      ctx.clearRect(0, 0, w, h)

      const el = hall.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const langd = r.height - h
      const p = langd > 4 ? Math.min(1, Math.max(0, -r.top / langd)) : 1

      const bas = w * 0.8
      const drag = inne ? (px - bas) * 0.045 : 0
      const x0 = bas + drag

      /** Var manteln är avskuren. Den växer ned och stannar sedan. */
      const snitt = -70 + (h * 0.44 + 70) * Math.min(1, p / 0.3)
      /** Hur uppskalad manteln är, 0–1. */
      const oppen = Math.min(1, Math.max(0, (p - 0.28) / 0.26))
      /** Hur långt ledarna hunnit ut. */
      const ute = Math.min(1, Math.max(0, (p - 0.36) / 0.6))

      /** Manteln böjer sig mjukt på vägen ned. */
      const mantelX = (y: number) =>
        x0 + Math.sin(y * 0.0038 + t * 0.28) * 12 + Math.sin(y * 0.0011) * 22

      /**
       * Ett kabeldrag: sju lager från mörk kant till ljus rygg.
       * `ljus` styr hur mycket spegling draget får — ledare inuti är
       * mattare än manteln utanpå.
       */
      const dra = (
        pkt: [number, number][],
        tj: number,
        kant: string,
        mitt: string,
        ljus: string,
        lager = 7,
      ) => {
        if (pkt.length < 2) return
        const bana = () => {
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
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Skuggan på underlaget.
        ctx.save()
        ctx.translate(tj * 0.16, tj * 0.22)
        bana()
        ctx.lineWidth = tj + 3
        ctx.strokeStyle = 'rgba(58,70,86,0.1)'
        ctx.stroke()
        ctx.restore()

        for (let k = 0; k < lager; k++) {
          const f = k / (lager - 1)
          ctx.save()
          // Varje lager smalnar och kryper uppåt vänster mot ljuset.
          ctx.translate(-tj * 0.2 * f, -tj * 0.22 * f)
          bana()
          ctx.lineWidth = tj * (1 - f * 0.82)
          ctx.strokeStyle = f < 0.5
            ? blanda(kant, mitt, f * 2)
            : blanda(mitt, ljus, (f - 0.5) * 2)
          ctx.stroke()
          ctx.restore()
        }
      }

      /** Ringarna tvärs över manteln. Utan dem är det en slang. */
      const ringa = (pkt: [number, number][], tj: number) => {
        ctx.save()
        ctx.lineCap = 'butt'
        for (let i = 2; i < pkt.length - 1; i += 2) {
          const [ax, ay] = pkt[i]
          const [bx, by] = pkt[i + 1]
          const d = Math.hypot(bx - ax, by - ay) || 1
          const nx = -(by - ay) / d
          const ny = (bx - ax) / d
          ctx.beginPath()
          ctx.moveTo(ax + nx * tj * 0.42, ay + ny * tj * 0.42)
          ctx.lineTo(ax - nx * tj * 0.42, ay - ny * tj * 0.42)
          ctx.lineWidth = 1.4
          ctx.strokeStyle = 'rgba(120,132,148,0.16)'
          ctx.stroke()
        }
        ctx.restore()
      }

      const TJ = 34

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
          ctx.globalAlpha = 0.34
          ctx.drawImage(b, x - d / 2, y - d / 2, d, d)
        }
        if (k) {
          const d = r * 2
          ctx.globalAlpha = 0.85
          ctx.drawImage(k, x - d / 2, y - d / 2, d, d)
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = 'rgba(255,244,220,0.95)'
        ctx.beginPath()
        ctx.arc(x, y, r * 0.24, 0, Math.PI * 2)
        ctx.fill()
      }

      /* ── Diset och stoftet, underst ───────────────────────────────────
         Ett svalt blågrått dis ger djup åt de ljusa formerna. Utan det
         ligger vita kablar mot vitt papper och tappar sin volym. */
      if (svalt.current) {
        const d = w * 1.3
        ctx.globalAlpha = 0.5
        ctx.drawImage(svalt.current, x0 - w * 0.1 - d / 2, h * 0.34 - d / 2, d, d)
        ctx.globalAlpha = 1
      }

      for (let i = 0; i < 16; i++) {
        const f = fro(i * 11 + 3)
        const g2 = fro(i * 5 + 9)
        const bx = ((f + t * 0.006 * (0.4 + g2)) % 1) * w
        const by = ((g2 - t * 0.008 * (0.3 + f)) % 1 + 1) % 1 * h
        const br = 3 + g2 * 12
        const sprite = i % 3 === 0 ? varmt.current : svalt.current
        if (!sprite) continue
        ctx.globalAlpha = 0.2
        ctx.drawImage(sprite, bx - br, by - br, br * 2, br * 2)
        ctx.globalAlpha = 1
      }

      /* ── Ledarna, som ligger under manteln där de kommer ut ──────────── */
      for (const l of ledare.current) {
        const del = Math.min(1, Math.max(0, (ute - l.vanta) / (1 - l.vanta)))
        if (del <= 0.001) continue
        const ax = mantelX(snitt)
        const ay = snitt + 4
        const bx = ax + l.mal * w * 0.62
        const by = h * 1.06
        // Kontrollpunkten ger både hänget och utviket i sidled.
        const cx = ax + l.bukt * w * 0.3
        const cy = ay + (by - ay) * 0.7

        const pkt: [number, number][] = []
        const n = 20
        for (let i = 0; i <= n; i++) {
          const s = (i / n) * del
          const u = 1 - s
          // Liten våg längs ledaren, som en tråd som inte är spänd.
          const vag = Math.sin(s * 9 + l.fas + t * 0.6) * 5 * s
          pkt.push([
            u * u * ax + 2 * u * s * cx + s * s * bx + vag,
            u * u * ay + 2 * u * s * cy + s * s * by,
          ])
        }
        // Färre lager och mindre svärta i kanten än manteln har. En tunn
        // ledare som skuggas lika hårt som en grov mantel tappar sin färg
        // och blir grå — det är kulören som ska säga att de är många och
        // olika, så den får väga tyngst.
        dra(pkt, l.tj, blanda(l.farg, '#7c8794', 0.5), l.farg, '#ffffff', 5)

        // Spetsen glöder alltid, inte bara medan den växer. Det är
        // glöden mot det ljusa som gör bilden — en vit kabel som slutar i
        // ingenting är en vit kabel som tar slut.
        const [sx, sy] = pkt[pkt.length - 1]
        const puls = 0.82 + Math.sin(t * 1.6 + l.fas) * 0.18
        spets(sx, sy, (10 + l.tj) * puls)
      }

      /* ── Manteln ──────────────────────────────────────────────────────── */
      const mp: [number, number][] = []
      const n = 26
      for (let i = 0; i <= n; i++) {
        const y = -70 + ((snitt + 70) * i) / n
        mp.push([mantelX(y), y])
      }
      dra(mp, TJ, '#93a0ad', '#dee3e9', '#ffffff')
      ringa(mp, TJ)
      if (oppen < 0.02) spets(mp[mp.length - 1][0], mp[mp.length - 1][1], 26)

      /* ── Snittet: två flikar som viker sig utåt ──────────────────────── */
      if (oppen > 0.01) {
        const sx = mantelX(snitt)
        for (const sida of [-1, 1]) {
          const vinkel = sida * (0.25 + oppen * 0.95)
          const flik: [number, number][] = []
          const langdF = 46 * oppen
          for (let i = 0; i <= 8; i++) {
            const s = i / 8
            flik.push([
              sx + sida * TJ * 0.3 + Math.sin(vinkel) * langdF * s,
              snitt + Math.cos(vinkel) * langdF * s,
            ])
          }
          dra(flik, TJ * 0.42, '#93a0ad', '#dee3e9', '#ffffff', 5)
        }
        // Den ljusa insidan av snittet, där manteln är genomskuren.
        ctx.save()
        ctx.globalAlpha = oppen
        ctx.fillStyle = '#8e99a6'
        ctx.beginPath()
        ctx.ellipse(sx, snitt, TJ * 0.46, TJ * 0.17, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    },
    1.5,
  )

  return (
    <div className="bg-hall" aria-hidden="true" ref={hall}>
      <canvas className="bg bg--cord" ref={ref} />
    </div>
  )
}

/* ── Små färghjälpare för kabeln ──────────────────────────────────────── */

const tal = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

/** Blandar två hexfärger. Görs i kod för att lagren ska kunna räknas fram. */
function blanda(a: string, b: string, f: number) {
  const [ar, ag, ab] = tal(a)
  const [br, bg, bb] = tal(b)
  return `rgb(${Math.round(ar + (br - ar) * f)},${Math.round(ag + (bg - ag) * f)},${Math.round(ab + (bb - ab) * f)})`
}

