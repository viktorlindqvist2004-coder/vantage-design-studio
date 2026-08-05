import type { JSX } from 'react'
import type { Offering } from '../data/content'

/**
 * Bilden på varje kort.
 *
 * Det är ingen bild på en färdig sajt, utan en skiss av vad den sortens
 * sajt består av: en butik har ett rutnät av varor och en kassa, en bokning
 * har en kalender, en portal har en sidomeny och nyckeltal. Skissen ska gå
 * att känna igen på en halv sekund och säga vad man får — ett fotografi av
 * någon annans webbplats hade sagt vad någon annan fick.
 *
 * Allt ritas i sidans egen mörka skala med tunna streck. Formerna är fasta,
 * inte slumpade: en kalender ska se ut som en kalender varje gång, inte som
 * en tillfällighet.
 */
export function OfferingArt({ offering }: { offering: Offering; index?: number }) {
  const [a, b, bg] = offering.palette

  return (
    <svg
      className="card__art"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="400" height="300" fill={bg} />
      <g stroke={a} fill={a}>{SKETCHES[offering.sketch](a, b)}</g>
    </svg>
  )
}

type Sketch = (a: string, b: string) => JSX.Element

/** En rad text, som ett tunt streck. */
const line = (x: number, y: number, w: number, o = 0.5, h = 2) => (
  <rect key={`${x}-${y}-${w}-${h}`} x={x} y={y} width={w} height={h} opacity={o} />
)

const SKETCHES: Record<Offering['sketch'], Sketch> = {
  /** Företagswebbplats: meny, ett stort anslag, tre ingångar under. */
  site: (a) => (
    <>
      <circle cx="34" cy="34" r="4" opacity="0.75" />
      {line(48, 32, 42, 0.5)}
      {[300, 328, 356].map((x) => line(x, 32, 20, 0.32))}
      <rect x="24" y="58" width="352" height="1" opacity="0.16" />

      {line(34, 96, 200, 0.85, 9)}
      {line(34, 118, 150, 0.85, 9)}
      {line(34, 150, 172, 0.34)}
      {line(34, 162, 132, 0.34)}
      <rect x="34" y="184" width="72" height="20" fill="none" stroke={a} strokeWidth="1" opacity="0.6" />

      {[34, 158, 282].map((x) => (
        <g key={x}>
          <rect x={x} y="232" width="84" height="42" fill="none" strokeWidth="0.8" opacity="0.3" />
          {line(x + 12, 246, 40, 0.4)}
          {line(x + 12, 256, 56, 0.22)}
        </g>
      ))}
    </>
  ),

  /** E-handel: varorna i rutnät, pris under, en kundvagn uppe till höger. */
  shop: (a) => (
    <>
      {line(24, 30, 46, 0.5)}
      <rect x="350" y="26" width="18" height="14" fill="none" strokeWidth="1" opacity="0.6" />
      <path d="M354 26 v-5 h10 v5" fill="none" strokeWidth="1" opacity="0.6" />
      <rect x="24" y="52" width="352" height="1" opacity="0.16" />

      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => {
          const x = 30 + c * 118
          const y = 72 + r * 108
          return (
            <g key={`${c}-${r}`}>
              <rect x={x} y={y} width="100" height="66" fill={a} opacity={0.1 + (c + r) * 0.02} />
              <rect x={x} y={y} width="100" height="66" fill="none" strokeWidth="0.7" opacity="0.24" />
              {line(x, y + 76, 58, 0.4)}
              {line(x, y + 86, 30, 0.22)}
            </g>
          )
        }),
      )}
    </>
  ),

  /** Bokning: en månad, valda dagar, tider att välja bland till höger. */
  booking: (a) => (
    <>
      {line(28, 30, 62, 0.5)}
      <rect x="24" y="52" width="352" height="1" opacity="0.16" />

      {[0, 1, 2, 3, 4, 5, 6].map((i) => line(30 + i * 30, 70, 12, 0.28))}
      {Array.from({ length: 28 }, (_, i) => {
        const x = 28 + (i % 7) * 30
        const y = 88 + Math.floor(i / 7) * 30
        const picked = i === 9 || i === 10 || i === 17
        return (
          <rect
            key={i}
            x={x} y={y} width="22" height="22"
            fill={picked ? a : 'none'}
            opacity={picked ? 0.5 : 0.22}
            strokeWidth="0.7"
          />
        )
      })}

      <rect x="252" y="70" width="1" height="166" opacity="0.16" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect
            x="278" y={86 + i * 32} width="92" height="22"
            fill={i === 1 ? a : 'none'} opacity={i === 1 ? 0.4 : 0.2} strokeWidth="0.7"
          />
          {line(288, 95 + i * 32, 34, i === 1 ? 0.7 : 0.34)}
        </g>
      ))}
    </>
  ),

  /** Portfölj: arbetet i ett murverk, ingenting annat som stör. */
  portfolio: (a) => (
    <>
      {line(28, 30, 54, 0.5)}
      <rect x="24" y="52" width="352" height="1" opacity="0.16" />

      {[
        [28, 72, 160, 118], [200, 72, 78, 118], [290, 72, 82, 60],
        [290, 144, 82, 46], [28, 202, 106, 66], [146, 202, 132, 66],
        [290, 202, 82, 66],
      ].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill={a} opacity={0.08 + (i % 3) * 0.045} />
          <rect x={x} y={y} width={w} height={h} fill="none" strokeWidth="0.7" opacity="0.22" />
        </g>
      ))}
    </>
  ),

  /** Kampanj: en sida, ett budskap, en knapp. */
  campaign: (a) => (
    <>
      <circle cx="200" cy="48" r="4" opacity="0.6" />
      {line(112, 92, 176, 0.9, 12)}
      {line(140, 118, 120, 0.9, 12)}
      {line(126, 158, 148, 0.32)}
      {line(150, 170, 100, 0.32)}
      <rect x="158" y="200" width="84" height="24" fill={a} opacity="0.5" />
      <rect x="24" y="256" width="352" height="1" opacity="0.14" />
      {[150, 200, 250].map((x) => <circle key={x} cx={x} cy="274" r="2.5" opacity="0.3" />)}
    </>
  ),

  /** Portal: inloggat läge — sidomeny, nyckeltal, en kurva och rader. */
  portal: (a, b) => (
    <>
      <rect x="0" y="0" width="96" height="300" fill={a} opacity="0.07" />
      <circle cx="26" cy="34" r="5" opacity="0.7" />
      {[62, 88, 114, 140].map((y, i) => (
        <g key={y}>
          <rect x="14" y={y - 7} width="68" height="16" fill={a} opacity={i === 0 ? 0.14 : 0} />
          {line(24, y, i === 0 ? 46 : 38, i === 0 ? 0.55 : 0.28)}
        </g>
      ))}

      {line(120, 30, 64, 0.5)}
      <circle cx="364" cy="32" r="8" fill="none" strokeWidth="1" opacity="0.5" />

      {[120, 210, 300].map((x, i) => (
        <g key={x}>
          <rect x={x} y="58" width="76" height="46" fill="none" strokeWidth="0.7" opacity="0.24" />
          {line(x + 10, 72, 26, 0.24)}
          {line(x + 10, 84, 40 - i * 8, 0.6, 6)}
        </g>
      ))}

      <polyline
        points="122,182 158,166 194,174 230,146 266,154 302,128 338,136 374,116"
        fill="none" stroke={b} strokeWidth="1.4" opacity="0.75"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="120" y={212 + i * 22} width="256" height="1" opacity="0.12" />
          {line(120, 220 + i * 22, 58, 0.3)}
          {line(230, 220 + i * 22, 84, 0.18)}
        </g>
      ))}
    </>
  ),
}
