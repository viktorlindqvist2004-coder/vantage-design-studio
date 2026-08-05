import { useEffect, useRef, useState } from 'react'
import { ScreenContent } from './components/ScreenContent'
import { Cursor, Hint, Nav, Progress } from './components/Overlay'
import { Contact, Preloader, TitlePlate } from './components/Plates'
import { Film, approachLength, roomLength } from './components/Film'
import { useFrame, usePrefersReducedMotion, useViewport } from './lib/hooks'
import { setMetrics, start, stop } from './lib/scroll'

export default function App() {
  return <Experience />
}

function Experience() {
  const { vh } = useViewport()
  const reduced = usePrefersReducedMotion()

  const [contentHeight, setContentHeight] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [showPreloader, setShowPreloader] = useState(true)

  const viewportRef = useRef<HTMLDivElement>(null)

  // Utan filmen startar sidan direkt vid innehållet och blir en helt vanlig
  // sida — ingen kamerarörelse alls.
  const act1 = reduced ? 0 : approachLength(vh)
  const innerMax = Math.max(contentHeight - vh, 0)
  const filmMax = reduced ? 0 : roomLength(vh)

  // Sidans höjd är summan av skedena — det är den enda scrollytan.
  const total = act1 + innerMax + filmMax + vh

  useEffect(() => {
    setMetrics({ act1, act3: 0, innerMax, filmMax })
  }, [act1, innerMax, filmMax])

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
    // Väl inne vid skärmen släpps pekhändelser igenom till sidan därinne.
    viewportRef.current?.classList.toggle('is-inside', f.act1 > 0.985 && f.film < 1)
  })

  return (
    <>
      <a className="skip-link" href="#kontakt">Hoppa till kontaktuppgifter</a>

      <div className="viewport" ref={viewportRef}>
        {reduced ? (
          <div className="film__page">
            <ScreenContent onHeight={setContentHeight} reduced />
            <Contact variant="static" />
          </div>
        ) : (
          <>
            <Film page={<ScreenContent onHeight={setContentHeight} />} />
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
