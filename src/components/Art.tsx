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
 * Partiet handlar om att ni pratar direkt med den som bygger. Det gick att
 * säga med två prickar och en linje, och det gjorde sidan förut — men två
 * prickar är en symbol, och det här ska handla om människor.
 *
 * Ritade i linje och inte fotograferade, av två skäl. Ett foto på två
 * främlingar är ett foto på två främlingar; en teckning är tydlig med att
 * den föreställer situationen och inte personerna. Och studion har inga
 * bilder på riktiga möten att visa — då är en teckning ärligare än ett
 * köpt fotografi som låtsas vara ett.
 *
 * FORMEN
 * Första försöket var en cirkel på en kupol och en böjd arm, och det såg
 * ut som en skylt på en toalettdörr. Skillnaden mot något man tror på
 * ligger i tre saker, och alla tre finns här: en hals, så att huvudet
 * sitter på kroppen i stället för att sväva ovanför den; armbågar, så att
 * armarna kan göra något; och två kroppar som inte är samma kropp
 * speglad — den ena lutar sig fram och lyssnar, den andra visar något.
 *
 * De andas i olika takt. Det är den lilla osynkade rörelsen som gör att
 * man läser två personer och inte två former.
 */
export function Figures() {
  const ref = useReveal<SVGSVGElement>()

  return (
    <svg
      className="folk"
      ref={ref}
      viewBox="0 0 560 252"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Två personer i samtal vid ett bord med en skärm emellan sig"
    >
      {/* Rummet: bord och två stolar. Stolarna finns för att kropparna ska
          ha något att sitta på — utan dem svävar de. */}
      <g opacity="0.28">
        <path d="M26 198h508" />
        <path d="M96 198v42M464 198v42" />
        <path d="M74 198v-52M74 152h30" />
        <path d="M486 198v-52M486 152h-30" />
      </g>

      {/* Personen till vänster: lutar sig fram, lyssnar, handen på bordet. */}
      <g className="folk__en">
        <ellipse cx="150" cy="66" rx="16.5" ry="18.5" />
        <path d="M133 62c0-13 7-22 17-22s17 9 17 21c-3-5-9-9-17-9s-14 5-17 10z" />
        <path d="M142 83v11M158 83v10" />
        <path d="M112 198c0-46 9-79 20-90 10-7 20-7 30 0 11 11 20 44 20 90" />
        {/* Armen mot bordet, med armbåge. */}
        <path d="M161 112c17 9 29 24 37 39 4 8 13 13 23 14" />
        {/* Den bortre armen, delvis skymd av kroppen. */}
        <path d="M129 116c-9 14-13 33-13 50" opacity="0.55" />
      </g>

      {/* Skärmen dem emellan, på bordet. */}
      <g className="folk__skarm">
        <rect x="242" y="120" width="80" height="56" rx="5" opacity="0.55" />
        <path d="M282 176v14M264 190h36" opacity="0.4" />
        <path d="M252 134h30" stroke="var(--flame)" strokeWidth="4" />
        <path d="M252 146h56" opacity="0.34" />
        <path d="M252 156h40" opacity="0.26" />
        <path d="M252 166h48" opacity="0.2" />
      </g>

      {/* Personen till höger: sitter uppräten och visar något på skärmen. */}
      <g className="folk__tva">
        <ellipse cx="410" cy="62" rx="16.5" ry="18.5" />
        <path d="M393 60c0-13 8-22 18-22 9 0 15 6 16 15" />
        <circle cx="432" cy="48" r="7.5" />
        <path d="M402 79v11M418 79v10" />
        <path d="M370 198c0-48 9-81 20-92 10-7 20-7 30 0 11 11 20 46 20 92" />
        {/* Armen som pekar mot skärmen. Egen grupp, så att den kan röra sig
            för sig — det är den som gör att någon visar något. */}
        <g className="folk__arm">
          <path d="M390 110c-16 7-28 20-36 33-4 7-11 11-19 12" />
        </g>
        <path d="M431 114c9 15 13 35 13 52" opacity="0.55" />
      </g>
    </svg>
  )
}
