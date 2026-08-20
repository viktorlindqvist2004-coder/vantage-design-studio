/**
 * FILMEN
 * ══════
 * Fem tagningar som bär arbetet i bild, och femton rader som säger vad vi
 * gör. Ordningen är arbetsgången: vad studion är, vad vi bygger, hur det
 * bestäms, hur det byggs, och vad som händer efter lansering.
 *
 * MAN RULLAR GENOM FILMEN, DEN GÅR INTE AV SIG SJÄLV
 * Tagningarna spelas inte upp. Rullningen är deras tidslinje: står man
 * still står bilden still, rullar man framåt går den framåt, rullar man
 * bakåt går den baklänges. Filerna är därför omkodade så att varje
 * bildruta är en nyckelruta — se `Verk.tsx` för varför det är hela
 * skillnaden mellan en film man rullar igenom och en som hackar.
 *
 * RADERNA AVLÖSER VARANDRA
 * Varje tagning bär flera rader och inte en. En rubrik som står kvar
 * genom hela tagningen blir en skylt man rullar förbi; rader som byts
 * medan bilden går blir textremsor i en film. Raden byts vid jämna delar
 * av tagningen, så den hör ihop med det man ser just då.
 *
 * RADERNA HANDLAR OM ARBETET, INTE OM BILDEN
 * Första omgången beskrev tagningen — kameran som gick in mellan pelarna,
 * stenen som togs bort. Det var vackert och det svarade inte på något:
 * den som läser vill veta vad vi gör. Filmen får bära stämningen, texten
 * säger saken. Inga räkneord heller; siffran är alltid det minst
 * intressanta i meningen.
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
  /** Var i arbetsgången man är. Står som etikett över raden. */
  ort: string
  /** Raderna som avlöser varandra medan man rullar genom tagningen. */
  repliker: string[]
}

export const FILM: Tagning[] = [
  {
    id: 'portik',
    fil: '/film/1-portik.mp4',
    rorelse: 'dyk',
    ort: 'Studion',
    repliker: [
      'Vi bygger webbplatser\noch system för hand',
      'Ingen mall under,\ninga lager av annat ovanpå',
      'Ni pratar med dem\nsom utför arbetet',
    ],
  },
  {
    id: 'mejseln',
    fil: '/film/2-mejseln.mp4',
    rorelse: 'svep',
    ort: 'Vad vi bygger',
    repliker: [
      'Sajten, och systemen\nsom ligger bakom den',
      'Bokning, portaler\noch interna verktyg',
      'Oavsett bransch\noch oavsett storlek',
    ],
  },
  {
    id: 'ritningen',
    fil: '/film/3-ritningen.mp4',
    rorelse: 'port',
    ort: 'Arbetsgången',
    repliker: [
      'Fast pris och tidplan\ninnan vi bygger något',
      'Ni ser allt\nmedan det är en ritning',
      'Resten betalar ni\nnär ni är nöjda',
    ],
  },
  {
    id: 'pelaren',
    fil: '/film/4-pelaren.mp4',
    rorelse: 'pelare',
    ort: 'Bygget',
    repliker: [
      'Handkodat och testat\npå riktiga enheter',
      'Tillgänglighet från början,\ninte tillagt sist',
      'En adress att klicka runt i\nmedan arbetet pågår',
    ],
  },
  {
    id: 'agoran',
    fil: '/film/5-agoran.mp4',
    rorelse: 'avtack',
    ort: 'Efter lansering',
    repliker: [
      'Ni äger koden\noch alla konton',
      'Vi sköter driften\npå vår egen server',
      'Ska vi bygga\nnågot tillsammans?',
    ],
  },
]
