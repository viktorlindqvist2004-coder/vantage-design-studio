import { useRef } from 'react'
import { useFrame } from '../../lib/hooks'
import { useTrack } from '../../lib/track'
import { clamp, clamp01, lerp } from '../../lib/math'
import { OFFERINGS } from '../../data/content'
import { OfferingMedia } from '../OfferingMedia'

/**
 * Vad vi bygger, på ett vågrätt band. Sektionen är hög, innehållet nålas
 * fast i fönstret och den lodräta rörelsen översätts till vågrät.
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

    // Bandet ställs så att ett kort står mitt i rutan vid varje läge.
    // Räknades förflyttningen i stället som en andel av hela banans längd
    // skulle korten hamna där de råkade hamna — nära kanten i ena änden,
    // halvt utanför i den andra — och lägena kändes godtyckliga.
    const pos = clamp(t.pin * (OFFERINGS.length - 1), 0, OFFERINGS.length - 1)
    const centre = (i: number) => {
      const card = cardRefs.current[clamp(Math.round(i), 0, OFFERINGS.length - 1)]
      return card ? card.offsetLeft + card.offsetWidth / 2 - f.vw / 2 : 0
    }
    const lo = Math.floor(pos)
    const x = -lerp(centre(lo), centre(lo + 1), pos - lo)
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
      const i = Math.round(pos) + 1
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
      data-stations={OFFERINGS.length}
      style={{ height: `${100 + OFFERINGS.length * 58}vh` }}
    >
      <div className="pin__inner" ref={pinRef}>
        <div className="work__head">
          <div>
            <span className="label">Vad vi bygger</span>
            <p className="work__note">
              Vilken sorts webbplats ni än behöver, och oavsett bransch.
              Behöver ni något som inte står här bygger vi det också.
            </p>
          </div>
          <span className="work__count">
            <b ref={countRef}>01</b> — {String(OFFERINGS.length).padStart(2, '0')}
          </span>
        </div>

        <div className="work__track" ref={trackRef}>
          {OFFERINGS.map((o, i) => (
            <article
              className="card"
              key={o.name}
              ref={(el) => { cardRefs.current[i] = el }}
            >
              <div className="card__frame">
                <OfferingMedia offering={o} index={i} />
              </div>
              <div className="card__meta">
                <h3 className="card__name">{o.name}</h3>
                <span className="card__tag">{o.kind}</span>
              </div>
              <p className="card__desc">{o.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
