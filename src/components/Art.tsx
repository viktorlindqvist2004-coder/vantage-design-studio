import { useEffect, useRef } from 'react'
import { onTick, reducedMotion, useReveal } from '../lib/motion'

/**
 * RITADE TECKEN OCH LEVANDE FIGURER
 * ═════════════════════════════════
 * Sidan hade räkneord framför varje punkt och varje steg. Ett räkneord
 * säger bara att det finns fler av något — det bär ingen mening och blir
 * en trappa av siffror ned genom sidan. Här ersätts de av tecken som ritar
 * sig själva när de kommer in i rutan, och av en tråd som följer med när
 * man rullar.
 *
 * Allt är streck som ritas: konturen har en streckad mall lika lång som
 * hela linjen, och förskjutningen går från full längd till noll. Ögat ser
 * en penna som drar strecket.
 */

/* ── Tecknen framför punkterna ────────────────────────────────────────── */

export type MarkKind = 'sikte' | 'vag' | 'fart' | 'faste'

const MARKS: Record<MarkKind, string[]> = {
  /** Ett sikte: att förstå är att ställa in skärpan på rätt sak. */
  sikte: ['M4 16h6M22 16h6M16 4v6M16 22v6', 'M16 9a7 7 0 1 0 0 14 7 7 0 0 0 0-14'],
  /** En väg med hållpunkter: man ser vart det bär innan man går. */
  vag: ['M3 24c6 0 6-16 13-16s7 16 13 16', 'M3 24h0M16 8h0M29 24h0'],
  /** Fart: tre streck som blir kortare. */
  fart: ['M2 11h20M8 16h18M14 21h14', 'M26 6l4 5-4 5'],
  /** Ett fäste: det som håller kvar efteråt. */
  faste: ['M16 6v20', 'M6 14a10 10 0 0 0 20 0', 'M10 6h12'],
}

/**
 * Ett tecken som ritar sig själv.
 *
 * Längden på varje kontur mäts i webbläsaren i stället för att gissas.
 * Gissad längd ger antingen en bit som aldrig ritas färdig eller ett
 * hopp i slutet — och den är omöjlig att gissa rätt för en kurva.
 */
export function Mark({ kind, delay = 0 }: { kind: MarkKind; delay?: number }) {
  const ref = useReveal<SVGSVGElement>()

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    for (const path of svg.querySelectorAll('path')) {
      const len = path.getTotalLength() || 40
      path.style.strokeDasharray = String(len)
      path.style.strokeDashoffset = String(len)
    }
  }, [ref])

  return (
    <svg
      className="mark"
      ref={ref}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ '--d': `${delay}ms` } as React.CSSProperties}
    >
      {MARKS[kind].map((d, i) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
    </svg>
  )
}

/* ── Tråden genom arbetsgången ────────────────────────────────────────── */

/**
 * En lodrät tråd som fylls i takt med att man rullar genom stegen.
 *
 * Den ersätter räkneorden och gör mer än de gjorde: ett räkneord säger
 * vilket steg man läser, tråden säger dessutom hur långt kvar det är.
 *
 * Fyllnaden skrivs som `scaleY` direkt på elementet, inte via tillstånd.
 * Det här värdet ändras varje bildruta och skulle annars rendera om hela
 * arbetsgången sextio gånger i sekunden.
 */
export function Spine({ progress }: { progress: React.RefObject<number> }) {
  const fill = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reducedMotion()) return
    return onTick(() => {
      const el = fill.current
      if (!el) return
      el.style.transform = `scaleY(${(progress.current ?? 0).toFixed(4)})`
    })
  }, [progress])

  return (
    <span className="spine" aria-hidden="true">
      <i ref={fill} />
    </span>
  )
}

/* ── Kort som lutar mot pekaren ───────────────────────────────────────── */

/**
 * Ger ett kort en svag lutning efter var pekaren står över det.
 *
 * Lutningen är liten — några grader. Mer och kortet blir en leksak; mindre
 * och man känner den inte. Det är inte lutningen i sig som gör något, utan
 * att kortet vet var handen är.
 *
 * Bara med riktig pekare. På pekskärm finns ingen svävande markör, och
 * lutningen hade slagit till först i samma stund som man trycker.
 */
export function useTilt<T extends HTMLElement>(grader = 5) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const rör = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.transform =
        `perspective(900px) rotateX(${(-y * grader).toFixed(2)}deg) `
        + `rotateY(${(x * grader).toFixed(2)}deg) translateY(-6px)`
    }
    const ut = () => { el.style.transform = '' }

    el.addEventListener('pointermove', rör)
    el.addEventListener('pointerleave', ut)
    return () => {
      el.removeEventListener('pointermove', rör)
      el.removeEventListener('pointerleave', ut)
    }
  }, [grader])

  return ref
}

/* ── Samtalet, som två punkter som pratar ─────────────────────────────── */

type Puls = { t: number; riktning: 1 | -1 }

/**
 * Två noder med en linje emellan, och pulser som går fram och tillbaka.
 *
 * Det här partiet handlar om att ni pratar direkt med den som bygger, utan
 * någon emellan. En bild av det vore ett fotografi på två personer; en
 * figur av det är två punkter och ingenting däremellan, med något som
 * faktiskt går fram och tillbaka. Det senare är sant om påståendet.
 *
 * Pekaren drar linjen mot sig: håller man den nära böjer sig samtalet
 * efter handen, vilket gör figuren till något man kan röra vid i stället
 * för något att titta på.
 */
export function Pulse() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    /** Fönsterkoordinater. Dukens ruta läses en gång per bildruta, inte
     * per pekarhändelse — se samma resonemang i Cables.tsx. */
    const pek = { cx: -9999, cy: -9999 }
    // Böjen linjen har just nu, och den den strävar mot. Utjämnad, så att
    // linjen svarar mjukt i stället för att hoppa dit pekaren är.
    let boj = 0
    let bojMal = 0
    let pulser: Puls[] = [{ t: 0, riktning: 1 }]
    let sist = 0

    function bygg() {
      const r = canvas!.getBoundingClientRect()
      w = r.width
      h = r.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(w * dpr)
      canvas!.height = Math.round(h * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    /** Punkten på kurvan vid `t`, som en enkel andragradsbåge. */
    const på = (t: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      const u = 1 - t
      return {
        x: u * u * ax + 2 * u * t * cx + t * t * bx,
        y: u * u * ay + 2 * u * t * cy + t * t * by,
      }
    }

    function rita(nu: number) {
      const dt = Math.min(50, nu - sist) / 1000
      sist = nu

      // Bara pekare inom figuren böjer linjen, och bara i höjdled.
      const r = canvas!.getBoundingClientRect()
      const px = pek.cx - r.left
      const py = pek.cy - r.top
      const inne = px > -40 && px < w + 40 && py > -60 && py < h + 60
      bojMal = inne ? Math.max(-90, Math.min(90, py - h * 0.5)) : 0

      const ax = w * 0.12
      const bx = w * 0.88
      const ay = h * 0.5
      const by = h * 0.5
      boj += (bojMal - boj) * 0.09
      const cx = (ax + bx) / 2
      const cy = ay + boj

      ctx!.clearRect(0, 0, w, h)

      // Linjen.
      ctx!.beginPath()
      ctx!.moveTo(ax, ay)
      ctx!.quadraticCurveTo(cx, cy, bx, by)
      ctx!.strokeStyle = 'rgba(12,12,13,0.22)'
      ctx!.lineWidth = 1.25
      ctx!.stroke()

      // Pulserna.
      for (const p of pulser) {
        p.t += dt * 0.42 * p.riktning
        if (p.t > 1) { p.t = 1; p.riktning = -1 }
        if (p.t < 0) { p.t = 0; p.riktning = 1 }
        const q = på(p.t, ax, ay, bx, by, cx, cy)
        const g = ctx!.createRadialGradient(q.x, q.y, 0, q.x, q.y, 26)
        g.addColorStop(0, 'rgba(255,74,23,0.36)')
        g.addColorStop(1, 'rgba(255,74,23,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(q.x, q.y, 26, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.fillStyle = '#ff4a17'
        ctx!.beginPath()
        ctx!.arc(q.x, q.y, 3.4, 0, Math.PI * 2)
        ctx!.fill()
      }

      // Noderna. Den som pulsen är på väg ifrån lyser starkare — det är
      // den som pratar.
      for (const [x, y, hem] of [[ax, ay, 0], [bx, by, 1]] as const) {
        const aktiv = pulser.some((p) => (hem === 0 ? p.t < 0.12 : p.t > 0.88))
        ctx!.beginPath()
        ctx!.arc(x, y, aktiv ? 8 : 6, 0, Math.PI * 2)
        ctx!.fillStyle = aktiv ? '#ff4a17' : 'rgba(12,12,13,0.85)'
        ctx!.fill()
        ctx!.beginPath()
        ctx!.arc(x, y, 14, 0, Math.PI * 2)
        ctx!.strokeStyle = aktiv ? 'rgba(255,74,23,0.45)' : 'rgba(12,12,13,0.16)'
        ctx!.lineWidth = 1
        ctx!.stroke()
      }
    }

    bygg()
    if (reducedMotion()) { sist = 0; rita(0); return }

    const påPek = (e: PointerEvent) => {
      pek.cx = e.clientX
      pek.cy = e.clientY
    }
    const påUt = () => { bojMal = 0 }

    window.addEventListener('pointermove', påPek, { passive: true })
    document.addEventListener('pointerleave', påUt)
    window.addEventListener('resize', bygg)

    let synlig = false
    const ob = new IntersectionObserver((e) => {
      synlig = !!e[0]?.isIntersecting
      // Andra pulsen sätts igång först när figuren setts, så att de inte
      // hinner hamna i takt medan ingen tittar.
      if (synlig && pulser.length === 1) pulser = [...pulser, { t: 0.55, riktning: -1 }]
    })
    ob.observe(canvas)

    const stopp = onTick((nu) => { if (synlig) rita(nu) })

    return () => {
      window.removeEventListener('pointermove', påPek)
      document.removeEventListener('pointerleave', påUt)
      window.removeEventListener('resize', bygg)
      ob.disconnect()
      stopp()
    }
  }, [])

  return <canvas className="pulse" ref={ref} aria-hidden="true" />
}

/* ── Människorna ──────────────────────────────────────────────────────── */

/**
 * Två personer vid ett bord, med en skärm emellan sig.
 *
 * Partiet handlar om att ni pratar direkt med den som bygger, och det ska
 * synas att det är människor och inte en symbol för människor.
 *
 * FORMEN
 * Fyllda silhuetter, inte konturer. Det är hela skillnaden mellan en
 * teckning och en skylt: en streckgubbe är en linje runt ingenting, medan
 * en fylld form har massa och därmed tyngd. Ansiktena är utsparade i
 * papprets färg, håret är en egen form ovanpå, och händerna är utsparade
 * på samma sätt — det är de ljusa ytorna mot de mörka som gör att man
 * läser en person.
 *
 * Bordet ritas efter kropparna och döljer där de slutar, så att de sitter
 * bakom det i stället för att vara avklippta vid det.
 *
 * De två är inte samma kropp speglad. Den till vänster lutar sig fram med
 * handen på bordet och lyssnar; den till höger sitter upprätt och visar
 * något på skärmen. De andas i olika takt.
 *
 * Ritade och inte fotograferade, och det är ett val: ett foto på två
 * främlingar är ett foto på två främlingar, medan en teckning är tydlig
 * med att den föreställer situationen och inte personerna.
 */
export function Figures() {
  const ref = useReveal<SVGSVGElement>()

  return (
    <svg
      className="folk"
      ref={ref}
      viewBox="0 0 560 300"
      role="img"
      aria-label="Två personer i samtal vid ett bord med en skärm emellan sig"
    >
      {/* Stolsryggarna, längst bak. De stod förut vid sidan om personerna
          och läste som två lösa rundlar; en stolsrygg hör hemma bakom den
          som sitter, och det är kanterna som sticker ut på var sida om
          axlarna som säger att där finns en stol. */}
      <g stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.2">
        <path d="M110 250v-56q0-12 12-12h72q12 0 12 12v56" />
        <path d="M356 250v-56q0-12 12-12h72q12 0 12 12v56" />
      </g>

      {/* Personen till vänster: lutar sig fram, handen på bordet, vänd åt
          höger mot skärmen och mot den andra.

          Två saker gjorde att de såg knasiga ut, och båda är rättade här.

          Huvudet stod inte mitt över bålen utan en dryg decimeter till
          vänster om sin egen kropp, och ett huvud bredvid axlarna i
          stället för på dem är precis den sortens fel man känner utan att
          kunna peka på.

          Och ansiktet var en tom oval. Det är värre än det låter: en tom
          oval på en svart kropp läser inte som ett obestämt ansikte utan
          som ett ansikte som saknas. Två prickar, ett streck för munnen
          och en antydd näsa är allt som behövs — och eftersom de sitter
          en bit åt det håll personen är vänd säger de dessutom vart hon
          eller han tittar, vilket ingen kroppshållning i världen kan säga
          lika tydligt.

          Näsan är borta. Ett litet streck på kinden hamnade ovanpå hårets
          nederkant och blev ett kryss i ansiktet — och en näsa i den här
          storleken vinner ingenting mot risken. Ögon, bryn och mun räcker.

          Varje arm har en ljus söm längs den kant där den ligger över
          bålen. Utan den var arm och bål en enda svart form med en knöl
          på sidan. Sömmen följer bara den inre kanten och inte hela
          armens kontur: dras den runt om går den även över axeln och
          tvärs bröstet, och då blir skjortan en kimono med slag. */}
      <g className="folk__en">
        <path d="M147 90q1 14-3 22h26q-4-8-3-22z" fill="currentColor" />
        <ellipse cx="158" cy="74" rx="22" ry="26"
          fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
        {/* Ansiktet, vänt åt höger. */}
        <g fill="currentColor">
          <circle cx="156" cy="76" r="2.7" />
          <circle cx="169" cy="76" r="2.7" />
        </g>
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M151 69q5-3 10-1M164 68q5-2 9 1" opacity="0.7" />
          <path d="M161 88q6 2 11-1" />
        </g>
        {/* Håret ligger ovanpå ansiktet och ger huvudet dess form. Kanten
            följer skallens och lämnar pannan fri — går fransen längre ned
            blir ansiktet en springa och personen en siluett igen. */}
        <path d="M136 82q-6-32 22-32 27 0 22 32-3-17-11-21-5-3-11-3-6 0-11 3-8 4-11 21z"
          fill="currentColor" />
        {/* Ett par ljusa slingor i håret. Utan dem är håret en kalott. */}
        <path d="M144 60q9-6 22-4M142 68q10-8 24-6"
          stroke="var(--paper)" strokeWidth="1.3" fill="none" opacity="0.35" />
        {/* Den bortre armen ligger före bålen i ritordningen och blir därmed
            övertäckt av den: bara flisan utanför kroppens kontur syns, och
            det är precis så en arm bakom en kropp ser ut. Ritas den efteråt
            hamnar dess innerkant mitt på bröstet och läser som en rocksöm. */}
        <path d="M127 128q-15 16-19 44-3 18-3 76h32q0-54 3-72 3-20 12-34z"
          fill="currentColor" />
        {/* Bålen smalnar av något ned mot bordet. Lika bred hela vägen blev
            den en klocka, och en klocka med huvud är en schackpjäs. */}
        <path d="M158 106q-27 3-33 24-3 14 4 118h58q7-104 4-118-6-21-33-24z"
          fill="currentColor" />
        {/* Kragen bryter upp bålen. En helsvart form är en form; samma form
            med en krage är en människa i en skjorta. */}
        <path d="M147 111l11 19 11-19"
          stroke="var(--paper)" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
        {/* Armen ut mot bordet, med axel, armbåge och hand. */}
        <path d="M186 124q28 14 42 46 8 18 11 42l-30 6q-3-24-9-38-8-18-25-30z"
          fill="currentColor" />
        <path d="M175 150q17 12 25 30 6 14 9 38" className="folk__som" />
        <ellipse cx="224" cy="228" rx="14" ry="9.5"
          fill="var(--paper)" stroke="currentColor" strokeWidth="1.6"
          transform="rotate(14 224 228)" />
        {/* Ett streck tvärs handen. En slät oval är en tumme i en vante. */}
        <path d="M226 221q3 6 3 13"
          stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45"
          strokeLinecap="round" />
      </g>

      {/* Personen till höger: upprätt, vänd åt vänster, visar något på
          skärmen. */}
      <g className="folk__tva">
        <path d="M393 86q1 14-3 22h26q-4-8-3-22z" fill="currentColor" />
        <ellipse cx="403" cy="68" rx="22" ry="26"
          fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
        <g fill="currentColor">
          <circle cx="391" cy="70" r="2.7" />
          <circle cx="404" cy="70" r="2.7" />
        </g>
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M386 63q5-3 10-1M399 62q5-2 9 1" opacity="0.7" />
          <path d="M389 82q6 2 11-1" />
        </g>
        {/* Knuten sitter uppe i nacken, inte i öronhöjd.
            I öronhöjd blev den ett hörlurskåpa — och ännu tydligare när
            den fick en ring innanför kanten. Höjden är hela skillnaden:
            en rund form vid örat är en hörlur, samma form uppe bakom
            hjässan är en knut. Den överlappar kalotten i stället för att
            sväva bakom skallen, för det var den frikopplade cirkeln som
            en gång såg ut som en svart boll man klistrat dit. */}
        <ellipse cx="424" cy="51" rx="13" ry="11.5"
          fill="currentColor" transform="rotate(-22 424 51)" />
        <path d="M381 76q-6-32 22-32 27 0 22 32-3-17-11-21-5-3-11-3-6 0-11 3-8 4-11 21z"
          fill="currentColor" />
        <g stroke="var(--paper)" strokeWidth="1.3" fill="none" opacity="0.32">
          <path d="M417 47q8 2 12 8M419 58q9-2 13-8" />
          <path d="M389 54q10-6 21-3M387 62q10-7 23-4" />
        </g>
        {/* Den bortre armen, under bålen av samma skäl som hos den andra. */}
        <path d="M429 124q19 16 25 48 4 20 4 76h-30q0-54-5-72-6-20-17-34z"
          fill="currentColor" />
        <path d="M403 102q-27 3-33 24-3 14 4 122h58q7-108 4-122-6-21-33-24z"
          fill="currentColor" />
        <path d="M392 107l11 19 11-19"
          stroke="var(--paper)" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
        {/* Den pekande armen är en egen grupp så att den kan röra sig
            för sig — det är den som gör att någon visar något. */}
        {/* Handen ligger utanför skärmens kant och inte bakom den. Skärmen
            ritas efter personerna, så en hand som hamnar innanför dess ram
            blir avklippt på mitten — och en halv hand vid en skärmkant
            läser inte som att peka, den läser som ett fel. */}
        <g className="folk__arm">
          <path d="M379 120q-22 10-34 34-9 17-13 34l30 8q4-18 12-30 8-13 19-20z"
            fill="currentColor" />
          <path d="M393 146q-11 7-19 20-8 12-12 30" className="folk__som" />
          <ellipse cx="355" cy="199" rx="13" ry="9.5"
            fill="var(--paper)" stroke="currentColor" strokeWidth="1.6"
            transform="rotate(-18 355 199)" />
          <path d="M352 192q-3 6-2 13"
            stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45"
            strokeLinecap="round" />
        </g>
      </g>

      {/* Bordet, ritat efter kropparna så att det döljer där de slutar. */}
      <g>
        <rect x="34" y="244" width="492" height="13" rx="4"
          fill="var(--paper)" stroke="currentColor" strokeWidth="1.7" />
        <path d="M92 257v36M468 257v36"
          stroke="currentColor" strokeWidth="1.7" opacity="0.35" fill="none" />
      </g>

      {/* Skärmen står på bordet. */}
      <g className="folk__skarm">
        <rect x="252" y="152" width="86" height="66" rx="6"
          fill="var(--paper)" stroke="currentColor" strokeWidth="1.7" />
        <path d="M295 218v16M275 240h40"
          stroke="currentColor" strokeWidth="1.7" fill="none" opacity="0.5" />
        <rect x="264" y="166" width="32" height="5" rx="2.5" fill="var(--flame)" />
        <g fill="currentColor">
          <rect x="264" y="180" width="62" height="4" rx="2" opacity="0.32" />
          <rect x="264" y="191" width="46" height="4" rx="2" opacity="0.24" />
          <rect x="264" y="202" width="54" height="4" rx="2" opacity="0.18" />
        </g>
      </g>
    </svg>
  )
}
