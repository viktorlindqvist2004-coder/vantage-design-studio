import { useRef } from 'react'
import { useFrame } from '../../lib/hooks'
import { useTrack } from '../../lib/track'
import { clamp, clamp01 } from '../../lib/math'
import { PROCESS } from '../../data/content'

/** Fastnålad process — stegen växlar medan skenan till vänster fylls. */
export function Process() {
  const secRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const paneRefs = useRef<(HTMLDivElement | null)[]>([])
  const track = useTrack(secRef)

  useFrame((f) => {
    const t = track(f)

    if (pinRef.current) {
      pinRef.current.style.transform = `translate3d(0, ${t.offset.toFixed(1)}px, 0)`
    }

    // Var i listan vi befinner oss, som ett flyttal: 0 = första steget.
    // `pin` går från noll till ett mellan platsens ytterlägen, och det finns
    // ett läge per steg — så varje läge landar på ett jämnt tal.
    const pos = clamp(t.pin * (PROCESS.length - 1), 0, PROCESS.length - 1)
    const active = Math.round(pos)

    itemRefs.current.forEach((el, i) => {
      if (!el) return
      el.classList.toggle('proc__item--on', i === active)
    })

    paneRefs.current.forEach((el, i) => {
      if (!el) return
      // Smal överlappning: bara ett stycke i taget är läsbart, annars ligger
      // två texter ovanpå varandra.
      const d = clamp01(1 - Math.abs(pos - i) * 2.6)
      el.style.opacity = d.toFixed(3)
      el.style.transform = `translate3d(0, ${((1 - d) * 16).toFixed(1)}px, 0)`
      el.style.pointerEvents = d > 0.6 ? 'auto' : 'none'
    })
  })

  return (
    <section
      className="pin"
      ref={secRef}
      id="process"
      style={{ height: `${PROCESS.length * 72}vh` }}
    >
      <div className="pin__inner" ref={pinRef}>
        <div className="proc">
          <div>
            <span className="label label--lead">Så arbetar vi</span>
            <ol className="proc__list">
              {PROCESS.map((p, i) => (
                <li
                  className="proc__item"
                  key={p.title}
                  ref={(el) => { itemRefs.current[i] = el }}
                >
                  <span className="proc__item-i">{String(i + 1).padStart(2, '0')}</span>
                  {p.title}
                </li>
              ))}
            </ol>
          </div>

          <div className="proc__panel">
            {PROCESS.map((p, i) => (
              <div
                className="proc__pane"
                key={p.title}
                ref={(el) => { paneRefs.current[i] = el }}
              >
                <h3 className="h-lg">{p.title}</h3>
                <p className="body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
