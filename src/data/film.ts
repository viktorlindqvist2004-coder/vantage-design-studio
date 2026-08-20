/**
 * FILMEN
 * ══════
 * Fem tagningar som bär arbetsgången i bild. Ordningen är berättelsen:
 * man kommer fram, hantverket visar sig, riktningen läggs, bygget reser
 * sig, och till sist står det färdigt bland folk.
 *
 * Varje tagning har sin egen kamerarörelse, och varje tagning har därför
 * också sin egen övergång. Rörelsen i rutan och rörelsen i sidan ska vara
 * samma rörelse: en kamera som dyker in mellan pelare möts av en ridå som
 * öppnar sig, en kran som drar bakåt möts av en ruta som vidgar sig. Fem
 * likadana övergångar hade gjort de fem tagningarna till en enda.
 */

export type Rorelse = 'dyk' | 'svep' | 'port' | 'pelare' | 'avtack'

export type Tagning = {
  id: string
  fil: string
  /** Vilken övergång lagret bär. Se `.verk__lager[data-rorelse]` i site.css. */
  rorelse: Rorelse
  /** Kamerarörelsen i klippet, skriven som en tagningsanvisning. */
  kamera: string
  ort: string
  rubrik: string
}

export const FILM: Tagning[] = [
  {
    id: 'portik',
    fil: '/film/1-portik.mp4',
    rorelse: 'dyk',
    kamera: 'Kameran går in',
    ort: 'Först',
    rubrik: 'Vi går in\noch ser oss om',
  },
  {
    id: 'mejseln',
    fil: '/film/2-mejseln.mp4',
    rorelse: 'svep',
    kamera: 'Kameran kretsar',
    ort: 'Hantverket',
    rubrik: 'Sten tas bort,\ninget läggs till',
  },
  {
    id: 'ritningen',
    fil: '/film/3-ritningen.mp4',
    rorelse: 'port',
    kamera: 'Kameran sänker sig',
    ort: 'Riktningen',
    rubrik: 'Allt ligger\npå bordet',
  },
  {
    id: 'pelaren',
    fil: '/film/4-pelaren.mp4',
    rorelse: 'pelare',
    kamera: 'Kameran ser uppåt',
    ort: 'Bygget',
    rubrik: 'Det reses\nkomponent för komponent',
  },
  {
    id: 'agoran',
    fil: '/film/5-agoran.mp4',
    rorelse: 'avtack',
    kamera: 'Kameran drar bakåt',
    ort: 'Sedan',
    rubrik: 'Och så\nöppnar det',
  },
]
