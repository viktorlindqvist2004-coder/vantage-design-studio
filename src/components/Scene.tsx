import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useCamera, cameraProgress } from './Stage'
import { useFrame } from '../lib/hooks'
import { contentScale, roomScale } from '../lib/scene'
import { mapRange } from '../lib/math'
import { PHOTO, type PhotoScreen } from '../data/scene-photo'

const photoUrl = `${import.meta.env.BASE_URL}${PHOTO.src}`

/**
 * Skrivbordet och sidan, som två plan på olika djup.
 *
 * Rumsplanet ligger närmast och har en genomskinlig öppning där bildskärmen
 * sitter — hålet stansas med en CSS-mask, så det följer automatiskt med om
 * skärmytan justeras i scene-photo.ts. Sidan ligger längre bort, bakom
 * öppningen. När kameran åker framåt växer öppningen snabbare än sidan, och
 * man ser mer och mer av den genom en allt större ram.
 */
export function Scene({ screen }: { screen: ReactNode }) {
  const cam = useCamera()
  const roomRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const softRef = useRef<HTMLImageElement>(null)
  const [missing, setMissing] = useState(false)

  useFrame((f) => {
    const u = cameraProgress(f.act1, f.act3)
    // Lätt andning i vila så att bilden aldrig står helt stilla.
    const breath = f.reduced ? 0 : Math.sin(f.time * 0.00042) * 0.004 * (1 - u)
    const t = cam.travel * (u + breath)

    const room = roomScale(t)

    if (roomRef.current) {
      roomRef.current.style.transform = `scale(${room.toFixed(4)})`
      // När ramen passerat kameran finns inget kvar att visa av rummet.
      const past = room * cam.screenW >= cam.vw && room * cam.screenH >= cam.vh
      roomRef.current.style.visibility = past ? 'hidden' : 'visible'
    }

    if (contentRef.current) {
      contentRef.current.style.transform = `scale(${contentScale(t, cam).toFixed(5)})`
    }

    // Skärpedjupet minskar när kameran närmar sig — som en riktig kamera som
    // ställer om fokus från rummet till skärmen.
    if (softRef.current) {
      softRef.current.style.opacity = mapRange(u, 0, 0.7).toFixed(3)
    }
  })

  const s = PHOTO.screen
  const holeStyle = {
    '--hole-x': `${(s.x * cam.stageW).toFixed(1)}px`,
    '--hole-y': `${(s.y * cam.stageH).toFixed(1)}px`,
    '--hole-w': `${(s.w * cam.stageW).toFixed(1)}px`,
    '--hole-h': `${(s.h * cam.stageH).toFixed(1)}px`,
  } as CSSProperties

  return (
    <div
      className="stage"
      style={{ width: `${cam.stageW}px`, height: `${cam.stageH}px` }}
    >
      {/* Fyller ytorna över och under scenen på höga fönster. */}
      {!missing && (
        <img className="backdrop" src={photoUrl} alt="" aria-hidden="true" decoding="async" />
      )}

      {/* Sidan — längre bort, bakom öppningen. */}
      <div
        className="plane plane--content"
        ref={contentRef}
        style={{
          left: `${cam.originX}px`,
          top: `${cam.originY}px`,
          width: `${cam.vw}px`,
          height: `${cam.vh}px`,
          marginLeft: `${-cam.vw / 2}px`,
          marginTop: `${-cam.vh / 2}px`,
        }}
      >
        {screen}
      </div>

      {/* Rummet — närmast kameran, med hålet där skärmen sitter. */}
      <div
        className={`plane plane--room ${missing ? 'plane--missing' : ''}`}
        ref={roomRef}
        style={{ ...holeStyle, transformOrigin: `${cam.originX}px ${cam.originY}px` }}
      >
        {!missing && (
          <>
            <img
              className="plate__img"
              src={photoUrl}
              alt=""
              aria-hidden="true"
              decoding="async"
              onError={() => setMissing(true)}
              style={{ filter: `blur(${PHOTO.blur}px)` }}
            />
            {/* Samma bild igen, kraftigare oskärpa. Tonas in när kameran
                närmar sig — billigare än att animera blur. */}
            <img
              className="plate__img plate__img--soft"
              ref={softRef}
              src={photoUrl}
              alt=""
              aria-hidden="true"
              decoding="async"
              style={{ filter: `blur(${PHOTO.blurNear}px)` }}
            />
          </>
        )}
        <div className="plate__dim" style={{ opacity: PHOTO.dim }} />
        <div className="plate__vignette" />
      </div>

      <Calibrator />
    </div>
  )
}

/* ── Inpassning av skärmytan ─────────────────────────────────────────────
   Öppna sidan med `?calibrate` för att flytta och storleksändra ramen med
   piltangenterna. Siffrorna klistras sedan in i src/data/scene-photo.ts. */

function Calibrator() {
  const [on, setOn] = useState(false)
  const [rect, setRect] = useState<PhotoScreen>({ ...PHOTO.screen })

  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).has('calibrate'))
  }, [])

  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      const step = e.altKey ? 0.0005 : 0.005
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!d) return
      e.preventDefault()
      setRect((r) =>
        e.shiftKey
          ? { ...r, w: Math.max(0.01, r.w + d[0] * step), h: Math.max(0.01, r.h + d[1] * step) }
          : { ...r, x: r.x + d[0] * step, y: r.y + d[1] * step },
      )
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on])

  if (!on) return null

  const n = (v: number) => Number(v.toFixed(4))

  return (
    <>
      <div
        className="calib__box"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
        }}
      />
      {/* Panelen får inte skalas med scenen, så den ritas utanför den. */}
      {createPortal(
        <div className="calib__panel">
          <strong>Inpassning av skärmyta</strong>
          <span>Piltangenter flyttar · Skift ändrar storlek · Alt = finjustering</span>
          <code>
            screen: {'{'} x: {n(rect.x)}, y: {n(rect.y)}, w: {n(rect.w)}, h: {n(rect.h)} {'}'}
          </code>
          <span>Klistra in raden i src/data/scene-photo.ts</span>
        </div>,
        document.body,
      )}
    </>
  )
}
