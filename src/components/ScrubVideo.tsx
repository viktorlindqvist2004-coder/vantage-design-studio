import { useEffect, useRef, useState } from 'react'
import { useFrame } from '../lib/hooks'
import { clamp01 } from '../lib/math'

/**
 * VIDEO SOM FÖLJER SCROLLEN
 * ═════════════════════════
 * I stället för att spela klippet i egen takt sätts uppspelningspunkten
 * direkt av scrollpositionen. Det är skillnaden mellan en film som råkar
 * ligga i bakgrunden och en kamera man själv styr.
 *
 * Klippen måste kodas om innan de läggs in — se scripts/prepare-clip.mjs.
 * En vanlig MP4 har en nyckelbildruta varannan sekund, och webbläsaren kan
 * bara hoppa till närmaste sådan. Att dra i scrollhjulet ger då ryckiga
 * skutt. Med en nyckelbildruta på varje ruta blir varje position sökbar och
 * bilden följer handen exakt.
 */
export function ScrubVideo({
  src,
  /** Returnerar 0–1: var i klippet vi ska stå just nu. */
  progress,
  className = '',
  poster,
  onFail,
}: {
  src: string
  progress: (f: import('../lib/scroll').Frame) => number
  className?: string
  poster?: string
  onFail?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const last = useRef(-1)

  // iOS börjar inte avkoda förrän videon rörts vid. Ett tyst play/pause
  // direkt efter inladdning gör den sökbar utan att något syns.
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const prime = () => {
      v.play().then(() => { v.pause(); v.currentTime = 0 }).catch(() => {})
    }
    if (v.readyState >= 2) prime()
    else v.addEventListener('loadeddata', prime, { once: true })
  }, [])

  useFrame((f) => {
    const v = ref.current
    if (!v || !ready) return

    const d = v.duration
    if (!d || !isFinite(d)) return

    const t = clamp01(progress(f)) * d
    // Att skriva currentTime varje bildruta med samma värde tvingar fram
    // onödiga sökningar; en liten tröskel räcker gott.
    if (Math.abs(t - last.current) < 1 / 240) return
    last.current = t
    v.currentTime = t
  })

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      // Videon spelas aldrig av sig själv — scrollen är enda drivkraften.
      onLoadedData={() => setReady(true)}
      onError={onFail}
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}
