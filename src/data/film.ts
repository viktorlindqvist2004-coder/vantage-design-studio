/**
 * FILMEN
 * ══════
 * Fem tagningar som bär arbetet i bild, och fem rubriker som säger vad vi
 * gör. Ordningen är arbetsgången: vad studion är, vad vi bygger, hur det
 * bestäms, hur det byggs, och vad som händer efter lansering.
 *
 * RUBRIKERNA HANDLAR OM ARBETET, INTE OM BILDEN
 * Första omgången rubriker beskrev tagningen — kameran som gick in mellan
 * pelarna, stenen som togs bort. Det var vackert och det var fel: den som
 * läser vill veta vad vi gör, och en bildbeskrivning svarar inte på det.
 * Filmen får bära stämningen. Texten säger saken. Av samma skäl står det
 * inte längre vad kameran gör — en tagningsanvisning är något för den som
 * spelar in, inte för den som funderar på att höra av sig.
 *
 * Inga räkneord i rubrikerna heller. "Fem steg" och "fyra saker" låter
 * läsaren börja räkna i stället för att läsa, och siffran är alltid det
 * minst intressanta i meningen.
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
  /** Var i arbetsgången man är. Står som etikett över rubriken. */
  ort: string
  rubrik: string
}

export const FILM: Tagning[] = [
  {
    id: 'portik',
    fil: '/film/1-portik.mp4',
    rorelse: 'dyk',
    ort: 'Studion',
    rubrik: 'Vi bygger webbplatser\noch system för hand',
  },
  {
    id: 'mejseln',
    fil: '/film/2-mejseln.mp4',
    rorelse: 'svep',
    ort: 'Vad vi bygger',
    rubrik: 'Sajten, och systemen\nsom ligger bakom den',
  },
  {
    id: 'ritningen',
    fil: '/film/3-ritningen.mp4',
    rorelse: 'port',
    ort: 'Arbetsgången',
    rubrik: 'Fast pris och tidplan\ninnan vi bygger något',
  },
  {
    id: 'pelaren',
    fil: '/film/4-pelaren.mp4',
    rorelse: 'pelare',
    ort: 'Bygget',
    rubrik: 'Handkodat och testat\npå riktiga enheter',
  },
  {
    id: 'agoran',
    fil: '/film/5-agoran.mp4',
    rorelse: 'avtack',
    ort: 'Efter lansering',
    rubrik: 'Ni äger koden,\nvi sköter driften',
  },
]
