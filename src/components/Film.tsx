import { useEffect, useRef, useState } from 'react'
import { FILM, type Tagning } from '../data/film'
import { clamp01 } from '../lib/math'
import { reducedMotion, useTick } from '../lib/motion'

/**
 * FILMEN SOM MAN RULLAR IGENOM
 * ════════════════════════════
 * Fem tagningar, var och en fastnaglad i rutan medan man rullar förbi den.
 * Man rullar inte förbi filmen, man rullar genom den.
 *
 * VARFÖR RUTAN OCH INTE FILMEN DRIVS AV RULLNINGEN
 * Det självklara vore att spola filmen med rullningen — ett bildruteläge
 * per rullat avstånd. Det ser bra ut i teorin och illa i praktiken: en
 * mp4-fil är byggd av nyckelbildrutor med långa spann emellan, och att
 * hoppa till en godtycklig tidpunkt tvingar avkodaren att gå tillbaka till
 * närmaste nyckelruta och räkna sig fram. Rullar man i en jämn takt blir
 * det en följd av sådana sökningar, och bilden hackar i exakt den takten.
 *
 * Filmerna spelas därför i sin egen jämna hastighet, och det som rullningen
 * driver är rutan omkring dem: hur den öppnar sig, hur den skalar, hur den
 * släpper taget. Rörelsen i bild och rörelsen i sidan möts, men ingen av
 * dem stör den andra.
 *
 * DET SOM INTE SYNS FÅR INTE AVKODAS
 * Fem filmer är tolv megabyte och fem avkodare. En webbläsare som spelar
 * fem videor samtidigt lägger hela sin tid där, och sidan tappar bildrutor
 * långt innan man ser något av det. Varje tagning laddar därför ingenting
 * förrän den närmar sig rutan, och pausar så fort den lämnat den. I
 * praktiken är det aldrig fler än två i gång.
 */

/** Hur många skärmhöjder en tagning tar att rulla igenom. Se `.scen`. */
const SPAR = 2.1

function Scen({ tagning, forst }: { tagning: Tagning; forst: boolean }) {
  const spar = useRef<HTMLElement>(null)
  const fast = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  /**
   * Källan sätts först när tagningen är nära rutan.
   *
   * `preload="none"` räcker inte: en `<video>` med `src` hämtar ändå
   * huvudet på filen, och fem sådana hämtningar konkurrerar med det som
   * faktiskt ska visas först. Utan `src` görs ingen hämtning alls.
   */
  const [nara, setNara] = useState(forst)

  useEffect(() => {
    const el = spar.current
    if (!el || nara) return
    const ob = new IntersectionObserver(
      (es) => { if (es[0]?.isIntersecting) { setNara(true); ob.disconnect() } },
      { rootMargin: '120% 0px' },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [nara])

  /** Spelas bara medan tagningen syns. En pausad video kostar ingenting. */
  useEffect(() => {
    const el = spar.current
    const v = video.current
    if (!el || !v) return
    const ob = new IntersectionObserver(
      (es) => {
        if (es[0]?.isIntersecting) {
          // Autouppspelning kan nekas; en film som inte får spela ska inte
          // fälla resten av sidan med ett ohanterat avslag.
          v.play().catch(() => {})
        } else {
          v.pause()
        }
      },
      { rootMargin: '10% 0px' },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [nara])

  /**
   * Rullningen skrivs som två tal på den fastnaglade rutan: hur långt in
   * tagningen kommit och hur långt ut den är på väg. CSS gör resten, och
   * gör det olika för varje rörelse.
   *
   * Talen avrundas till hundradelar innan de skrivs. Att skriva en
   * egenskap tvingar fram en omräkning av stilen under den, och den blir
   * likadan vare sig talet ändrats i tredje decimalen eller inte.
   */
  useTick(() => {
    const el = spar.current
    const f = fast.current
    if (!el || !f) return
    const r = el.getBoundingClientRect()
    const langd = r.height - window.innerHeight
    const p = langd > 4 ? clamp01(-r.top / langd) : 0
    const in_ = clamp01(p / 0.28)
    const ut = clamp01((p - 0.72) / 0.28)
    const nyckel = `${in_.toFixed(2)} ${ut.toFixed(2)}`
    if (f.dataset.lage === nyckel) return
    f.dataset.lage = nyckel
    f.style.setProperty('--in', in_.toFixed(2))
    f.style.setProperty('--ut', ut.toFixed(2))
  }, !reducedMotion())

  return (
    <article className="scen" data-rorelse={tagning.rorelse} ref={spar}>
      <div className="scen__fast" ref={fast}>
        <div className="scen__ruta">
          <video
            className="scen__film"
            ref={video}
            src={nara ? tagning.fil : undefined}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
          />
          <span className="scen__dis" aria-hidden="true" />
        </div>

        <Meander />

        <div className="scen__text">
          <span className="scen__ort">{tagning.ort}</span>
          <h2 className="scen__rubrik">
            {tagning.rubrik.split('\n').map((rad) => (
              <span className="scen__rad" key={rad}>{rad}</span>
            ))}
          </h2>
          <p className="scen__brod">{tagning.brod}</p>
          <span className="scen__kamera">{tagning.kamera}</span>
        </div>
      </div>
    </article>
  )
}

/**
 * Meandern, den grekiska nyckeln.
 *
 * Ritad som ett mönster och inte som en bild: ett band som ska klara varje
 * skärmbredd kan inte vara en fil med en bestämd bredd, och samma form i
 * SVG kostar ingenting att upprepa. Bandet ligger som ram kring rutan och
 * är det enda ornamentet på hela sidan — ett ornament som återkommer på
 * fem ställen är en stil, ett som återkommer överallt är en tapet.
 */
function Meander() {
  /**
   * Två fristående band och inte ett band med två rader.
   *
   * Ett mönster är förankrat i sin egen SVG:s nollpunkt. Låg den undre
   * raden på `y=100%` hamnade den på en höjd som sällan är en jämn multipel
   * av rutans höjd, och då skars nyckeln av mitt i sitt varv — nertill såg
   * bandet ut som två förskjutna rader ovanpå varandra. Varje band får
   * därför en egen ruta att räkna sin nollpunkt från.
   */
  const band = (
    <svg className="scen__band" aria-hidden="true">
      <defs>
        {/* En bandruta som hakar i nästa. Nyckeln måste vara en enda löpande
            linje med samma höjd vid rutans båda kanter — annars blir bandet
            en rad lösa krokar i stället för ett flätverk, och det var precis
            vad första försöket blev. */}
        <pattern id="meander" width="32" height="16" patternUnits="userSpaceOnUse">
          <path
            d="M0 13H3V3H29V13H26V6H9V10H23M29 13H32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill="url(#meander)" />
    </svg>
  )
  return <div className="scen__ram" aria-hidden="true">{band}{band}</div>
}

export function Film() {
  return (
    <section className="film" id="film" data-tone="dark">
      {FILM.map((t, i) => (
        <Scen key={t.id} tagning={t} forst={i === 0} />
      ))}
    </section>
  )
}

export { SPAR }
