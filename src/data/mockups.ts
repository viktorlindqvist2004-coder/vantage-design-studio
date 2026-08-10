/**
 * EXEMPELSIDORNA
 * ══════════════
 * Under varje sorts webbplats vi bygger finns en knapp som öppnar en hel
 * sajt inuti sidan, med riktig typografi, riktig layout, riktigt innehåll
 * och saker som går att klicka på.
 *
 * De är våra egna. Varje exempel heter Vantage och sorten det visar —
 * Vantage E-handel, Vantage Bokning — och bär vår logotyp. Studion är ny
 * och har inga kunduppdrag att visa; alternativen är att visa någon
 * annans arbete, att visa ingenting, eller att bygga något själv. Det
 * tredje är det enda som både är sant och säger något, och för en studio
 * som säljer att bygga sidor är det dessutom det starkaste beviset som
 * finns.
 *
 * Varje exempel bär sin egen färgvärld och sitt eget typsnitt. Poängen är
 * att visa att formen följer uppgiften: en byrå och en butik ska inte se
 * ut som samma sajt med olika logotyp, och det är precis vad en mall ger.
 *
 * Innehållet är påhittat — priser, tider och sändningsnummer föreställer
 * ingenting verkligt.
 */

export type Block =
  | { t: 'nav'; links: string[]; cta?: string }
  | { t: 'hero'; title: string; lead: string; cta: string; art: ArtKind }
  | { t: 'cols'; head: string; items: { h: string; p: string }[] }
  | { t: 'varor'; head: string; items: { n: string; pris: string }[] }
  | { t: 'kalender'; head: string; lead: string }
  | { t: 'galleri'; head: string; n: number }
  | { t: 'panel'; head: string; rows: [string, string, string][] }
  | { t: 'cta'; title: string; btn: string }
  | { t: 'foot'; cols: { h: string; rows: string[] }[] }

/** Vad som ritas i hjältens bildyta. Inga foton — se filens huvud. */
export type ArtKind = 'valv' | 'lera' | 'ljus' | 'rutor' | 'stapel' | 'graf'

export type Mockup = {
  /** Nyckeln matchar `Offering.sketch` i content.ts. */
  id: string
  /** Visas som logotyp: Vantage + sorten. */
  namn: string
  bransch: string
  adress: string
  /** Bakgrund, bläck, dämpat, accent, och om tonen är mörk. */
  bg: string
  ink: string
  dim: string
  accent: string
  mork?: boolean
  /** Typsnittspar: rubrik och brödtext. */
  rubrik: string
  block: Block[]
}

const SANS = "'Geist', system-ui, sans-serif"
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export const MOCKUPS: Mockup[] = [
  {
    id: 'site',
    namn: 'Företagswebbplats',
    bransch: 'Exempel på en företagswebbplats',
    adress: 'vantagedesignstudio.se/exempel/foretagswebbplats',
    bg: '#f6f4ef',
    ink: '#16202c',
    dim: '#5c6874',
    accent: '#1f4b73',
    rubrik: SERIF,
    block: [
      { t: 'nav', links: ['Verksamhetsområden', 'Medarbetare', 'Om byrån', 'Kontakt'], cta: 'Boka rådgivning' },
      {
        t: 'hero',
        title: 'Juridisk rådgivning för företag som växer.',
        lead: 'Vi arbetar med affärsjuridik, avtal och tvistlösning för små och medelstora bolag i Mälardalen. Första samtalet kostar ingenting.',
        cta: 'Boka ett första samtal',
        art: 'valv',
      },
      {
        t: 'cols',
        head: 'Verksamhetsområden',
        items: [
          { h: 'Affärsjuridik', p: 'Bolagsbildning, ägaravtal och styrelsearbete — från start till exit.' },
          { h: 'Avtal', p: 'Granskning och upprättande av kommersiella avtal, på svenska och engelska.' },
          { h: 'Tvistlösning', p: 'Förhandling först, process när det behövs. Ni vet alltid vad nästa steg kostar.' },
          { h: 'Arbetsrätt', p: 'Anställningsfrågor, omorganisation och tvister vid uppsägning.' },
        ],
      },
      { t: 'cta', title: 'Har ni en fråga ni vill bolla?', btn: 'Boka ett samtal' },
      {
        t: 'foot',
        cols: [
          { h: 'Byrån', rows: ['Om oss', 'Medarbetare', 'Lediga tjänster'] },
          { h: 'Kontakt', rows: ['Sverige', '070 790 48 76', 'Viktor.vantage@gmail.com'] },
          { h: 'Juridiskt', rows: ['Allmänna villkor', 'Integritetspolicy'] },
        ],
      },
    ],
  },
  {
    id: 'shop',
    namn: 'E-handel',
    bransch: 'Exempel på en e-handel',
    adress: 'vantagedesignstudio.se/exempel/e-handel',
    bg: '#faf6f0',
    ink: '#2b211a',
    dim: '#7a6a5c',
    accent: '#b4552a',
    rubrik: SANS,
    block: [
      { t: 'nav', links: ['Butik', 'Serier', 'Verkstaden', 'Kurser'], cta: 'Varukorg (2)' },
      {
        t: 'hero',
        title: 'Drejat för hand i Höganäs.',
        lead: 'Stengods för vardagsbruk, bränt i vedugn. Små serier, inga två lika. Fri frakt över 800 kr.',
        cta: 'Handla serien Sten',
        art: 'lera',
      },
      {
        t: 'varor',
        head: 'Nyheter i butiken',
        items: [
          { n: 'Skål Sten, stor', pris: '640 kr' },
          { n: 'Mugg Vide, 2-pack', pris: '480 kr' },
          { n: 'Tallrik Mo, 22 cm', pris: '395 kr' },
          { n: 'Kanna Hav', pris: '1 250 kr' },
          { n: 'Fat Lera, avlångt', pris: '890 kr' },
          { n: 'Vas Torp, hög', pris: '1 480 kr' },
        ],
      },
      { t: 'cta', title: 'Kurs i drejning, lördagar i mars.', btn: 'Se lediga platser' },
      {
        t: 'foot',
        cols: [
          { h: 'Handla', rows: ['Alla varor', 'Presentkort', 'Leverans och retur'] },
          { h: 'Verkstaden', rows: ['Om oss', 'Kurser', 'Besök oss'] },
          { h: 'Kundtjänst', rows: ['Kontakt', 'Vanliga frågor', 'Köpvillkor'] },
        ],
      },
    ],
  },
  {
    id: 'booking',
    namn: 'Bokning',
    bransch: 'Exempel på en bokningssajt',
    adress: 'vantagedesignstudio.se/exempel/bokning',
    bg: '#f2f7f5',
    ink: '#14231f',
    dim: '#557067',
    accent: '#1d7a5f',
    rubrik: SANS,
    block: [
      { t: 'nav', links: ['Behandlingar', 'Priser', 'Vårt team', 'Hitta hit'], cta: 'Boka tid' },
      {
        t: 'hero',
        title: 'Boka fysioterapi utan att ringa.',
        lead: 'Legitimerade fysioterapeuter i Uppsala. Se lediga tider direkt och boka på under en minut — ingen remiss behövs.',
        cta: 'Se lediga tider',
        art: 'ljus',
      },
      {
        t: 'kalender',
        head: 'Lediga tider den här veckan',
        lead: 'Välj behandling, terapeut och tid. Du får bekräftelse direkt och en påminnelse dagen innan.',
      },
      {
        t: 'cols',
        head: 'Vanliga besök',
        items: [
          { h: 'Nybesök, 45 min', p: 'Genomgång, undersökning och en plan att ta med hem. 895 kr.' },
          { h: 'Återbesök, 30 min', p: 'Uppföljning och justering av programmet. 695 kr.' },
          { h: 'Idrottsskada', p: 'Bedömning och rehabplan med återgång till träning. 995 kr.' },
        ],
      },
      {
        t: 'foot',
        cols: [
          { h: 'Kliniken', rows: ['Om oss', 'Vårt team', 'Lediga tjänster'] },
          { h: 'Besök', rows: ['Sverige', 'Vardagar 08–18', '070 790 48 76'] },
          { h: 'Bra att veta', rows: ['Priser', 'Avbokning', 'Frikort'] },
        ],
      },
    ],
  },
  {
    id: 'portfolio',
    namn: 'Portfölj',
    bransch: 'Exempel på en portfölj',
    adress: 'vantagedesignstudio.se/exempel/portfolj',
    bg: '#0d0d0e',
    ink: '#f2f0ec',
    dim: '#8b8985',
    accent: '#e8dcc4',
    mork: true,
    rubrik: SANS,
    block: [
      { t: 'nav', links: ['Arbeten', 'Serier', 'Om', 'Kontakt'], cta: 'Förfrågan' },
      {
        t: 'hero',
        title: 'Porträtt och reportage.',
        lead: 'Fotograf i Göteborg. Arbetar med tidningar, förlag och verksamheter som vill visa människorna bakom.',
        cta: 'Se utvalda arbeten',
        art: 'rutor',
      },
      { t: 'galleri', head: 'Utvalt 2024–2026', n: 8 },
      { t: 'cta', title: 'Har du ett uppdrag på gång?', btn: 'Skriv till mig' },
      {
        t: 'foot',
        cols: [
          { h: 'Arbeten', rows: ['Porträtt', 'Reportage', 'Förlag'] },
          { h: 'Kontakt', rows: ['Viktor.vantage@gmail.com', '070 790 48 76'] },
          { h: 'Följ', rows: ['Instagram', 'Nyhetsbrev'] },
        ],
      },
    ],
  },
  {
    id: 'campaign',
    namn: 'Kampanj och lansering',
    bransch: 'Exempel på en kampanjsida',
    adress: 'vantagedesignstudio.se/exempel/kampanj',
    bg: '#111318',
    ink: '#f4f5f7',
    dim: '#8d939e',
    accent: '#ff5d2e',
    mork: true,
    rubrik: SANS,
    block: [
      { t: 'nav', links: ['Programmet', 'Talare', 'Plats'], cta: 'Köp biljett' },
      {
        t: 'hero',
        title: 'Två dagar om hur svensk industri ställer om.',
        lead: '12–13 februari, Norra Latin i Stockholm. Fyrtio talare, sexhundra platser, och inga paneldebatter.',
        cta: 'Säkra din plats — 3 950 kr',
        art: 'stapel',
      },
      {
        t: 'cols',
        head: 'Tre spår',
        items: [
          { h: 'Energi', p: 'Vad omställningen faktiskt kostar, och vem som betalar den.' },
          { h: 'Produktion', p: 'Automation som gick att räkna hem, och den som inte gjorde det.' },
          { h: 'Kompetens', p: 'Var ingenjörerna finns, och vad som får dem att stanna.' },
        ],
      },
      { t: 'cta', title: 'Tidiga biljetter tar slut 15 december.', btn: 'Köp biljett' },
      {
        t: 'foot',
        cols: [
          { h: 'Evenemanget', rows: ['Programmet', 'Talare', 'Plats och tider'] },
          { h: 'Biljetter', rows: ['Priser', 'Gruppbokning', 'Villkor'] },
          { h: 'Kontakt', rows: ['Viktor.vantage@gmail.com', '070 790 48 76'] },
        ],
      },
    ],
  },
  {
    id: 'portal',
    namn: 'Portal',
    bransch: 'Exempel på en kundportal',
    adress: 'vantagedesignstudio.se/exempel/portal',
    bg: '#f4f6f9',
    ink: '#131a24',
    dim: '#5d6b7d',
    accent: '#2b5fd9',
    rubrik: SANS,
    block: [
      { t: 'nav', links: ['Översikt', 'Sändningar', 'Fakturor', 'Inställningar'], cta: 'A. Lund' },
      {
        t: 'hero',
        title: 'Allt om era sändningar, på ett ställe.',
        lead: 'Följ leveranser i realtid, hämta fraktsedlar och se fakturor. Inloggat och kopplat till ert affärssystem.',
        cta: 'Öppna översikten',
        art: 'graf',
      },
      {
        t: 'panel',
        head: 'Pågående sändningar',
        rows: [
          ['SE-88401-2', 'Göteborg → Malmö', 'I transit'],
          ['SE-88402-9', 'Örebro → Sundsvall', 'Utlastad'],
          ['SE-88403-1', 'Jönköping → Umeå', 'Försenad'],
          ['SE-88404-7', 'Helsingborg → Gävle', 'Levererad'],
          ['SE-88405-3', 'Borås → Luleå', 'Bokad'],
        ],
      },
      {
        t: 'cols',
        head: 'Det här ingår',
        items: [
          { h: 'Realtid', p: 'Positioner och avvikelser direkt från åkeriet, utan att någon ringer.' },
          { h: 'Fakturaunderlag', p: 'Hämta som PDF eller SIE, uppdelat per kostnadsställe.' },
          { h: 'Behörigheter', p: 'Ni styr själva vem som ser vad, per lager och per bolag.' },
        ],
      },
      {
        t: 'foot',
        cols: [
          { h: 'Portalen', rows: ['Kom igång', 'Driftinformation', 'API'] },
          { h: 'Support', rows: ['Kontakt', 'Vanliga frågor', '070 790 48 76'] },
          { h: 'Frakthuset', rows: ['Om oss', 'Hållbarhet', 'Villkor'] },
        ],
      },
    ],
  },
]
