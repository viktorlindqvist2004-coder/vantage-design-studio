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

/* ── Ritningen: bakom arbetsgången ────────────────────────────────────── */

/**
 * Ett ritningsraster med måttlinjer, som andas.
 *
 * Partiet handlar om ett arbete som görs i ordning och redovisas öppet, och
 * ett ritningsraster säger det utan ett ord. Handen drar med sig ett
 * hårkors — det är det enda som händer, och det räcker: ytan blir en
 * arbetsyta man står vid i stället för en bakgrund man tittar på.
 */
export function Blueprint() {
  const ref = useCanvas(
    () => {},
    ({ ctx, w, h, px, py, inne, t }: Scen) => {
      ctx.clearRect(0, 0, w, h)
      const steg = 52
      // Rastret driver långsamt, så att ytan aldrig står helt still.
      const drift = (t * 5) % steg

      ctx.strokeStyle = 'rgba(12,12,13,0.055)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = -steg + drift; x < w + steg; x += steg) {
        ctx.moveTo(Math.round(x) + 0.5, 0)
        ctx.lineTo(Math.round(x) + 0.5, h)
      }
      for (let y = -steg + drift; y < h + steg; y += steg) {
        ctx.moveTo(0, Math.round(y) + 0.5)
        ctx.lineTo(w, Math.round(y) + 0.5)
      }
      ctx.stroke()

      // Var femte linje är kraftigare — det är vad som gör det till en
      // ritning och inte till rutat papper.
      ctx.strokeStyle = 'rgba(12,12,13,0.1)'
      ctx.beginPath()
      for (let x = -steg * 5 + drift; x < w + steg * 5; x += steg * 5) {
        ctx.moveTo(Math.round(x) + 0.5, 0)
        ctx.lineTo(Math.round(x) + 0.5, h)
      }
      ctx.stroke()

      if (!inne) return

      // Hårkorset, med måttmarkeringar som lyser upp nära handen.
      ctx.strokeStyle = 'rgba(255,74,23,0.34)'
      ctx.beginPath()
      ctx.moveTo(0, Math.round(py) + 0.5)
      ctx.lineTo(w, Math.round(py) + 0.5)
      ctx.moveTo(Math.round(px) + 0.5, 0)
      ctx.lineTo(Math.round(px) + 0.5, h)
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,74,23,0.5)'
      for (let i = -4; i <= 4; i++) {
        const bl = 1 - Math.abs(i) / 5
        ctx.globalAlpha = bl
        ctx.fillRect(px + i * steg - 1, py - 5, 2, 10)
        ctx.fillRect(px - 5, py + i * steg - 1, 10, 2)
      }
      ctx.globalAlpha = 1
    },
  )

  return (
    <div className="bg-hall" aria-hidden="true">
      <canvas className="bg bg--blueprint" ref={ref} />
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
