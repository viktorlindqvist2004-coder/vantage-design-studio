import { FAQ, OFFERINGS, PROCESS, STATS, STUDIO, WHY } from './content'

/**
 * AKTERNA
 * ═══════
 * Allt som förut stod utanför filmen står nu i den, fördelat på fem akter
 * som följer tagningarna. Bilden och texten hör ihop: man ser hantverket
 * medan man läser om vad vi bygger, ritningen medan man läser om priset,
 * pelaren medan man läser om hur det byggs.
 *
 * Ordningen är samma resonemang som förut — påståendet, vad man kan få, hur
 * det går till, hur det byggs, och vad som händer sedan — men det finns
 * inte längre några partier att bläddra mellan. Det är en enda rullning.
 */

export type Panel = {
  rubrik: string
  brod?: string
  punkter?: { titel: string; text: string }[]
  kort?: { namn: string; slag: string; om: string; exempel?: string }[]
  tal?: { varde: string; text: string }[]
  fragor?: { q: string; a: string }[]
  knapp?: { text: string; href: string }
}

export type Akt = {
  id: string
  namn: string
  paneler: Panel[]
}

export const AKTER: Akt[] = [
  {
    id: 'forst',
    namn: 'Först',
    paneler: [
      {
        rubrik: 'De flesta bestämmer sig på några sekunder',
        brod: 'Vårt arbete går ut på att de sekunderna räcker. Vi ritar och bygger webbplatser och system för hand, och ni pratar med dem som utför arbetet hela vägen.',
      },
      {
        rubrik: 'Fyra saker avgör om en webbplats gör nytta',
        brod: 'Inget av dem handlar om smak, och alla fyra går att ha åsikter om innan vi bygger något.',
        punkter: WHY.map((w) => ({ titel: w.title, text: w.body })),
      },
    ],
  },
  {
    id: 'hantverket',
    namn: 'Hantverket',
    paneler: [
      {
        rubrik: 'Vad vi bygger',
        brod: 'Vilken sorts webbplats ni än behöver, och oavsett bransch — plus systemen bakom den. Behöver ni något som inte står här bygger vi det också.',
        kort: OFFERINGS.map((o) => ({
          namn: o.name,
          slag: o.kind,
          om: o.desc,
          exempel: o.sketch,
        })),
      },
      {
        rubrik: 'Vi bygger system, inte bara sidor',
        brod: 'Bokning med tider, bekräftelser och avbokning, inloggade portaler, register och de interna verktyg som annars sköts i ett kalkylark. Oftast hänger det ihop med sajten, men det måste det inte — vi bygger systemet även när webbplatsen redan finns.',
      },
    ],
  },
  {
    id: 'riktningen',
    namn: 'Riktningen',
    paneler: [
      {
        rubrik: 'Fem steg, inget dolt',
        punkter: PROCESS.map((p) => ({ titel: p.title, text: `${p.body} Ni får: ${p.gives} Tid: ${p.takes.toLowerCase()}.` })),
      },
      {
        rubrik: 'Ni betalar när ni är nöjda',
        brod: 'Femton procent när vi sätter i gång, och resten först när sajten är klar och ni är nöjda. Ingen delfakturering på vägen. Det betyder att vi bär arbetet nästan hela sträckan själva, och det är precis meningen: ni ska inte betala för något ni ännu inte sett fungera.',
      },
    ],
  },
  {
    id: 'bygget',
    namn: 'Bygget',
    paneler: [
      {
        rubrik: 'Handkodat, komponent för komponent',
        brod: 'Testat i riktiga webbläsare på riktiga enheter. Tillgänglighet är med från början, inte tillagt sist när det är dyrt. Ni får en adress ni kan klicka runt i medan arbetet pågår.',
      },
      {
        rubrik: 'Sajten blir er',
        brod: 'Ni får koden och alla konton, utan licenser att förnya och utan att vi sitter på nycklarna. Vill ni byta leverantör längre fram går det utan att bygga om från början.',
      },
      {
        rubrik: 'Drift om ni vill',
        brod: 'För 249 kr i månaden ligger sajten på vår egen server och vi håller den uppe och uppdaterad, med löpande underhåll och de små ändringar som dyker upp. Ett tillval och inte ett villkor.',
      },
    ],
  },
  {
    id: 'sedan',
    namn: 'Sedan',
    paneler: [
      {
        rubrik: 'Kort om oss',
        tal: STATS.map((s) => ({ varde: s.value, text: s.label })),
      },
      {
        rubrik: 'Vanliga frågor',
        fragor: FAQ,
      },
      {
        rubrik: 'Ska vi bygga något tillsammans?',
        brod: STUDIO.why,
        knapp: { text: `Skriv till ${STUDIO.emails[0]}`, href: `mailto:${STUDIO.emails[0]}` },
      },
    ],
  },
]
