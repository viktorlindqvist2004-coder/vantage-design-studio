import { useRef } from 'react'
import { useFrame } from '../lib/hooks'
import { mapRange } from '../lib/math'
import { CROSSFADE, SHOTS } from '../data/film'
import type { ShotRange } from './Film'
import type { Frame } from '../lib/scroll'

/**
 * RUMMET
 * ══════
 * Platserna kameran besöker efter skärmen. Till skillnad från skärmklippet
 * dras de inte av scrollen — de rullar i sin egen takt, om och om igen.
 * Scrollen bestämmer bara vilken plats som visas.
 *
 * Skälet är enkelt: ett klipp som står still när handen står still är
 * ingen film, det är ett fotografi. Rummet ska leva medan man läser. Det
 * som ska följa handen är kameran in i skärmen, ingenting annat.
 *
 * Varje klipp är klippt så att det går fram och tillbaka, så loopen inte
 * har någon skarv. Övergången mellan två platser är en övertoning, inte
 * ett hopp — och den första tonar in över skrivbordet man just lämnat.
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

      // Ingen laddar fyra klipp i förväg. Varje plats hämtas hem när den
      // är ungefär en fönsterhöjd bort — långt innan den syns, men först
      // när man är på väg dit.
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
      if (live && el.paused && el.readyState >= 2) el.play().catch(() => {})
      else if (!live && !el.paused) el.pause()
    })
  })

  return (
    <div className="room" aria-hidden="true">
      {SHOTS.map((shot) => (
        <video
          key={shot.id}
          className="room__clip"
          ref={(el) => { els.current[shot.id] = el }}
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
