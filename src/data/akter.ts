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
 *
 * INGA RÄKNEORD I RUBRIKERNA
 * "Fyra saker avgör" och "fem steg" fick läsaren att börja räkna i stället
 * för att läsa, och siffran var i båda fallen det minst intressanta i
 * meningen. Punkterna räknar sig ändå själva när man ser dem. Detsamma
 * gäller aktnamnen: de säger nu vad avsnittet handlar om och inte var i
 * ordningen det står.
 */

export type Panel = {
  rubrik: string
  brod?: string
  punkter?: { titel: string; text: string }[]
  kort?: { namn: string; slag: string; om: string; exempel?: string }[]
  tal?: { varde: string; text: string }[]
  fragor?: { q: string; a: string }[]
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
  paneler: Panel[]
}

export const AKTER: Akt[] = [
  {
    id: 'forst',
    namn: 'Studion',
    paneler: [
      {
        rubrik: 'De flesta bestämmer sig på några sekunder',
        brod: 'Vårt arbete går ut på att de sekunderna räcker. Vi ritar och utvecklar webbplatser och system åt små och medelstora verksamheter — varje projekt från tomt blad, utan mall i botten och utan plattform att hyra.',
      },
      {
        rubrik: 'Det här avgör om en webbplats gör nytta',
        brod: 'Inget av punkterna handlar om smak, och samtliga går att ta ställning till innan en rad kod skrivs.',
        punkter: WHY.map((w) => ({ titel: w.title, text: w.body })),
      },
    ],
  },
  {
    id: 'hantverket',
    namn: 'Vad vi bygger',
    paneler: [
      {
        rubrik: 'Webbplatser för alla slags verksamheter',
        brod: 'Uppdragen skiljer sig i omfattning, inte i utförande — samma arbetssätt gäller för en enskild kampanjsida som för en e-handel med tusentals artiklar. Behöver ni något som inte står här utvecklar vi det också.',
        kort: OFFERINGS.map((o) => ({
          namn: o.name,
          slag: o.kind,
          om: o.desc,
          exempel: o.sketch,
        })),
      },
      {
        rubrik: 'Systemen bakom webbplatsen',
        brod: 'Bokning med tider, bekräftelser och avbokning. Inloggade portaler, register och de interna verktyg som annars sköts i ett kalkylark. Oftast hänger de ihop med webbplatsen, men det är inget krav — vi utvecklar systemet lika gärna när sajten redan finns.',
      },
    ],
  },
  {
    id: 'riktningen',
    namn: 'Arbetsgången',
    paneler: [
      {
        rubrik: 'Från första samtalet till lansering',
        brod: 'Varje steg lämnar ifrån sig något ni kan hålla i handen och ha åsikter om. Ett steg utan leverans är svårt att veta när det är färdigt.',
        punkter: PROCESS.map((p) => ({ titel: p.title, text: `${p.body} Ni får: ${p.gives} Tid: ${p.takes.toLowerCase()}.` })),
      },
      {
        rubrik: 'Betalningen följer resultatet',
        brod: 'Femton procent i depositionsavgift när arbetet inleds, resterande belopp först när webbplatsen är levererad och godkänd. Ingen delfakturering däremellan. Vi bär alltså kostnaden för nästan hela uppdraget själva, och det är avsikten: ni ska inte betala för något ni ännu inte sett fungera.',
      },
    ],
  },
  {
    id: 'bygget',
    namn: 'Bygget',
    paneler: [
      {
        rubrik: 'Utvecklat komponent för komponent',
        brod: 'Handskriven kod, prövad i riktiga webbläsare på riktiga enheter. Tillgänglighet och laddtid är krav från första komponenten, inte något som åtgärdas sist när det är dyrt. Under hela byggtiden har ni en löpande adress där ni kan följa arbetet.',
      },
      {
        rubrik: 'Ni äger det färdiga arbetet',
        brod: 'Källkoden och samtliga konton överlämnas till er vid lansering. Inga licenser att förnya, inga nycklar kvar hos oss. Väljer ni en annan leverantör längre fram sker bytet utan att något behöver byggas om.',
      },
      {
        rubrik: 'Drift och förvaltning som tillval',
        brod: 'För 319 kr i månaden ligger webbplatsen på vår egen server, med övervakning, uppdateringar, löpande underhåll och de mindre ändringar som dyker upp längs vägen. Ett tillval och inte ett villkor — koden är er oavsett.',
      },
    ],
  },
  {
    id: 'sedan',
    namn: 'Efter lansering',
    paneler: [
      {
        rubrik: 'Det här kan ni räkna med',
        tal: STATS.map((s) => ({ varde: s.value, text: s.label })),
      },
      {
        rubrik: 'Vanliga frågor',
        fragor: FAQ,
      },
      {
        rubrik: 'Ska vi bygga något tillsammans?',
        brod: STUDIO.why,
        knappar: STUDIO.emails.map((e) => ({ text: `Skriv till ${e}`, href: `mailto:${e}` })),
      },
    ],
  },
]
