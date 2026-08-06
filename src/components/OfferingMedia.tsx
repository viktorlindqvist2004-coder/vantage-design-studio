import { useState } from 'react'
import { OfferingArt } from './OfferingArt'
import type { Offering } from '../data/content'

/**
 * Bilden på kortet. Ligger fotot på plats under `public/` visas det; saknas
 * det ritas den genererade grafiken i stället, så att sidan aldrig visar en
 * trasig bildruta medan bildbanken fylls på.
 */
export function OfferingMedia({ offering, index }: { offering: Offering; index: number }) {
  const [missing, setMissing] = useState(false)

  if (missing || !offering.image) return <OfferingArt offering={offering} index={index} />

  return (
    <img
      className="card__art"
      src={`${import.meta.env.BASE_URL}${offering.image}`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setMissing(true)}
    />
  )
}
