import { useEffect, useRef } from 'react'
import { onTick, reducedMotion } from '../lib/motion'

/**
 * KABLARNA
 * ════════
 * Hjältens bild är ingen bild. Det är ett knippe kablar som hänger ned
 * från ovankanten, svajar i sin egen tröghet och reagerar på pekaren och
 * på scrollen. Varje kabel slutar i en glödande spets.
 *
 * Varför räknat och inte filmat: en film av samma sak hade vägt några
 * megabyte, sett likadan ut varje gång och inte kunnat svara på något.
 * Det här väger ett par kilobyte, är aldrig identiskt två gånger, och
 * viker undan när man för pekaren genom det. Det är skillnaden mellan en
 * bakgrund och något som är där.
 *
 * FYSIKEN
 * Varje kabel är en kedja av punkter som hålls ihop av avståndsvillkor och
 * räknas med verlet-integrering: en punkt har ingen fart lagrad utan
 * härleder den ur var den var förra rutan. Det ger tyngd och studs nästan
 * gratis och kan inte explodera på samma sätt som en fjäderlösning kan.
 *
 * Översta punkten är fastlåst. Villkoren löses några varv per ruta —
 * ju fler varv desto styvare kabel. Tre räcker för något som ska se mjukt
 * ut; en stel kabel hade behövt tio och sett ut som en pinne ändå.
 */

/** Så många kablar som mest. Antalet skalas ned på smala skärmar. */
const MAX_KABLAR = 16
/** Punkter per kabel. Fler ger mjukare kurva och mer att räkna. */
const LEDER = 18
/** Hur många varv avståndsvillkoren löses per ruta. */
const VARV = 3
/** Hur långt pekaren når. */
const RACKVIDD = 155

type Punkt = { x: number; y: number; px: number; py: number }
type Kabel = {
  leder: Punkt[]
  /** Var kabeln hänger från, som andel av bredden. */
  fast: number
  langd: number
  /** Egen fas, så att inte alla svajar i takt. */
  fas: number
  ton: number
}

type Stoft = { x: number; y: number; r: number; fart: number; fas: number }

export function Cables() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const stilla = reducedMotion()

    let w = 0
    let h = 0
    let dpr = 1
    let kablar: Kabel[] = []
    let stoft: Stoft[] = []

    /** Pekarens läge, och hur mycket den räknas just nu. */
    const pek = { x: -9999, y: -9999, styrka: 0 }
    /** Hur långt sidan rullats, utjämnat. */
    let rull = 0
    let rullMal = 0

    function bygg() {
      const rect = canvas!.getBoundingClientRect()
      w = rect.width
      h = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(w * dpr)
      canvas!.height = Math.round(h * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Färre kablar på smala skärmar: samma antal på en telefon blir en
      // grå massa i stället för enskilda streck, och kostar lika mycket.
      const antal = Math.max(6, Math.round((w / 1400) * MAX_KABLAR))
      kablar = Array.from({ length: antal }, (_, i) => {
        // Ojämnt fördelade. Ett jämnt raster läser som en kam.
        const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1
        const fast = (i + 0.5) / antal + jitter * (0.5 / antal)
        const langd = h * (0.42 + Math.abs(jitter) * 0.5)
        const steg = langd / (LEDER - 1)
        const x0 = fast * w
        return {
          fast,
          langd,
          fas: Math.abs(jitter) * Math.PI * 2,
          ton: 0.5 + Math.abs(jitter) * 0.5,
          leder: Array.from({ length: LEDER }, (_, j) => ({
            x: x0, y: -30 + j * steg, px: x0, py: -30 + j * steg,
          })),
        }
      })

      stoft = Array.from({ length: Math.round(w / 64) }, (_, i) => {
        const r = (Math.sin(i * 78.233) * 43758.5453) % 1
        return {
          x: Math.abs(r) * w,
          y: Math.abs(Math.cos(i * 3.1)) * h,
          r: 1 + Math.abs(r) * 3.5,
          fart: 0.06 + Math.abs(r) * 0.22,
          fas: Math.abs(r) * Math.PI * 2,
        }
      })
    }

    function stega(nu: number) {
      const t = nu / 1000
      // Scrollen dras in mjukt. Rått värde ger ryck vid varje hjulhack.
      rull += (rullMal - rull) * 0.08

      for (const k of kablar) {
        const x0 = k.fast * w
        const p = k.leder
        // Fästet vandrar en aning i sidled — det är det som gör att hela
        // knippet lever i stället för att bara dingla.
        p[0].x = x0 + Math.sin(t * 0.28 + k.fas) * 14
        p[0].y = -30 + rull * 0.06

        for (let i = 1; i < p.length; i++) {
          const n = p[i]
          const vx = (n.x - n.px) * 0.972
          const vy = (n.y - n.py) * 0.972
          n.px = n.x
          n.py = n.y

          // Tyngd, plus en långsam vind som varierar med djupet i kedjan.
          n.x += vx + Math.sin(t * 0.5 + k.fas + i * 0.22) * 0.12
          n.y += vy + 0.42

          // Pekaren skjuter undan. Kraften avtar med kvadraten på
          // avståndet så att den känns nära och inte når över halva rutan.
          if (pek.styrka > 0.01) {
            const dx = n.x - pek.x
            const dy = n.y - pek.y
            const d2 = dx * dx + dy * dy
            if (d2 < RACKVIDD * RACKVIDD && d2 > 1) {
              const d = Math.sqrt(d2)
              const kraft = (1 - d / RACKVIDD) ** 2 * 13 * pek.styrka
              n.x += (dx / d) * kraft
              n.y += (dy / d) * kraft
            }
          }
        }

        // Avståndsvillkoren. Punkt noll är fast och flyttas aldrig.
        const steg = k.langd / (LEDER - 1)
        for (let v = 0; v < VARV; v++) {
          for (let i = 0; i < p.length - 1; i++) {
            const a = p[i]
            const b = p[i + 1]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.hypot(dx, dy) || 0.0001
            const ratt = ((d - steg) / d) * 0.5
            const ox = dx * ratt
            const oy = dy * ratt
            if (i > 0) { a.x += ox; a.y += oy }
            else { b.x -= ox * 2; b.y -= oy * 2; continue }
            b.x -= ox
            b.y -= oy
          }
        }
      }

      for (const s of stoft) {
        s.y -= s.fart
        s.x += Math.sin(t * 0.3 + s.fas) * 0.16
        if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w }
      }
    }

    function rita() {
      ctx!.clearRect(0, 0, w, h)

      // Stoftet ligger underst — det är luft, inte förgrund.
      for (const s of stoft) {
        const g = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
        g.addColorStop(0, 'rgba(255,120,60,0.22)')
        g.addColorStop(1, 'rgba(255,120,60,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
        ctx!.fill()
      }

      for (const k of kablar) {
        const p = k.leder

        // Kurvan dras genom mittpunkterna mellan lederna. Rakt genom
        // punkterna ger synliga knyckar vid varje led.
        ctx!.beginPath()
        ctx!.moveTo(p[0].x, p[0].y)
        for (let i = 1; i < p.length - 1; i++) {
          ctx!.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2)
        }
        ctx!.lineTo(p[p.length - 1].x, p[p.length - 1].y)
        ctx!.strokeStyle = `rgba(12,12,13,${(0.1 + k.ton * 0.16).toFixed(3)})`
        ctx!.lineWidth = 1 + k.ton * 0.9
        ctx!.lineCap = 'round'
        ctx!.stroke()

        // Spetsen. Glöden ritas som en toning och pricken ovanpå — utan
        // pricken läser glöden som dis, utan glöden som en punkt.
        const tip = p[p.length - 1]
        const r = 26 + k.ton * 16
        const g = ctx!.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, r)
        g.addColorStop(0, `rgba(255,110,40,${(0.34 * k.ton).toFixed(3)})`)
        g.addColorStop(0.4, `rgba(255,140,60,${(0.12 * k.ton).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,140,60,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(tip.x, tip.y, r, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.fillStyle = `rgba(255,74,23,${(0.55 + k.ton * 0.45).toFixed(3)})`
        ctx!.beginPath()
        ctx!.arc(tip.x, tip.y, 2 + k.ton * 1.6, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    bygg()

    // Stillbild för den som bett om lugn: kablarna får falla till ro en
    // gång och ritas sedan aldrig om.
    if (stilla) {
      for (let i = 0; i < 220; i++) stega(i * 16)
      rita()
      return
    }

    const påPek = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pek.x = e.clientX - r.left
      pek.y = e.clientY - r.top
      pek.styrka = 1
    }
    const påUt = () => { pek.styrka = 0 }
    const påRull = () => { rullMal = window.scrollY }
    const påStorlek = () => bygg()

    window.addEventListener('pointermove', påPek, { passive: true })
    window.addEventListener('pointerdown', påPek, { passive: true })
    document.addEventListener('pointerleave', påUt)
    window.addEventListener('scroll', påRull, { passive: true })
    window.addEventListener('resize', påStorlek)

    // Räknas bara medan hjälten kan synas. Att simulera fysik för något
    // som ligger fem skärmar upp är rent slöseri med batteri.
    let synlig = true
    const ob = new IntersectionObserver((e) => { synlig = !!e[0]?.isIntersecting })
    ob.observe(canvas)

    const stopp = onTick((nu) => {
      if (!synlig) return
      stega(nu)
      rita()
    })

    return () => {
      window.removeEventListener('pointermove', påPek)
      window.removeEventListener('pointerdown', påPek)
      document.removeEventListener('pointerleave', påUt)
      window.removeEventListener('scroll', påRull)
      window.removeEventListener('resize', påStorlek)
      ob.disconnect()
      stopp()
    }
  }, [])

  return <canvas className="cables" ref={ref} aria-hidden="true" />
}
