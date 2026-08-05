/**
 * All text på sidan bor här.
 *
 * OBS: Arbetsexemplen nedan är konceptarbeten som visar upp studions
 * formspråk — de presenteras som just koncept i gränssnittet. Byt ut dem mot
 * riktiga uppdrag när de finns.
 *
 * Studion talar i vi-form. Inga namn på enskilda personer.
 */

export const STUDIO = {
  name: 'Vantage Design Studio',
  founded: 2026,
  email: 'Viktor.vantage@gmail.com',
  /** Skrivet för läsbarhet; tel-länken rensar bort mellanslagen. */
  phone: '070 790 48 76',
  location: 'Sverige',
} as const

export type Project = {
  name: string
  sector: string
  year: string
  tags: string
  /** Foto under `public/`. Saknas filen ritas grafiken i ProjectMedia i stället. */
  image: string
  seed: number
  palette: [string, string, string]
}

/* Dämpade paletter med precis så mycket temperaturskillnad att korten går
   att skilja åt — aldrig mer. */
export const PROJECTS: Project[] = [
  {
    name: 'Nordvik Kapital',
    sector: 'Fintech',
    year: '2026',
    tags: 'Webbplats · Designsystem',
    image: 'images/work-01.jpg',
    seed: 11,
    palette: ['#8d97a5', '#565e6a', '#131519'],
  },
  {
    name: 'Ateljé Söder',
    sector: 'Mode',
    year: '2026',
    tags: 'Identitet · E-handel',
    image: 'images/work-02.jpg',
    seed: 27,
    palette: ['#cabfad', '#7d7263', '#191613'],
  },
  {
    name: 'Form & Betong',
    sector: 'Arkitektur',
    year: '2026',
    tags: 'Portfölj · Art direction',
    image: 'images/work-03.jpg',
    seed: 43,
    palette: ['#bcbab5', '#68665f', '#141415'],
  },
  {
    name: 'Bruk Kaffe',
    sector: 'Varumärke',
    year: '2026',
    tags: 'Förpackning · Webb',
    image: 'images/work-04.jpg',
    seed: 58,
    palette: ['#a89579', '#655a49', '#161310'],
  },
  {
    name: 'Puls Festival',
    sector: 'Kultur',
    year: '2026',
    tags: 'Kampanj · Rörelse',
    image: 'images/work-05.jpg',
    seed: 71,
    palette: ['#a39aa8', '#635d6b', '#141216'],
  },
  {
    name: 'Helix AI',
    sector: 'Teknik',
    year: '2026',
    tags: 'Produktsajt · Motion',
    image: 'images/work-06.jpg',
    seed: 89,
    palette: ['#9db0b4', '#5e6d70', '#101415'],
  },
]

export const SERVICES = [
  {
    name: 'Webbdesign',
    desc: 'Art direction och gränssnitt som bär ett varumärke hela vägen — från första skiss till sista pixel.',
  },
  {
    name: 'Utveckling',
    desc: 'Handskriven kod. Snabba, tillgängliga sajter utan tunga ramverk och utan mallar.',
  },
  {
    name: 'Identitet',
    desc: 'Logotyp, typografi, färg och ton. Ett system som håller ihop i alla kanaler.',
  },
  {
    name: 'Rörelse',
    desc: 'Animation med dramaturgi. Rörelse som förklarar, förstärker och får folk att stanna kvar.',
  },
  {
    name: 'Prestanda',
    desc: 'Laddtider, Core Web Vitals och teknisk SEO. Snyggt räcker inte om ingen hinner se det.',
  },
  {
    name: 'Förvaltning',
    desc: 'Vi lämnar dig inte vid lansering. Löpande vidareutveckling, mätning och finslipning.',
  },
]

export const PROCESS = [
  {
    title: 'Kartläggning',
    body: 'Vi börjar med att förstå affären, målgruppen och vad som faktiskt ska hända när någon landar på sajten. Inga antaganden.',
  },
  {
    title: 'Riktning',
    body: 'Ett tydligt designkoncept med moodboards, typografi och färg. Du vet exakt vart vi är på väg innan vi bygger något.',
  },
  {
    title: 'Design',
    body: 'Vi ritar varje vy i detalj — desktop, surfplatta och mobil. Rörelsen designas samtidigt som formen, aldrig efteråt.',
  },
  {
    title: 'Bygge',
    body: 'Handkodat, komponent för komponent. Testat i riktiga webbläsare på riktiga enheter, med tillgänglighet från start.',
  },
  {
    title: 'Lansering',
    body: 'Vi flyttar upp, mäter, justerar och lämnar över. Sedan fortsätter vi förbättra så länge du vill ha oss kvar.',
  },
]

export const STATS = [
  { value: '2026', label: 'Året studion grundades — vi är nya, hungriga och väljer uppdrag med omsorg.' },
  { value: '0', label: 'Mallar. Varje sajt ritas och kodas från ett tomt ark.' },
  { value: '100%', label: 'Handskriven kod. Inga sidbyggare, ingen plugin-soppa.' },
  { value: '1:1', label: 'Du pratar alltid direkt med dem som gör jobbet.' },
]

export const MANIFEST = [
  'Vi', 'ritar', 'och', 'kodar', 'webbplatser', 'med',
  'lugn', 'form,', 'tydlig', 'riktning', 'och', 'rörelse',
  'som', 'betyder', 'något.',
]

export const MARQUEE_WORDS = [
  'Webbdesign', 'Identitet', 'Rörelse', 'Utveckling', 'Art direction', 'Prestanda',
]
