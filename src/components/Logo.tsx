import { STUDIO } from '../data/content'

/**
 * LOGGAN
 * ══════
 * Märket är ritat i vektor i stället för lagt in som bild, och det är inte
 * bara en fråga om skärpa.
 *
 * Loggan är gjord med svart platta omkring sig. Läggs den plattan på en
 * sida som redan är svart syns den ändå — som en ruta en aning grönare
 * eller ljusare än bakgrunden, med en kant där den slutar. Ritad i vektor
 * finns ingen platta: bara siktet och triangeln, i sidans egen färg mot
 * sidans egen bakgrund. Det är så det mörka ska "blenda in".
 *
 * Formen ärver `currentColor`, så märket blir vitt där texten är vit och
 * dämpas med den där den är dämpad.
 */

/** Siktet och triangeln, utan text. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`logo__mark ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Siktets fyra hörn. Armarna är en sjättedel av sidan — kortare och
          det läser som fyra streck, längre och det blir en ram. */}
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="square">
        <path d="M4 22V4h18" />
        <path d="M78 4h18v18" />
        <path d="M96 78v18H78" />
        <path d="M22 96H4V78" />
      </g>
      {/* Triangeln står i mitten av siktet, inte i mitten av rutan — det är
          siktet den siktar in. */}
      <path d="M50 32 68 64H32z" fill="currentColor" />
    </svg>
  )
}

/**
 * Hela låset: märket med namnet under.
 *
 * `stacked` är loggan som den är gjord — märket över namnet, centrerat.
 * `inline` lägger dem på rad, för lister och sidhuvuden där höjden är knapp.
 */
export function Logo({
  variant = 'stacked',
  className = '',
}: {
  variant?: 'stacked' | 'inline'
  className?: string
}) {
  return (
    <span className={`logo logo--${variant} ${className}`}>
      <LogoMark />
      <span className="logo__type">
        <span className="logo__name">Vantage</span>
        <span className="logo__sub">Design Studio</span>
      </span>
      <span className="sr-only">{STUDIO.name}</span>
    </span>
  )
}
