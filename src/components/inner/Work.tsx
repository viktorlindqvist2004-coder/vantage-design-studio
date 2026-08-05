import { useRef } from 'react'
import { useFrame } from '../../lib/hooks'
import { useTrack } from '../../lib/track'
import { clamp, clamp01 } from '../../lib/math'
import { PROJECTS } from '../../data/content'
import { ProjectMedia } from '../ProjectMedia'

/**
 * Arbetena ligger på ett vågrätt band. Sektionen är hög, innehållet nålas fast
 * i fönstret och lodrät scroll översätts till vågrät förflyttning.
 */
export function Work() {
  const secRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const track = useTrack(secRef)

  useFrame((f) => {
    const t = track(f)

    if (pinRef.current) {
      pinRef.current.style.transform = `translate3d(0, ${t.offset.toFixed(1)}px, 0)`
    }

    const rail = trackRef.current
    if (!rail) return

    const distance = Math.max(rail.scrollWidth - f.vw, 0)
    const x = -t.pin * distance
    rail.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`

    // Bilden zoomar in medan kortet vandrar mot mitten och ut igen, och rör
    // sig samtidigt långsammare i sidled än kortet självt.
    cardRefs.current.forEach((el) => {
      if (!el) return
      const art = el.querySelector<HTMLElement>('.card__art')
      if (!art) return
      const center = el.offsetLeft + el.offsetWidth / 2 + x
      const away = (center - f.vw / 2) / f.vw
      const zoom = 1.02 + Math.min(Math.abs(away), 1.2) * 0.3
      art.style.transform =
        `translate3d(${(away * -6).toFixed(2)}%, 0, 0) scale(${zoom.toFixed(3)})`
      el.style.opacity = (1 - clamp01(Math.abs(away) - 0.6) * 1.4).toFixed(3)
    })

    if (countRef.current) {
      const i = Math.round(clamp(t.pin * (PROJECTS.length - 1), 0, PROJECTS.length - 1)) + 1
      const label = String(i).padStart(2, '0')
      if (countRef.current.textContent !== label) countRef.current.textContent = label
    }
  })

  return (
    <section
      className="pin"
      ref={secRef}
      id="arbeten"
      data-station
      data-stations={PROJECTS.length}
      style={{ height: `${100 + PROJECTS.length * 58}vh` }}
    >
      <div className="pin__inner" ref={pinRef}>
        <div className="work__head">
          <span className="label">Urval — konceptarbeten</span>
          <span className="work__count">
            <b ref={countRef}>01</b> — {String(PROJECTS.length).padStart(2, '0')}
          </span>
        </div>

        <div className="work__track" ref={trackRef}>
          {PROJECTS.map((p, i) => (
            <article
              className="card"
              key={p.name}
              ref={(el) => { cardRefs.current[i] = el }}
            >
              <div className="card__frame">
                <ProjectMedia project={p} index={i} />
              </div>
              <div className="card__meta">
                <h3 className="card__name">{p.name}</h3>
                <span className="card__tag">
                  {p.sector}
                  <br />
                  {p.tags}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
