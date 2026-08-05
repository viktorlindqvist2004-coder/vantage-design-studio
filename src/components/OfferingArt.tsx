import { useMemo } from 'react'
import { seeded } from '../lib/math'
import type { Offering } from '../data/content'

/**
 * Varje projektkort får en egen genererad komposition i stället för ett
 * fotografi. Formerna byggs deterministiskt ur projektets `seed`, så samma
 * projekt ser likadant ut vid varje rendering — lugna, tunna och glesa.
 */
export function OfferingArt({ offering, index }: { offering: Offering; index: number }) {
  const [a, b, bg] = offering.palette

  const shapes = useMemo(() => {
    const rnd = seeded(offering.seed)
    const style = index % 6

    if (style === 0) {
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <circle
              key={i}
              cx="200" cy="150" r={30 + i * 22}
              fill="none" stroke={a} strokeWidth="0.8"
              opacity={0.5 - i * 0.06}
            />
          ))}
          <circle cx="200" cy="150" r="11" fill={a} opacity="0.55" />
        </>
      )
    }

    if (style === 1) {
      return (
        <>
          <rect x="42" y="52" width="120" height="196" fill={a} opacity="0.16" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x="200" y={62 + i * 24}
              width={50 + rnd() * 130} height="1"
              fill={b} opacity="0.55"
            />
          ))}
          <rect x="200" y="52" width="96" height="1.6" fill={a} opacity="0.8" />
        </>
      )
    }

    if (style === 2) {
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={i}
              x1={-20 + i * 55} y1="300" x2="200" y2="118"
              stroke={a} strokeWidth="0.7" opacity="0.28"
            />
          ))}
          <rect x="128" y="116" width="144" height="98" fill="none" stroke={a} strokeWidth="1" opacity="0.7" />
          <line x1="0" y1="118" x2="400" y2="118" stroke={b} strokeWidth="0.8" opacity="0.5" />
        </>
      )
    }

    if (style === 3) {
      return (
        <>
          {Array.from({ length: 3 }, (_, i) => {
            const cx = 120 + rnd() * 170
            const cy = 100 + rnd() * 100
            const r = 52 + rnd() * 44
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? a : b} opacity="0.14" />
            )
          })}
          <rect x="164" y="104" width="72" height="106" fill="none" stroke={a} strokeWidth="0.9" opacity="0.65" />
          <rect x="180" y="128" width="40" height="1.4" fill={a} opacity="0.7" />
        </>
      )
    }

    if (style === 4) {
      return (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <rect
              key={i}
              x={48} y={60 + i * 38}
              width={90 + rnd() * 210} height="1.4"
              fill={i % 2 ? a : b}
              opacity={0.62 - i * 0.07}
            />
          ))}
          <rect x="48" y="60" width="1.4" height="190" fill={a} opacity="0.4" />
        </>
      )
    }

    return (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="200" cy="150"
            rx={14 + i * 12} ry="86"
            fill="none" stroke={a} strokeWidth="0.7" opacity="0.3"
          />
        ))}
        <circle cx="200" cy="150" r="86" fill="none" stroke={b} strokeWidth="1" opacity="0.6" />
      </>
    )
  }, [offering.seed, index, a, b])

  return (
    <svg
      className="card__art"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Grafiskt koncept för ${offering.name}`}
    >
      <rect width="400" height="300" fill={bg} />
      {shapes}
    </svg>
  )
}
