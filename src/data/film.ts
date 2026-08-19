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
  /** Vilken övergång rutan bär. Se `.scen[data-rorelse]` i site.css. */
  rorelse: Rorelse
  /** Kamerarörelsen i klippet, skriven som en tagningsanvisning. */
  kamera: string
  ort: string
  rubrik: string
  brod: string
}

export const FILM: Tagning[] = [
  {
    id: 'portik',
    fil: '/film/1-portik.mp4',
    rorelse: 'dyk',
    kamera: 'Kameran går in',
    ort: 'Först',
    rubrik: 'Vi går in\noch ser oss om',
    brod: 'Ingen ritar något innan vi förstått vad huset ska användas till. Vi börjar med er verksamhet, era kunder och vad som faktiskt ska hända när någon hittar hit.',
  },
  {
    id: 'mejseln',
    fil: '/film/2-mejseln.mp4',
    rorelse: 'svep',
    kamera: 'Kameran kretsar',
    ort: 'Hantverket',
    rubrik: 'Sten tas bort,\ninget läggs till',
    brod: 'Vi skriver koden för hand, rad för rad. Det som blir kvar är det som behövs — ingen mall under, inga lager av annat folks lösningar ovanpå.',
  },
  {
    id: 'ritningen',
    fil: '/film/3-ritningen.mp4',
    rorelse: 'port',
    kamera: 'Kameran sänker sig',
    ort: 'Riktningen',
    rubrik: 'Allt ligger\npå bordet',
    brod: 'Ni ser form, omfattning, tidplan och fast pris innan vi bygger något. Vill ni ändra er gör ni det medan det bara är en ritning.',
  },
  {
    id: 'pelaren',
    fil: '/film/4-pelaren.mp4',
    rorelse: 'pelare',
    kamera: 'Kameran ser uppåt',
    ort: 'Bygget',
    rubrik: 'Det reses\nkomponent för komponent',
    brod: 'Handkodat och testat i riktiga webbläsare på riktiga enheter. Tillgänglighet är med från början, inte tillagt sist när det är dyrt.',
  },
  {
    id: 'agoran',
    fil: '/film/5-agoran.mp4',
    rorelse: 'avtack',
    kamera: 'Kameran drar bakåt',
    ort: 'Sedan',
    rubrik: 'Och så\nöppnar det',
    brod: 'Vi flyttar upp, mäter och lämnar över koden till er. Femton procent i förskott, resten först när ni är nöjda.',
  },
]
