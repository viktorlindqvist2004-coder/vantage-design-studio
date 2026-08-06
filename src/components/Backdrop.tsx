/**
 * BAKGRUNDERNA
 * ════════════
 * Sektionerna inne i skärmen är text på svart, och där texten är kort blir
 * det mycket svart kvar. De här formerna fyller ytan utan att ta någon
 * uppmärksamhet: svartvitt, i sidans egen ton, och så dova att man ser dem
 * först när man letar.
 *
 * De är ritade och inte fotograferade. Det är dels vad som går att göra utan
 * bildbank, dels det ärligaste: ett foto på någon annans kontor säger
 * ingenting om den här studion, och sidans egna filmrutor är redan sedda.
 *
 * Allt är statiskt. Ingen av dem räknar något per bildruta, och de ligger
 * bakom innehållet utan att fånga pekaren — bakgrunden får inte kosta något
 * av rörelsen någon annanstans.
 */

export type BackdropKind = 'raster' | 'boge' | 'stralar' | 'horisont'

export function Backdrop({ kind }: { kind: BackdropKind }) {
  return (
    <div className={`backdrop backdrop--${kind}`} aria-hidden="true">
      {SHAPES[kind]}
    </div>
  )
}

const SHAPES: Record<BackdropKind, React.ReactNode> = {
  /** Ett fint rutnät som tonar bort uppåt — plan, ritning, arbetsyta. */
  raster: (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bd-raster" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="bd-raster-m">
          <rect width="1200" height="800" fill="url(#bd-raster)" />
        </mask>
      </defs>
      <g mask="url(#bd-raster-m)" stroke="#fff" strokeWidth="1" fill="none">
        {Array.from({ length: 25 }, (_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="800" />
        ))}
        {Array.from({ length: 17 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="1200" y2={i * 50} />
        ))}
      </g>
    </svg>
  ),

  /** En stor tunn båge. Ett enda drag, inget mer. */
  boge: (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="#fff">
        <circle cx="900" cy="400" r="520" strokeWidth="1" opacity="0.5" />
        <circle cx="900" cy="400" r="360" strokeWidth="1" opacity="0.3" />
        <circle cx="900" cy="400" r="200" strokeWidth="1" opacity="0.18" />
      </g>
    </svg>
  ),

  /** Ljus som faller in snett, som genom en persienn. */
  stralar: (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bd-str" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="url(#bd-str)">
        {Array.from({ length: 7 }, (_, i) => (
          <rect
            key={i}
            x={-300 + i * 190}
            y="-200"
            width={54 - i * 5}
            height="1400"
            transform="rotate(24 600 400)"
          />
        ))}
      </g>
    </svg>
  ),

  /**
   * En horisont — men som dis, inte som streck.
   *
   * Första försöket hade ett hårt steg i mitten av tonen. Det blev en skarp
   * linje tvärs över sidan, och eftersom sektionen redan har hårfina streck
   * under varje tal lästes den som ett av dem: ett avdelarstreck på fel
   * ställe. Inga branta steg här alltså; ljuset ska tona in och ut över
   * hundratals bildpunkter så att man ser en ljusning, inte en kant.
   */
  horisont: (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bd-hor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.66" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.9" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bd-hor)" />
    </svg>
  ),
}
