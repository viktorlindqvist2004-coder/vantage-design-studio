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
 * SILHUETTER, OCH INGA ANSIKTEN
 * De hade förut utsparade ansikten med ögon, bryn och mun. Det gjorde dem
 * läsbara som personer men också omedelbart tecknade — två prickar och ett
 * streck är en illustration hur väl de än sitter, och ju mer man ritar
 * desto tydligare blir det att någon ritat.
 *
 * Nu är de hela, fyllda silhuetter. Formen ensam får bära allt: skallens
 * profil, nackens lutning, axelns fall, armens vinkel. Det är svårare att
 * få rätt men det finns ingenting i en silhuett att känna igen som
 * teckning — den läser som en skugga av någon, inte som en bild av någon.
 *
 * PROPORTIONERNA ÄR HELA SKILLNADEN
 * Med ansikten kunde kroppen vara ungefär rätt. Utan dem finns inget annat
 * att titta på, och då syns varje fel. Axlarna är därför två huvudbredder,
 * inte en och en halv som förut; nacken sitter framför skallens mitt och
 * inte under den; skuldran faller i en båge från nacken ut till axeln i
 * stället för att flankera rakt ut. En kropp som flankerar rakt ut från
 * halsen är en klocka, och en klocka med huvud är en schackpjäs.
 *
 * Huvudet har en antydd profil — panna, näsrygg, haka. I en silhuett kan
 * den inte hamna fel på det sätt ett ritat ansikte kan, och den säger
 * dessutom vart personen är vänd utan att något behöver pekas ut.
 *
 * Bordet ritas efter kropparna och döljer där de slutar, så att de sitter
 * bakom det i stället för att vara avklippta vid det.
 *
 * De två är inte samma kropp speglad. Den till vänster lutar sig fram med
 * handen på bordet och lyssnar; den till höger sitter upprätt och visar
 * något på skärmen. De andas i olika takt.
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
      {/* Stolsryggarna, längst bak. En stolsrygg hör hemma bakom den som
          sitter, och det är kanterna som sticker ut på var sida om axlarna
          som säger att där finns en stol. */}
      <g stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.18">
        <path d="M82 250v-56q0-12 12-12h104q12 0 12 12v56" />
        <path d="M352 250v-56q0-12 12-12h104q12 0 12 12v56" />
      </g>

      {/* Personen till vänster: vänd åt höger, lutar sig fram, handen på
          bordet.

          Huvudet är byggt av tre former som överlappar varandra i stället
          för av en enda kontur: skalle, hår och käke. Samma fyllning gör
          dem till en form i bild, och var och en går att få rätt för sig.
          En enda kontur runt ett huvud är däremot omöjlig att justera —
          rör man en punkt vandrar hela profilen. */}
      <g className="folk__en">
        {/* Den bortre armen, före bålen i ritordningen: bara flisan utanför
            kroppens kontur syns, och det är precis så en arm bakom en kropp
            ser ut. */}
        <path d="M104 168c-9 10-13 24-15 40-2 12-3 22-3 36h30c0-14 1-24 3-34
          2-14 5-24 10-32z" fill="currentColor" />

        <ellipse cx="142" cy="62" rx="29" ry="27" fill="currentColor" />
        <ellipse cx="145" cy="71" rx="26" ry="30" fill="currentColor" />
        {/* Käken. Smalnar av nedåt och framåt — en käke som är lika bred som
            skallen läser som hjälm. */}
        <path d="M120 78c1 16 11 28 26 28 14 0 24-11 26-27z" fill="currentColor" />
        {/* Näsan är fyra bildpunkter i konturen. I en silhuett räcker det,
            och den kan inte hamna snett på det sätt ett ritat drag kan. */}
        <path d="M169 70l6 6-6 5z" fill="currentColor" />
        <path d="M134 96l24 2 2 26-27 2z" fill="currentColor" />

        {/* Bålen. Skuldran faller i en båge från nacken ut till axeln, och
            bredaste stället ligger vid överarmen och inte vid halsen. En
            kropp som flankerar rakt ut från halsen är en klocka. */}
        <path d="M146 116c-3 10-12 16-24 20-16 6-26 17-29 34-2 12-3 40-3 74h112
          c0-34-1-62-3-74-3-17-13-28-29-34-12-4-21-10-24-20z" fill="currentColor" />

        {/* Armen ut mot bordet: överarm, underarm och hand i en form. */}
        <path d="M186 148c17 7 28 20 34 39 6 18 10 33 12 46 1 6-4 10-11 10
          -7 0-11-3-12-9-2-13-6-26-11-37-6-14-15-23-26-28z" fill="currentColor" />
        {/* Sömmen där armen ligger över bålen. Utan den är arm och bål en
            enda svart form med en knöl på sidan. */}
        <path d="M180 152c14 9 24 22 30 41 5 16 9 30 11 42" className="folk__som" />
      </g>

      {/* Personen till höger: vänd åt vänster, upprätt, visar på skärmen. */}
      <g className="folk__tva">
        <path d="M456 166c9 10 13 24 15 40 2 12 3 24 3 38h-30c0-14-1-26-3-36
          -2-14-5-24-10-32z" fill="currentColor" />

        {/* Knuten ligger i samma form som skallen och inte som en egen boll
            bakom den: två cirklar som skär varandra med samma fyllning
            smälter ihop till en, en som inte rör vid något gör det inte. */}
        <ellipse cx="437" cy="66" rx="15" ry="14" fill="currentColor" />
        <ellipse cx="416" cy="58" rx="29" ry="27" fill="currentColor" />
        <ellipse cx="413" cy="67" rx="26" ry="30" fill="currentColor" />
        <path d="M438 74c-1 16-11 28-26 28-14 0-24-11-26-27z" fill="currentColor" />
        <path d="M389 66l-6 6 6 5z" fill="currentColor" />
        <path d="M424 92l-24 2-2 26 27 2z" fill="currentColor" />

        <path d="M412 112c3 10 12 16 24 20 16 6 26 17 29 34 2 12 3 44 3 78h-112
          c0-34 1-66 3-78 3-17 13-28 29-34 12-4 21-10 24-20z" fill="currentColor" />

        {/* Den pekande armen är en egen grupp så att den kan röra sig för
            sig — det är den som gör att någon visar något. Handen ligger
            utanför skärmens kant och inte bakom den: skärmen ritas efter
            personerna, och en hand som hamnar innanför dess ram blir
            avklippt på mitten. */}
        <g className="folk__arm">
          <path d="M382 144c-17 6-29 17-38 33-9 15-15 29-19 42-2 6 2 11 9 12
            7 1 12-2 14-8 3-11 8-22 14-31 7-11 16-18 27-22z" fill="currentColor" />
          <path d="M388 148c-14 8-25 20-33 37-7 14-12 27-15 38" className="folk__som" />
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
