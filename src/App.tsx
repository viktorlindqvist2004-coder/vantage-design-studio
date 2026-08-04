import { useEffect, useRef, useState } from 'react'
import { CameraProvider, cameraProgress, useCamera } from './components/Stage'
import { Scene } from './components/Scene'
import { ScreenContent } from './components/ScreenContent'
import { Cursor, Hint, Nav, Progress } from './components/Overlay'
import { Preloader, TitlePlate } from './components/Plates'
import { RoomFilm, filmLength } from './components/RoomFilm'
import { useFrame, usePrefersReducedMotion, useViewport } from './lib/hooks'
import { mapRange } from './lib/math'
import { setMetrics, start, stop } from './lib/scroll'

/** Scrollsträcka för in- respektive utzoomningen, i fönsterhöjder. */
const ACT1_VH = 4.6
const ACT3_VH = 2.6

export default function App() {
  return (
    <CameraProvider>
      <Experience />
    </CameraProvider>
  )
}

function Experience() {
  const { vh } = useViewport()
  const cam = useCamera()
  const reduced = usePrefersReducedMotion()

  const [contentHeight, setContentHeight] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [showPreloader, setShowPreloader] = useState(true)

  const viewportRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)

  // Utan akt 1 och 3 startar sidan direkt inne i skärmen och blir en helt
  // vanlig sida — ingen kamerarörelse alls.
  const act1 = reduced ? 0 : vh * ACT1_VH
  const act3 = reduced ? 0 : vh * ACT3_VH
  const innerMax = Math.max(contentHeight - vh, 0)
  // Kameraresan genom rummet efter utzoomningen.
  const filmMax = reduced ? 0 : filmLength(vh)

  // Sidans höjd är summan av akterna — det är den enda scrollytan.
  const total = act1 + innerMax + act3 + filmMax + vh

  useEffect(() => {
    setMetrics({ act1, act3, innerMax, filmMax })
  }, [act1, act3, innerMax, filmMax])

  useEffect(() => {
    // Börja alltid vid rummet, även efter en omladdning mitt i sidan.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    start()
    return () => stop()
  }, [])

  useEffect(() => {
    let cancelled = false
    const ready = () => {
      if (cancelled) return
      setLoaded(true)
      // Låt draperiet åka upp innan det plockas bort ur DOM:en.
      window.setTimeout(() => !cancelled && setShowPreloader(false), 1200)
    }
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    const wait = fonts?.ready ?? Promise.resolve()
    Promise.race([wait, new Promise((r) => setTimeout(r, 2600))])
      .then(() => setTimeout(ready, 900))
    return () => { cancelled = true }
  }, [])

  useFrame((f) => {
    const u = cameraProgress(f.act1, f.act3)

    if (cameraRef.current) {
      // Kameran centrerar skärmytan, plus en lätt drift efter muspekaren som
      // klingar av när vi väl är inne i skärmen.
      const driftX = -f.pointerX * 16 * (1 - u)
      const driftY = -f.pointerY * 10 * (1 - u)
      cameraRef.current.style.transform =
        `translate3d(${(cam.dx * u + driftX).toFixed(2)}px, ${(cam.dy * u + driftY).toFixed(2)}px, 0)`
    }

    // Väl inne i skärmen behövs inte rummet — klassen plockar bort det ur
    // renderingen och släpper på pekhändelser till sidan därinne.
    viewportRef.current?.classList.toggle('is-inside', u > 0.985)

    // Skrivbordsscenen tonas ut när kameraresan tar vid, så att övergången
    // blir en mjuk övertoning i stället för ett klipp.
    if (sceneRef.current) {
      const handOver = f.filmMax > 0 ? mapRange(f.film, 0, f.vh * 0.4) : 0
      sceneRef.current.style.opacity = (1 - handOver).toFixed(3)
      sceneRef.current.style.visibility = handOver >= 0.995 ? 'hidden' : 'visible'
    }
  })

  return (
    <>
      <a className="skip-link" href="#kontakt">Hoppa till kontaktuppgifter</a>

      <div className="viewport" ref={viewportRef}>
        <div className="camera" ref={cameraRef}>
          <div className="camera__scene" ref={sceneRef}>
            <Scene
              screen={<ScreenContent onHeight={setContentHeight} reduced={reduced} />}
            />
          </div>
        </div>

        {/* Kameraresan genom rummet tar vid när vi backat ut ur skärmen. */}
        {!reduced && <RoomFilm />}

        {!reduced && (
          <>
            <TitlePlate />
            <Hint />
          </>
        )}
        <Nav />
        <Progress />
        <Cursor />
      </div>

      {/* Själva scrollytan: tom, hög och osynlig. */}
      <div className="scroll-spacer" style={{ height: `${total}px` }} aria-hidden="true" />

      {showPreloader && <Preloader done={loaded} />}
    </>
  )
}
