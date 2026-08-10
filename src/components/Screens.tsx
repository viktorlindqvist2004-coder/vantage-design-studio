import { useRef } from 'react'
import { clamp01 } from '../lib/math'
import { reducedMotion, useTick } from '../lib/motion'

/**
 * SKÄRMARNA
 * ═════════
 * Tre bildskärmar som står i djupet, vridna mot varandra, med riktiga
 * webbplatser som rullar på dem. De vrider sig efter pekaren och rullar i
 * takt med att man tar sig genom partiet.
 *
 * Det här är sidans enda plats med föremål i stället för form, och det är
 * med avsikt: en studio som bygger webbplatser ska visa webbplatser. Att
 * det som rullar på skärmarna är ritat och inte fotograferat är dessutom
 * ärligare än ett montage av någon annans sajt — det är sorter av sidor,
 * inte utförda uppdrag.
 *
 * Allt är vanliga element med 3D-transform. Ingen duk, ingen bild: en
 * skärm är en ruta med rundade hörn, och sidan på den är en avlång ruta
 * som skjuts uppåt. Webbläsaren flyttar dem på grafikkortet, och hela
 * scenen kostar därför nästan ingenting trots att den ser dyr ut.
 */

/** En rad på den lilla sidan: bredd i procent, höjd i bildpunkter, ton. */
type Rad = [number, number, number]

/** Sorterna av sida som rullar på skärmarna. */
const SIDOR: { namn: string; rader: Rad[] }[] = [
  {
    namn: 'Företagswebbplats',
    rader: [
      [100, 46, 0.14], [62, 13, 0.5], [44, 13, 0.3], [30, 9, 0.22],
      [100, 74, 0.1], [48, 11, 0.34], [48, 11, 0.34],
      [100, 40, 0.08], [70, 12, 0.3], [40, 12, 0.24], [90, 58, 0.12],
      [55, 12, 0.3], [35, 12, 0.22], [100, 66, 0.09],
    ],
  },
  {
    namn: 'E-handel',
    rader: [
      [100, 34, 0.12], [100, 96, 0.16], [31, 52, 0.22], [31, 52, 0.2],
      [31, 52, 0.24], [31, 52, 0.18], [31, 52, 0.22], [31, 52, 0.2],
      [66, 13, 0.34], [40, 13, 0.24], [100, 60, 0.1], [50, 12, 0.3],
    ],
  },
  {
    namn: 'Bokning',
    rader: [
      [100, 40, 0.13], [74, 14, 0.4], [100, 84, 0.14],
      [23, 23, 0.24], [23, 23, 0.3], [23, 23, 0.2], [23, 23, 0.26],
      [58, 12, 0.32], [38, 12, 0.22], [100, 54, 0.12], [46, 12, 0.3],
    ],
  },
]

/** En liten webbplats som rullar inuti en skärm. */
function MiniSida({ sida }: { sida: (typeof SIDOR)[number] }) {
  return (
    <div className="skarm__sida">
      {/* Listen högst upp på den lilla sidan — den gör att man läser rutan
          som en webbplats och inte som ett diagram. */}
      <div className="skarm__list">
        <i /><i /><i />
      </div>
      {sida.rader.map((r, i) => (
        <span
          key={i}
          className="skarm__rad"
          style={{ width: `${r[0]}%`, height: r[1], opacity: r[2] }}
        />
      ))}
    </div>
  )
}

export function Screens() {
  const scen = useRef<HTMLDivElement>(null)
  const sidor = useRef<(HTMLDivElement | null)[]>([])

  /**
   * Scenen vrids av två saker: var man är i partiet, och var pekaren är.
   *
   * Scrollen sköter den stora rörelsen — hela klungan svänger förbi — och
   * pekaren lägger på en liten lutning ovanpå. Det är den kombinationen
   * som gör att klungan känns som ett föremål i ett rum och inte som en
   * bild som animeras.
   */
  const pek = useRef({ x: 0, y: 0 })

  useTick(() => {
    const el = scen.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    if (r.bottom < -200 || r.top > vh + 200) return

    // -1 när partiet är på väg in underifrån, 0 mitt i rutan, 1 på väg ut.
    const c = (r.top + r.height / 2 - vh / 2) / vh
    const sv = Math.max(-1.2, Math.min(1.2, c))

    const rx = pek.current.y * 7 - sv * 5
    const ry = pek.current.x * 12 + sv * 16
    el.style.transform =
      `perspective(1700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) `
      + `translate3d(${(-sv * 60).toFixed(1)}px, ${(sv * 26).toFixed(1)}px, ${(-Math.abs(sv) * 180).toFixed(0)}px)`

    // Sidorna på skärmarna rullar när man tar sig genom partiet. Varje
    // skärm har sin egen fart, annars ser de ut att vara samma bild.
    const p = clamp01(0.5 - c)
    for (let i = 0; i < sidor.current.length; i++) {
      const s = sidor.current[i]
      if (!s) continue
      const langd = s.scrollHeight - (s.parentElement?.clientHeight ?? 0)
      if (langd <= 0) continue
      const fart = [1, 0.62, 1.35][i] ?? 1
      s.style.transform = `translate3d(0, ${(-langd * clamp01(p * fart)).toFixed(1)}px, 0)`
    }
  })

  const påPek = (e: React.PointerEvent) => {
    if (reducedMotion()) return
    const r = e.currentTarget.getBoundingClientRect()
    pek.current = {
      x: (e.clientX - r.left) / r.width - 0.5,
      y: (e.clientY - r.top) / r.height - 0.5,
    }
  }
  const påUt = () => { pek.current = { x: 0, y: 0 } }

  return (
    <div className="skarmar" onPointerMove={påPek} onPointerLeave={påUt}>
      <div className="skarmar__scen" ref={scen}>
        {SIDOR.map((s, i) => (
          <div className={`skarm skarm--${i}`} key={s.namn}>
            <div className="skarm__ram">
              <div className="skarm__glas">
                <div
                  className="skarm__rull"
                  ref={(el) => { sidor.current[i] = el }}
                >
                  <MiniSida sida={s} />
                </div>
                {/* Reflexen. Utan den läser rutan som en platta med
                    innehåll; med den läser den som glas. */}
                <span className="skarm__glans" aria-hidden="true" />
              </div>
            </div>
            <span className="skarm__fot" aria-hidden="true" />
            <span className="skarm__namn">{s.namn}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
