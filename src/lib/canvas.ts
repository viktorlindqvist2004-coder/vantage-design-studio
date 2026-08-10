import { useEffect, useRef } from 'react'
import { onTick, reducedMotion } from './motion'

/**
 * DUKEN
 * ═════
 * Varje parti på sidan har en egen levande bakgrund, och alla behöver
 * samma sak: rätt storlek på rätt skärm, pekarens läge, en klocka, och att
 * ingenting räknas när partiet inte syns. Det är den riggen som bor här,
 * så att varje bakgrund bara innehåller sin egen idé.
 *
 * Tre saker gör att nio dukar på en sida inte kostar något:
 *
 *  1. Bara den som syns ritas. Rullar man förbi ett parti slutar det
 *     räkna helt — i praktiken är det aldrig fler än två i gång.
 *  2. Pekarens läge kommer i fönstrets koordinater och räknas om till
 *     dukens en gång per bildruta. Att läsa elementets ruta tvingar fram
 *     ett layoutvarv, och en pekare skickar hundra händelser i sekunden.
 *  3. Allt hänger i det enda rAF-varvet i motion.ts. Ingen startar eget.
 */

export type Scen = {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  /** Pekaren i dukens koordinater. */
  px: number
  py: number
  /** Sant när pekaren är i eller nära duken. */
  inne: boolean
  /** Sekunder sedan duken vaknade, och sedan förra rutan. */
  t: number
  dt: number
}

/**
 * `bygg` körs när storleken ändras — där skapas partiklar och annat som
 * beror på ytan. `rita` körs varje bildruta duken syns.
 */
export function useCanvas(
  bygg: (w: number, h: number) => void,
  rita: (s: Scen) => void,
  /**
   * Tak för bildpunktstätheten.
   *
   * Det här är den enskilt viktigaste siffran i filen. En bakgrund som
   * täcker ett helt parti är lätt 1400×1100 punkter; i dubbel täthet blir
   * det sex miljoner punkter att tömma och fylla varje bildruta, och det
   * ensamt tog sidan från sextio bilder i sekunden till tjugo — oavsett hur
   * lite som ritades i dem.
   *
   * Bakgrunderna är mjuka och lågkontrasta och tål enkel täthet utan att
   * man ser det. Det som har tunna, hårda linjer — kablarna, samtalet —
   * sätter taket högre.
   */
  taktathet = 1,
) {
  const ref = useRef<HTMLCanvasElement>(null)
  const byggRef = useRef(bygg)
  const ritaRef = useRef(rita)
  byggRef.current = bygg
  ritaRef.current = rita

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    const pek = { cx: -9999, cy: -9999 }
    let start = 0
    let sist = 0

    const matt = () => {
      const r = canvas.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      w = r.width
      h = r.height
      const dpr = Math.min(window.devicePixelRatio || 1, taktathet)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      byggRef.current(w, h)
    }

    // ResizeObserver och inte fönstrets resize: partiet kan byta höjd av
    // annat än att fönstret ändras — texten bryts om, ett svar fälls ut.
    const ro = new ResizeObserver(matt)
    ro.observe(canvas)

    const påPek = (e: PointerEvent) => {
      pek.cx = e.clientX
      pek.cy = e.clientY
    }
    window.addEventListener('pointermove', påPek, { passive: true })

    const varv = (nu: number) => {
      if (!start) { start = nu; sist = nu }
      const dt = Math.min(0.05, (nu - sist) / 1000)
      sist = nu
      // Enda läsningen av rutan per bildruta, före allt skrivande.
      const r = canvas.getBoundingClientRect()
      const px = pek.cx - r.left
      const py = pek.cy - r.top
      ritaRef.current({
        ctx,
        w,
        h,
        px,
        py,
        inne: px > -120 && px < w + 120 && py > -120 && py < h + 120,
        t: (nu - start) / 1000,
        dt,
      })
    }

    const städa = () => {
      ro.disconnect()
      window.removeEventListener('pointermove', påPek)
    }

    // Den som bett om lugn får en enda stillbild. Formen finns kvar,
    // rörelsen gör det inte.
    if (reducedMotion()) {
      matt()
      varv(performance.now())
      return städa
    }

    let synlig = false
    // Marginalen gör att duken hinner vakna strax innan den syns, i
    // stället för att första bildrutan blir tom.
    const io = new IntersectionObserver(
      (es) => { synlig = !!es[0]?.isIntersecting },
      { rootMargin: '160px' },
    )
    io.observe(canvas)

    const stopp = onTick((nu) => { if (synlig) varv(nu) })

    return () => {
      io.disconnect()
      stopp()
      städa()
    }
  }, [taktathet])

  return ref
}

/**
 * Ett bullervärde ur lagrade sinusvågor.
 *
 * Riktig simplexbrus är finare men kostar en tabell och en del kod.
 * Tre vågor med orimliga frekvenskvoter upprepar sig inte inom någon yta
 * man ser, och det är allt som behövs för att en strömning ska se
 * organisk ut i stället för att marschera i takt.
 */
export function flode(x: number, y: number, t: number) {
  return (
    Math.sin(x * 0.0035 + t * 0.12)
    + Math.cos(y * 0.0041 - t * 0.09)
    + Math.sin((x + y) * 0.0021 + t * 0.05)
  ) * 1.15
}

/**
 * En glödfläck ritad en gång, att kopiera i stället för att skapa om.
 *
 * Att skapa en radiell toning är dyrt. En sida med sexton kabelspetsar och
 * tjugo stoftkorn skapade nära fyrtio toningar per bildruta och låg på
 * trettio bilder i sekunden av den anledningen ensam. Samma fläck ritad en
 * gång till en liten duk och sedan kopierad kostar nästan ingenting.
 *
 * Fläcken ritas vit och färgas vid kopieringen med `globalAlpha` och
 * sammansättning, så en enda fläck räcker för alla styrkor.
 */
export function glod(radie: number, farg: string) {
  const c = document.createElement('canvas')
  const d = Math.ceil(radie * 2)
  c.width = d
  c.height = d
  const g = c.getContext('2d')
  if (!g) return c
  const t = g.createRadialGradient(radie, radie, 0, radie, radie, radie)
  t.addColorStop(0, farg)
  t.addColorStop(0.45, farg.replace(/[\d.]+\)$/, '0.28)'))
  t.addColorStop(1, farg.replace(/[\d.]+\)$/, '0)'))
  g.fillStyle = t
  g.fillRect(0, 0, d, d)
  return c
}

/** Ett stabilt slumptal ur ett heltal — samma frö ger samma sida. */
export function fro(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}
