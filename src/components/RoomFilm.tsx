import { useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { mapRange } from '../lib/math'
import { CROSSFADE, ROOM_RATE, SHOTS } from '../data/film'
import type { ShotRange } from './Film'
import type { Frame } from '../lib/scroll'

/**
 * RUMMET
 * ══════
 * Platserna kameran besöker efter skärmen. Till skillnad från skärmklippet
 * dras de inte av scrollen — de rullar i sin egen takt, om och om igen, och
 * så långsamt att bilden nästan står still. Ett rum som fryser när handen
 * fryser är ett fotografi; rummet ska leva medan man läser.
 *
 * Två klipp räcker till fyra platser. Samma klipp visas aldrig två gånger i
 * rad, och de två platser som delar klipp har olika utsnitt — så att en
 * övertoning alltid byter vy, aldrig visar samma bild igen.
 *
 * Klippen är klippta så att de går fram och tillbaka, så loopen inte har
 * någon skarv. Övergången mellan två platser är en övertoning, och den
 * första tonar in över skärmen man just lämnat.
 */
export function RoomFilm({ ranges }: { ranges: Record<string, ShotRange> }) {
  const els = useRef<Record<string, HTMLVideoElement | null>>({})
  /** Klipp som fått order att börja hämtas. */
  const fetched = useRef(new Set<string>())

  useFrame((f) => {
    SHOTS.forEach((shot, i) => {
      const el = els.current[shot.id]
      const range = ranges[shot.id]
      if (!el || !range) return

      // Varje plats hämtas när den är ungefär en fönsterhöjd bort — långt
      // innan den syns, men först när man är på väg dit.
      if (!fetched.current.has(shot.id) && f.film > range.start - f.vh * 1.4) {
        fetched.current.add(shot.id)
        el.preload = 'auto'
        el.load()
      }

      const o = shotOpacity(f, range, i === 0, i === SHOTS.length - 1)
      el.style.opacity = o.toFixed(3)

      // Ett klipp som inte syns ska inte heller avkodas.
      const live = o > 0.004
      el.style.visibility = live ? 'visible' : 'hidden'
      if (live && el.paused && el.readyState >= 2) {
        el.playbackRate = ROOM_RATE
        el.play().catch(() => {})
      } else if (!live && !el.paused) {
        el.pause()
      }
    })
  })

  return (
    <div className="room" aria-hidden="true">
      {SHOTS.map((shot) => (
        <video
          key={shot.id}
          className="room__clip"
          ref={(el) => { els.current[shot.id] = el }}
          style={{
            objectPosition: shot.framing.position,
            transform: `scale(${shot.framing.scale})`,
          }}
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={`${import.meta.env.BASE_URL}clips/${shot.clip}.webm`} type="video/webm" />
          <source src={`${import.meta.env.BASE_URL}clips/${shot.clip}.mp4`} type="video/mp4" />
        </video>
      ))}
    </div>
  )
}

/**
 * Hur synlig en plats är.
 *
 * Platserna gränsar till varandra, så den enas uttoning är den andras
 * intoning — det blir en korsning, inte ett mellanrum. Den första tonar in
 * från noll, där utflygningen just slutat, och den sista blir kvar.
 */
function shotOpacity(f: Frame, range: ShotRange, first: boolean, last: boolean) {
  const half = (CROSSFADE * f.vh) / 2
  const end = range.start + range.length

  const inn = first
    ? mapRange(f.film, 0, half * 2)
    : mapRange(f.film, range.start - half, range.start + half)
  const out = last ? 0 : mapRange(f.film, end - half, end + half)

  return inn * (1 - out)
}
