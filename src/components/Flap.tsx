import { useEffect, useRef, useState } from 'react'
import { onTick, reducedMotion } from '../lib/motion'

/**
 * SKYLTKLOCKAN
 * ════════════
 * Talen står inte längre som text utan på en delad skyltklocka — samma
 * sorts tavla som på en gammal tågstation, där varje tecken sitter på en
 * bricka som rullar tills rätt tecken står framme.
 *
 * Skälet är att talen ska läsas som mätvärden och inte som formuleringar.
 * En siffra som räknas upp är en effekt lagd på en text; en bricka som
 * rullar är ett föremål som visar ett värde, och det är skillnaden mellan
 * att påstå och att mäta.
 *
 * HUR DEN ÄR BYGGD
 * Varje tecken är en ruta med dold spillning och en lodrät remsa av alla
 * tecken inuti. Remsan skjuts upp tills rätt tecken står i rutan. Det är
 * alltså ingen animation av bokstäver utan en enda `transform` per tecken
 * — grafikkortet flyttar remsan, och tjugo tecken kostar lika lite som
 * ett.
 *
 * Varje tecken har sin egen fart och landar därför inte i takt med de
 * andra. Landar de samtidigt läser tavlan som en bild som byts; landar de
 * i tur och ordning läser den som mekanik.
 */

/** Tecknen en bricka kan visa, i den ordning de sitter på remsan. */
const TECKEN = '0123456789%:.'.split('')
/** Höjden på en bricka, i em. Remsan flyttas i samma enhet. */
const RUTA = 1.16

function Bricka({ tecken, ordning }: { tecken: string; ordning: number }) {
  const ruta = useRef<HTMLSpanElement>(null)
  const remsa = useRef<HTMLSpanElement>(null)
  const [rullar, setRullar] = useState(false)
  const start = useRef(0)

  const mal = Math.max(0, TECKEN.indexOf(tecken))
  // Varv innan den landar. Fler för tecken längre ut, så att tavlan
  // landar från vänster till höger.
  const varv = 2 + ordning
  const langd = 900 + ordning * 260

  useEffect(() => {
    const el = remsa.current
    const box = ruta.current
    if (!el || !box) return
    if (reducedMotion()) {
      el.style.transform = `translate3d(0, ${-mal * RUTA}em, 0)`
      return
    }
    // Rutan bevakas, inte remsan.
    //
    // Remsan är tretton tecken hög och klipps av rutan till ett enda. Mätt
    // på remsan blir andelen synligt aldrig mer än en trettondel, så en
    // tröskel på hälften slog aldrig till och alla brickor blev stående på
    // remsans första tecken. Rutan är det som faktiskt syns.
    const ob = new IntersectionObserver((es) => {
      if (!es[0]?.isIntersecting) return
      start.current = performance.now()
      setRullar(true)
      ob.disconnect()
    }, { threshold: 0.5 })
    ob.observe(box)
    return () => ob.disconnect()
  }, [mal])

  useEffect(() => {
    if (!rullar) return
    return onTick((nu) => {
      const el = remsa.current
      if (!el) return
      const t = Math.min(1, (nu - start.current) / langd)
      // Snabbt igång, lång inbromsning. Den sista biten ska kännas som
      // att brickan faller på plats av sin egen tyngd.
      const e = 1 - Math.pow(1 - t, 4)
      const pos = (varv * TECKEN.length + mal) * e
      // Modulo på remsan gör att den kan snurra hur många varv som helst
      // utan att bli oändligt lång.
      el.style.transform = `translate3d(0, ${-(pos % TECKEN.length) * RUTA}em, 0)`
      if (t >= 1) el.style.transform = `translate3d(0, ${-mal * RUTA}em, 0)`
    })
  }, [rullar, mal, varv, langd])

  return (
    <span className="bricka" ref={ruta}>
      <span className="bricka__remsa" ref={remsa}>
        {TECKEN.map((c) => (
          <span className="bricka__tecken" key={c}>{c}</span>
        ))}
      </span>
      {/* Skarven tvärs över brickan. Utan den är det en ruta med en siffra;
          med den är det en bricka som kan vändas. */}
      <span className="bricka__skarv" aria-hidden="true" />
    </span>
  )
}

/**
 * Ett helt tal på tavlan.
 *
 * Värdet står också som vanlig text för uppläsning: en skärmläsare ska
 * höra "2026", inte fyra lösryckta tecken ur en remsa.
 */
export function FlapValue({ value }: { value: string }) {
  return (
    <span className="tavla">
      <span className="sr-only">{value}</span>
      <span className="tavla__rad" aria-hidden="true">
        {value.split('').map((c, i) => (
          <Bricka tecken={c} ordning={i} key={`${c}-${i}`} />
        ))}
      </span>
    </span>
  )
}
