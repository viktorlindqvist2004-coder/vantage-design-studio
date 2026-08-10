import type { ReactNode } from 'react'
import { useReveal } from '../lib/motion'

/**
 * BYGGSTENARNA FÖR RÖRELSE
 * ════════════════════════
 * Tre former används genom hela sidan, och inga andra. Att hålla antalet
 * nere är vad som skiljer en sida med mycket rörelse från en rörig sida:
 * samma sak ska röra sig på samma sätt varje gång, så att rörelsen blir ett
 * språk i stället för en samling infall.
 *
 *  `Rise`    — stiger och tonar in. För block: stycken, kort, bilder.
 *  `Kinetic` — ord som skjuts upp bakom en kant. Bara för rubriker.
 *  `Rule`    — en linje som dras ut. För avdelare.
 *
 * Fördröjningen skickas i millisekunder och landar i `--d`, som CSS:en
 * lägger på övergången. Trappan mellan syskon ska vara kort — 60–120 ms.
 * Längre och det läser som att sidan laddar långsamt.
 */

type RiseProps = {
  children: ReactNode
  /** Fördröjning i millisekunder. */
  delay?: number
  className?: string
  as?: 'div' | 'p' | 'li' | 'span' | 'section' | 'header' | 'footer'
}

export function Rise({ children, delay = 0, className = '', as = 'div' }: RiseProps) {
  const ref = useReveal<HTMLDivElement>()
  const Tag = as as 'div'
  return (
    <Tag
      ref={ref}
      className={`rise ${className}`}
      style={delay ? ({ '--d': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}

/**
 * En rubrik där varje ord skjuts upp bakom en kant.
 *
 * Orden delas i egna rutor med dold spillning. Innehållet står nedtryckt
 * ett helt radhöjd och åker upp på plats — vilket ser ut som att texten
 * sätts, inte som att den tonar in.
 *
 * Radbrytning styrs med `\n` i texten. Ett ord kan inte brytas mitt itu
 * här, så en rubrik som ska brytas på ett bestämt ställe måste säga det.
 *
 * Ett ord mellan asterisker — `*så*` — sätts i accentfärgen. Det är enda
 * sättet att lyfta ett enskilt ord när rubriken kommer in som en sträng,
 * och det håller texten läsbar i innehållsfilen.
 */
export function Kinetic({
  text,
  delay = 0,
  step = 55,
  className = '',
  as = 'h2',
}: {
  text: string
  delay?: number
  step?: number
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}) {
  const ref = useReveal<HTMLHeadingElement>()
  const Tag = as as 'h2'
  const lines = text.split('\n')
  let n = 0

  return (
    <Tag ref={ref} className={`kin ${className}`}>
      {lines.map((line, li) => (
        <span
          className="kin__line"
          key={li}
          style={{ '--l': li } as React.CSSProperties}
        >
          {line.split(' ').map((raw) => {
            const d = delay + n++ * step
            const hot = raw.length > 2 && raw.startsWith('*') && raw.endsWith('*')
            const word = hot ? raw.slice(1, -1) : raw
            return (
              <span className={`kin__word${hot ? ' kin__word--hot' : ''}`} key={`${li}-${n}`}>
                <span style={{ '--d': `${d}ms` } as React.CSSProperties}>{word}</span>
              </span>
            )
          })}
        </span>
      ))}
    </Tag>
  )
}

/**
 * Text som sveps fram bakom en kant.
 *
 * Skillnaden mot `Rise` är att innehållet inte tonar in utan avtäcks: en
 * kant far från vänster till höger och lämnar texten efter sig. Det läser
 * som att raden sätts, inte som att den laddar — och det är den enda
 * rörelsen på sidan som inte rör själva elementet, bara vad man ser av det.
 *
 * `clip-path` går att animera på kompositortråden, precis som transform.
 * Att animera bredden hade tvingat fram ny layout varje bildruta.
 *
 * Klippet sitter på en inre ruta och inte på den som bevakas, och det är
 * inte en formalitet. Webbläsaren räknar in elementets eget `clip-path` när
 * den avgör hur mycket av det som syns — ett element klippt till noll bredd
 * rapporteras som osynligt. Satt klippet på den bevakade rutan blev det ett
 * lås: den syntes aldrig, fick därför aldrig klassen som tar bort klippet,
 * och texten stod osynlig för alltid. Ytterrutan är oklippt och syns; den
 * inre bär klippet.
 */
export function Sweep({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: RiseProps) {
  const ref = useReveal<HTMLDivElement>()
  const Tag = as as 'div'
  return (
    <Tag
      ref={ref}
      className={`sweep ${className}`}
      style={delay ? ({ '--d': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      <span className="sweep__i">{children}</span>
    </Tag>
  )
}

/** En linje som dras ut från vänster när den kommer in i rutan. */
export function Rule({ delay = 0, className = '' }: { delay?: number; className?: string }) {
  const ref = useReveal<HTMLSpanElement>()
  return (
    <span
      ref={ref}
      className={`rule ${className}`}
      style={delay ? ({ '--d': `${delay}ms` } as React.CSSProperties) : undefined}
      aria-hidden="true"
    />
  )
}

/** Den lilla versalsatta etiketten som inleder varje parti. */
export function Eyebrow({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <Rise className="eyebrow" delay={delay}>
      <span className="eyebrow__dot" aria-hidden="true" />
      {children}
    </Rise>
  )
}
