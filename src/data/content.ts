/**
 * All text på sidan bor här.
 *
 * Studion talar i vi-form, till läsaren som ni. Inga namn på enskilda
 * personer, och inga påståenden om uppdrag som inte finns.
 */

export const STUDIO = {
  name: 'Vantage Design Studio',
  founded: 2026,
  email: 'Viktor.vantage@gmail.com',
  /** Skrivet för läsbarhet; tel-länken rensar bort mellanslagen. */
  phone: '070 790 48 76',
  location: 'Sverige',
} as const

export type Offering = {
  /** Vad slags webbplats det är. */
  name: string
  /** Vilka den brukar vara till för. */
  kind: string
  /** Vad kunden får ut av den. */
  desc: string
  /** Vilken skiss som ritas på kortet — se OfferingArt. */
  sketch: 'site' | 'shop' | 'booking' | 'portfolio' | 'campaign' | 'portal'
  /** Foto under `public/`. Saknas filen ritas skissen i stället. */
  image: string
  seed: number
  palette: [string, string, string]
}

/**
 * Bredden på det vi bygger.
 *
 * Listan finns för att svara på en enda fråga: bygger ni sådant som jag
 * behöver? Den ska därför täcka spannet snarare än visa upp smakprov, och
 * ingen post är knuten till en bransch — samma sorts sajt byggs åt en
 * advokatbyrå som åt ett bageri.
 *
 * Dämpade paletter med precis så mycket temperaturskillnad att korten går
 * att skilja åt — aldrig mer.
 */
export const OFFERINGS: Offering[] = [
  {
    name: 'Företagswebbplats',
    sketch: 'site',
    kind: 'Alla branscher',
    desc: 'Sidan som förklarar vad ni gör, för vem, och varför valet ska falla på er.',
    image: 'images/work-01.jpg',
    seed: 11,
    palette: ['#8d97a5', '#565e6a', '#131519'],
  },
  {
    name: 'E-handel',
    sketch: 'shop',
    kind: 'Butik och produkt',
    desc: 'Från produktsida till genomförd kassa, byggt för att sälja utan att stå i vägen.',
    image: 'images/work-02.jpg',
    seed: 27,
    palette: ['#cabfad', '#7d7263', '#191613'],
  },
  {
    name: 'Bokning och tjänster',
    sketch: 'booking',
    kind: 'Tjänsteföretag',
    desc: 'Era kunder ska kunna boka, beställa eller höra av sig utan att först behöva ringa.',
    image: 'images/work-03.jpg',
    seed: 43,
    palette: ['#bcbab5', '#68665f', '#141415'],
  },
  {
    name: 'Portfölj och galleri',
    sketch: 'portfolio',
    kind: 'Kreativa verksamheter',
    desc: 'Arbetet i centrum, i en inramning som lyfter det i stället för att konkurrera.',
    image: 'images/work-04.jpg',
    seed: 58,
    palette: ['#a89579', '#655a49', '#161310'],
  },
  {
    name: 'Kampanj och lansering',
    sketch: 'campaign',
    kind: 'Enskild sida',
    desc: 'En sida med ett enda syfte, snabbt uppe och mätt från första dagen.',
    image: 'images/work-05.jpg',
    seed: 71,
    palette: ['#a39aa8', '#635d6b', '#141216'],
  },
  {
    name: 'Portal och inloggat',
    sketch: 'portal',
    kind: 'Kunder och medlemmar',
    desc: 'Konton, inloggning och det som ska finnas innanför — kopplat till era system.',
    image: 'images/work-06.jpg',
    seed: 89,
    palette: ['#9db0b4', '#5e6d70', '#101415'],
  },
]

export const SERVICES = [
  {
    name: 'Webbdesign',
    desc: 'Ett gränssnitt som gör det ni erbjuder lätt att förstå — och lätt att säga ja till.',
  },
  {
    name: 'Utveckling',
    desc: 'Handskriven kod som laddar snabbt, fungerar överallt och går att bygga vidare på.',
  },
  {
    name: 'Identitet',
    desc: 'Logotyp, typografi och färg som hänger ihop, så att ni känns igen var ni än syns.',
  },
  {
    name: 'Rörelse',
    desc: 'Animation som vägleder i stället för att ta uppmärksamhet från det ni vill säga.',
  },
  {
    name: 'Prestanda',
    desc: 'Laddtid, tillgänglighet och sökbarhet — det som avgör om någon stannar kvar.',
  },
  {
    name: 'Förvaltning',
    desc: 'Vi finns kvar efter lansering och fortsätter mäta och justera så länge ni vill.',
  },
]

export const PROCESS = [
  {
    title: 'Kartläggning',
    body: 'Vi börjar med att förstå er verksamhet, era kunder och vad som faktiskt ska hända när någon hittar hit. Vi gissar inte åt er.',
  },
  {
    title: 'Riktning',
    body: 'Ett tydligt förslag på form och innehåll, med tidplan och pris. Ni vet vart vi är på väg innan vi bygger något — och kan ändra er medan det är enkelt.',
  },
  {
    title: 'Design',
    body: 'Vi ritar varje vy i detalj, för dator, surfplatta och mobil. Ni ser allt och tycker till innan en rad kod skrivs.',
  },
  {
    title: 'Bygge',
    body: 'Handkodat, komponent för komponent, testat i riktiga webbläsare på riktiga enheter. Tillgänglighet är med från början, inte tillagt sist.',
  },
  {
    title: 'Lansering',
    body: 'Vi flyttar upp, mäter och justerar, och lämnar över koden till er. Sedan finns vi kvar för det som behöver ses om när verkligheten möter planen.',
  },
]

export const STATS = [
  { value: '2026', label: 'Året studion grundades. Vi är nya, tar få uppdrag och ger dem hela vår uppmärksamhet.' },
  { value: '0', label: 'Mallar. Er webbplats byggs för er verksamhet, inte anpassad från någon annans.' },
  { value: '100%', label: 'Av koden blir er egen. Inga licenser att förnya och ingen som sitter på nycklarna.' },
  { value: '1:1', label: 'Ni pratar alltid direkt med dem som utför arbetet.' },
]

/**
 * Det stora påståendet. Det ska handla om besökarens verklighet, inte om
 * studions smak — den som läser är ute efter vad hen får ut av arbetet.
 */
export const MANIFEST = [
  'De', 'flesta', 'som', 'hittar', 'till', 'er',
  'bestämmer', 'sig', 'på', 'några', 'sekunder.',
  'Vårt', 'arbete', 'går', 'ut', 'på',
  'att', 'de', 'sekunderna', 'räcker.',
]

/**
 * Vad besökaren avgör under de där sekunderna.
 *
 * Står påståendet ensamt är det en formulering; med de tre frågorna bredvid
 * blir det ett resonemang, och läsaren kan pröva sin egen sajt mot det.
 */
export const MANIFEST_ASIDE = {
  lead: 'Tre frågor besvaras, medvetet eller inte:',
  points: [
    'Vad är det ni gör?',
    'Är det till för mig?',
    'Är det värt att höra av sig?',
  ],
}

/**
 * Varför arbetet görs som det görs.
 *
 * Tre skäl, formulerade som löften till den som ska anlita oss — inte som
 * en beskrivning av hur vi tycker om att jobba.
 */
export const WHY = [
  {
    title: 'Att bli förstådd är det svåraste',
    body: 'De flesta verksamheter är bättre än vad deras webbplats visar. Vi börjar därför med att förstå vad ni gör och vem ni gör det för, och låter formen följa av det — inte tvärtom.',
  },
  {
    title: 'Ni ska aldrig behöva gissa',
    body: 'Ni ser riktningen innan vi bygger, och vet vad varje steg kostar i tid och pengar. Vill ni ändra er gör ni det medan det fortfarande är enkelt och billigt.',
  },
  {
    title: 'Det ska hålla efter lansering',
    body: 'Ni får koden och äger den. Vi bygger utan låsningar till oss, och finns kvar för det som behöver ses om när sajten mött sina första riktiga besökare.',
  },
]

