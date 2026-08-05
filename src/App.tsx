import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScreenContent } from './components/ScreenContent'
import { Nav } from './components/Overlay'
import { Contact, Preloader } from './components/Plates'
import { Film, approachLength, roomLength } from './components/Film'
import { useFrame, usePrefersReducedMotion, useViewport } from './lib/hooks'
import { setMetrics, start, stop } from './lib/scroll'
import { setStations, type Station } from './lib/deck'
import { SHOTS } from './data/film'

export default function App() {
  return <Experience />
}

function Experience() {
  const { vh } = useViewport()
  const reduced = usePrefersReducedMotion()

  const [contentHeight, setContentHeight] = useState(0)
  const [innerStations, setInnerStations] = useState<number[]>([0])
  const [loaded, setLoaded] = useState(false)
  const [showPreloader, setShowPreloader] = useState(true)
  // Klippet kan vara omöjligt att visa: ingen WebGL, en kodek webbläsaren
  // inte har, en hämtning som nekas. Då ska sidan bli en vanlig sida i
  // stället för att stå kvar och zooma i ett tomt rum.
  const [filmBroken, setFilmBroken] = useState(false)
  const filmDown = useCallback(() => setFilmBroken(true), [])
  // Draperiet ska ligga kvar tills filmens första bildruta finns att visa.
  // Lyfts det på en klocka i stället hinner man se svart där rummet ska
  // vara, och sidan börjar med ett hål.
  const [clipReady, setClipReady] = useState(false)
  const filmReady = useCallback(() => setClipReady(true), [])

  const viewportRef = useRef<HTMLDivElement>(null)

  // Utan filmen startar sidan direkt vid innehållet och blir en helt vanlig
  // sida — ingen kamerarörelse alls.
  const plain = reduced || filmBroken
  const act1 = plain ? 0 : approachLength(vh)
  const innerMax = Math.max(contentHeight - vh, 0)
  const act3 = 0
  const filmMax = plain ? 0 : roomLength(vh)

  useEffect(() => {
    setMetrics({ act1, act3, innerMax, filmMax, pageH: vh })
  }, [act1, act3, innerMax, filmMax, vh])

  /**
   * Sidans lägen, i ordning.
   *
   * Skrivbordet, varje vy inne i skärmen, och varje plats ute i rummet. En
   * dragning flyttar precis ett steg — man landar alltid på ett av dem.
   *
   * Platserna i rummet ligger mitt i sitt intervall, inte i början: det är
   * där texten står färdigt framme och övertoningen till nästa plats ännu
   * inte börjat.
   */
  // Vägen ut ur skärmen är ingen egen akt längre: sidan tonar ut och rummet
  // tonar in i samma steg.
  const stations = useMemo<Station[]>(() => {
    const list: Station[] = [{ id: 'start', y: 0 }]

    for (const [i, offset] of innerStations.entries()) {
      list.push({ id: `inner-${i}`, y: act1 + Math.min(offset, innerMax) })
    }

    let at = 0
    for (const shot of SHOTS) {
      const length = shot.hold * vh
      list.push({ id: `room-${shot.id}`, y: act1 + innerMax + at + length / 2 })
      at += length
    }

    // Dubbletter uppstår när innehållet är kortare än fönstret.
    return list.filter((s, i) => i === 0 || s.y - list[i - 1].y > 8)
  }, [act1, innerMax, innerStations, vh])

  useEffect(() => { setStations(stations) }, [stations])

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
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
    // Typsnitten och filmen ska båda vara framme — men ingendera får hålla
    // kvar draperiet i all evighet om något strular.
    const film = plain || clipReady
      ? Promise.resolve()
      : new Promise((r) => setTimeout(r, 6000))
    Promise.race([
      Promise.all([wait, film]),
      new Promise((r) => setTimeout(r, 7000)),
    ]).then(() => setTimeout(ready, 500))
    return () => { cancelled = true }
  }, [plain, clipReady])

  useFrame((f) => {
    // Väl inne vid skärmen släpps pekhändelser igenom till sidan därinne.
    viewportRef.current?.classList.toggle('is-inside', f.act1 > 0.985 && f.film < 1)
  })

  return (
    <>
      <a className="skip-link" href="#kontakt">Hoppa till kontaktuppgifter</a>

      <div className="viewport" ref={viewportRef}>
        {plain ? (
          <div className="film__page film__page--plain">
            <ScreenContent onHeight={setContentHeight} reduced />
            <Contact variant="static" />
          </div>
        ) : (
          <>
            <Film
              page={(
                <ScreenContent
                  onHeight={setContentHeight}
                  onStations={setInnerStations}
                />
              )}
              onFail={filmDown}
              onReady={filmReady}
            />
          </>
        )}
        <Nav />
      </div>

      {showPreloader && <Preloader done={loaded} />}
    </>
  )
}
