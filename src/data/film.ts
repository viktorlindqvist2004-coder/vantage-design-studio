/**
 * FILMEN
 * ══════
 * En enda resa genom ett tempelbygge, i fem tagningar. Ordningen är
 * arbetsgången: man kommer fram, ser hantverket, ser ritningen, ser bygget
 * resa sig, och ser det färdigt bland folk.
 *
 * TAGNINGARNA SITTER IHOP, PÅ RIKTIGT
 * Varje tagning är genererad med föregående tagnings allra sista bildruta
 * som startbild. Klipp två börjar alltså på exakt den ruta klipp ett
 * slutade på, och så vidare genom alla fem. Det är inte en skarv som
 * döljs — det finns ingen skarv. Mätt genom att lägga sista rutan i N
 * bredvid första rutan i N+1: paren är närmast identiska.
 *
 * Materialet är målat och inte fotograferat: gammalt oljemåleri i barock
 * kyrkomålningsstil, varm ockra och djup umbra, synliga penseldrag och
 * kraklerad fernissa. Det är en värld man färdas genom, inte en film man
 * tittar på.
 *
 * MAN RULLAR GENOM FILMEN, DEN GÅR INTE AV SIG SJÄLV
 * Tagningarna spelas inte upp. Rullningen är deras tidslinje: står man
 * still står bilden still, rullar man framåt går den framåt, rullar man
 * bakåt går den baklänges. Filerna är omkodade med nyckelruta var fjärde
 * bildruta — se `Verk.tsx` för varför det är hela skillnaden mellan en
 * film man rullar igenom och en som hackar.
 *
 * RADERNA AVLÖSER VARANDRA
 * Varje tagning bär flera rader och inte en. En rubrik som står kvar genom
 * hela tagningen blir en skylt man rullar förbi; rader som byts medan
 * bilden går blir textremsor i en film. Raden byts vid jämna delar av
 * tagningen, så den hör ihop med det man ser just då.
 *
 * Raderna handlar om arbetet och inte om bilden, och de bär inga räkneord:
 * siffran är alltid det minst intressanta i meningen.
 *
 * Färdriktningen är olika i varje tagning — rakt fram, förbi i sidled, ned
 * över bordet, uppför pelaren, bakåt ut över staden. Se
 * `.verk__lager[data-rorelse]` i site.css. Variationen ligger där, inte i
 * övergångarna: en figur som ritar upp nästa bild säger "här kommer nästa
 * bild", och då bläddrar man i stället för att färdas.
 */

/**
 * Filmerna importeras och ligger inte i `public/`.
 *
 * En fil i `public/` kopieras rakt igenom med oförändrad adress. Byter man
 * innehållet men behåller namnet — vilket hände när det här materialet
 * ersattes — pekar adressen fortfarande på samma sak, och varje webbläsare
 * och varje mellanlagrande nod som redan hämtat filen fortsätter visa den
 * gamla filmen. Ingen får någonsin veta att den bytts.
 *
 * Importerade filer får i stället ett namn som räknas fram ur innehållet.
 * Ändras en enda bildruta ändras adressen, och då finns ingen gammal
 * version kvar att servera. Det är inte en försiktighetsåtgärd — det är den
 * enda ordning där ett filmbyte säkert når fram.
 */
import portik from '../film/1-portik.mp4'
import verkstaden from '../film/2-verkstaden.mp4'
import ritningen from '../film/3-ritningen.mp4'
import pelaren from '../film/4-pelaren.mp4'
import staden from '../film/5-staden.mp4'

export type Rorelse = 'dyk' | 'svep' | 'port' | 'pelare' | 'avtack'

export type Tagning = {
  id: string
  fil: string
  /** Vilken väg kameran tar. Se `.verk__lager[data-rorelse]` i site.css. */
  rorelse: Rorelse
  /** Var i arbetsgången man är. Står som etikett över raden. */
  ort: string
  /** Raderna som avlöser varandra medan man rullar genom tagningen. */
  repliker: string[]
}

export const FILM: Tagning[] = [
  {
    // Över slätten, in mellan pelarna, in i skuggan.
    id: 'portik',
    fil: portik,
    rorelse: 'dyk',
    ort: 'Studion',
    repliker: [
      'Vi bygger webbplatser\noch system för hand',
      'Ingen mall under,\ninga lager av annat ovanpå',
      'Ni pratar med dem\nsom utför arbetet',
    ],
  },
  {
    // Ut genom dörren, förbi stenhuggarna, fram till arbetsbordet.
    id: 'verkstaden',
    fil: verkstaden,
    rorelse: 'svep',
    ort: 'Vad vi bygger',
    repliker: [
      'Sajten, och systemen\nsom ligger bakom den',
      'Bokning, portaler\noch interna verktyg',
      'Oavsett bransch\noch oavsett storlek',
    ],
  },
  {
    // Ned över bordet: ritningar, passare, tempelmodellen i trä.
    id: 'ritningen',
    fil: ritningen,
    rorelse: 'port',
    ort: 'Arbetsgången',
    repliker: [
      'Fast pris och tidplan\ninnan vi bygger något',
      'Ni ser allt\nmedan det är en ritning',
      'Resten betalar ni\nnär ni är nöjda',
    ],
  },
  {
    // Uppför den halvfärdiga pelaren, förbi ställningarna, till kapitälet.
    id: 'pelaren',
    fil: pelaren,
    rorelse: 'pelare',
    ort: 'Bygget',
    repliker: [
      'Handkodat och testat\npå riktiga enheter',
      'Tillgänglighet från början,\ninte tillagt sist',
      'En adress att klicka runt i\nmedan arbetet pågår',
    ],
  },
  {
    // Bakåt och uppåt från kapitälet, ut över den färdiga staden.
    id: 'staden',
    fil: staden,
    rorelse: 'avtack',
    ort: 'Efter lansering',
    repliker: [
      'Ni äger koden\noch alla konton',
      'Vi sköter driften\npå vår egen server',
      'Ska vi bygga\nnågot tillsammans?',
    ],
  },
]
