import { STATS, STUDIO } from './content'

/**
 * AKTERNA
 * ═══════
 * Fem akter, fem tagningar, och numera fem textskärmar — en per akt.
 *
 * ETT PARTI PER AKT, OCH INTE FLER
 * Det var inte så förut. Ett ämne som inte fick plats delades i flera
 * partier med samma rubrik, och akten hade dessutom två eller tre ämnen
 * var. Följden var att man kom fram till en plats i filmen, bilden ställde
 * sig stilla — och sedan rullade man vidare på samma stillastående bild
 * medan text efter text byttes ut framför en. Man stod på ett ställe och
 * fick upp ny text. Det läser inte som en föredragning utan som en
 * bildvisning där någon glömt byta bild.
 *
 * Nu bär varje akt en enda skärm. Allt som hör ihop står uppe samtidigt,
 * står kvar så länge man är kvar, och lämnar först när man rullar vidare
 * till nästa resa. En plats, en sak att säga.
 *
 * DET KOSTAR TEXT, OCH DET ÄR AVSIKTEN
 * En skärm rymmer en rubrik, en ingress och ett par korta punkter. Allt
 * som inte ryms är struket härifrån — inte förkortat, struket. Det
 * utförliga finns i kundunderlaget, som är gjort för att läsas i lugn och
 * ro; den här sidan ska få någon att höra av sig, inte besvara allt.
 *
 * Det som gick ut: de tolv erbjudandena som kort med varsin beskrivning
 * (sex finns kvar som taggar, de som har ett exempel att visa), de fem
 * processtegens brödtext, frågelistan, och ett par punkter som sade samma
 * sak som en annan akt redan sade bättre.
 *
 * DÄRFÖR FINNS INGEN UPPDELNING KVAR
 * `dela` och `MAX_RUTOR` är borta. Det som höll ihop sidan var att för
 * långa stycken styckades automatiskt; det som håller ihop den nu är att
 * de inte är för långa. Passformen är mätt vid 1440×900, 430×932, 390×844
 * och 375×667 — läggs något till här måste den mätningen göras om, för det
 * finns ingen automatik kvar som räddar en skärm som svämmar över.
 *
 * INGA RÄKNEORD I RUBRIKERNA
 * "Fyra saker avgör" och "fem steg" fick läsaren att börja räkna i stället
 * för att läsa, och siffran var i båda fallen det minst intressanta i
 * meningen. Punkterna räknar sig ändå själva när man ser dem.
 */

export type Panel = {
  rubrik: string
  brod?: string
  punkter?: { titel: string; text: string }[]
  /**
   * Taggarna: sidtyperna, som namn och ingenting mer.
   *
   * De var kort med bransch, namn, en beskrivning och en knapp under. Tolv
   * sådana tog sex skärmar, och det var sex skärmar där man stod stilla i
   * filmen och bläddrade. Namnet räcker för att säga vad vi bygger; det
   * som faktiskt övertygar är exemplet, och taggen är knappen som öppnar
   * det.
   */
  taggar?: { namn: string; exempel: string }[]
  tal?: { varde: string; text: string }[]
  /**
   * Flera knappar och inte en.
   *
   * Båda adresserna gäller lika mycket. Stod bara den ena här vore den i
   * praktiken huvudadress, och den som hör av sig skulle få gissa vem av
   * oss man helst vänder sig till.
   */
  knappar?: { text: string; href: string }[]
}

export type Akt = {
  id: string
  namn: string
  panel: Panel
}

export const AKTER: Akt[] = [
  {
    id: 'forst',
    namn: 'Studion',
    panel: {
      rubrik: 'De flesta bestämmer sig på några sekunder',
      brod: 'Vi ritar och utvecklar webbplatser och system åt små och medelstora verksamheter. Varje projekt från tomt blad — ingen mall i botten, ingen plattform att hyra.',
      punkter: [
        {
          titel: 'Att bli förstådd',
          text: 'De flesta verksamheter är bättre än vad deras webbplats visar. Formen följer av vad ni gör och för vem.',
        },
        {
          titel: 'Inga gissningar',
          text: 'Ni ser riktningen och vet vad varje steg kostar innan vi bygger något.',
        },
      ],
    },
  },
  {
    id: 'hantverket',
    namn: 'Vad vi bygger',
    panel: {
      rubrik: 'Webbplatser och system för alla slags verksamheter',
      brod: 'Samma arbetssätt för en enskild kampanjsida som för en e-handel med tusentals artiklar. Välj en typ för att se ett exempel.',
      taggar: [
        { namn: 'Företagswebbplats', exempel: 'site' },
        { namn: 'E-handel', exempel: 'shop' },
        { namn: 'Bokningssystem', exempel: 'booking' },
        { namn: 'Portfölj', exempel: 'portfolio' },
        { namn: 'Kampanjsida', exempel: 'campaign' },
        { namn: 'Portal och inloggat', exempel: 'portal' },
      ],
    },
  },
  {
    id: 'riktningen',
    namn: 'Arbetsgången',
    panel: {
      rubrik: 'Från första samtalet till lansering',
      /**
       * Tiden står samlad här och inte styckvis i korten.
       *
       * Varje steg bar sin egen tidsangivelse, och fyra sådana tog fyra
       * extra rader på en telefon — akten hade två bildpunkters marginal
       * kvar. Det är inte heller styckena man vill veta tiden för: den som
       * läser undrar när sajten är uppe, inte hur länge designsteget tar.
       * Den utförliga tidplanen står i underlaget.
       */
      brod: 'Fem till åtta veckor, och varje steg lämnar ifrån sig något ni kan hålla i handen. 15 % när arbetet inleds, resten vid godkänd leverans.',
      punkter: [
        { titel: 'Kartläggning', text: 'Ett till två samtal om vad sajten ska göra.' },
        { titel: 'Riktning', text: 'Form, omfattning, tidplan och fast pris.' },
        { titel: 'Design', text: 'Färdiga vyer för dator, platta och mobil.' },
        { titel: 'Bygge', text: 'En adress ni följer medan arbetet pågår.' },
      ],
    },
  },
  {
    id: 'bygget',
    namn: 'Bygget',
    panel: {
      rubrik: 'Handkodat, och ert när det är klart',
      brod: 'Prövat i riktiga webbläsare på riktiga enheter. Tillgänglighet och laddtid är krav från första komponenten.',
      punkter: [
        {
          titel: 'Ni äger arbetet',
          text: 'Källkod och konton överlämnas vid lansering. Inga licenser att förnya, inga nycklar kvar hos oss.',
        },
        {
          titel: 'Drift som tillval',
          text: 'För 319 kr i månaden: vår server, övervakning, uppdateringar och de mindre ändringar som dyker upp.',
        },
      ],
    },
  },
  {
    id: 'sedan',
    namn: 'Efter lansering',
    panel: {
      rubrik: 'Ska vi bygga något tillsammans?',
      brod: 'Vi startade studion för att det ska finnas något mellan en mall som ser ut som alla andras och en byrå som kostar som en anställd.',
      /**
       * Egna etiketter och inte `STATS.label`.
       *
       * Talen står på rad i en skärm som också bär rubrik, ingress och två
       * knappar, och etiketterna i `content.ts` är hela meningar — skrivna
       * för underlaget, där en av dem får ta en rad för sig själv. Fyra
       * sådana bredvid varandra blev fyra spalter på fem rader var, och
       * akten svämmade över. Här är de fyra bildtexter till fyra tal.
       */
      tal: [
        { varde: STATS[0].value, text: 'i förskott, resten vid godkänd leverans' },
        { varde: STATS[1].value, text: 'mallar i botten' },
        { varde: STATS[2].value, text: 'av koden blir er egen' },
        { varde: STATS[3].value, text: 'direkt med den som bygger' },
      ],
      knappar: STUDIO.emails.map((e) => ({ text: `Skriv till ${e}`, href: `mailto:${e}` })),
    },
  },
]
