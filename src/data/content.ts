/**
 * All text på sidan bor här.
 *
 * Studion talar i vi-form, till läsaren som ni. Inga namn på enskilda
 * personer, och inga påståenden om uppdrag som inte finns.
 */

export const STUDIO = {
  name: 'Vantage Design Studio',
  /**
   * Båda adresserna gäller lika mycket, och skrivs därför lika stort.
   * Ingen av dem är huvudadress — den som hör av sig ska inte behöva
   * gissa vem av oss man helst vänder sig till.
   */
  emails: ['viktor.vantage@gmail.com', 'arvid.vantage@gmail.com'],
  /** Skrivet för läsbarhet; tel-länken rensar bort mellanslagen. */
  phone: '070 790 48 76',
  /**
   * Varför studion finns, och inte när den startade eller var den ligger.
   *
   * Ett årtal och ett landsnamn säger ingenting till den som funderar på
   * att höra av sig. Ett skäl gör det: det placerar studion i förhållande
   * till de två alternativ läsaren redan känner till, och säger vad hen
   * får som hen inte får där.
   */
  why: 'De flesta som driver något litet får välja mellan en mall som ser '
    + 'ut som alla andras och en byrå som kostar som en anställd. Vi '
    + 'startade studion för att det ska finnas något däremellan: handkodat '
    + 'för just er verksamhet, till ett pris ni får veta innan vi börjar, '
    + 'och utan någon emellan er och den som bygger.',
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
  /**
   * Foto under `public/`, om det finns ett.
   *
   * Korten visar sorters webbplats, inte utförda uppdrag, och ritningen är
   * det ärligaste vi kan visa tills det finns riktiga skärmbilder att sätta
   * dit. Utan fältet görs ingen hämtning alls — ett foto som saknas är en
   * misslyckad hämtning på varje besök och en skiss som byter plats efteråt.
   */
  image?: string
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
    seed: 11,
    palette: ['#8d97a5', '#565e6a', '#131519'],
  },
  {
    name: 'E-handel',
    sketch: 'shop',
    kind: 'Butik och produkt',
    desc: 'Från produktsida till genomförd kassa, byggt för att sälja utan att stå i vägen.',
    seed: 27,
    palette: ['#cabfad', '#7d7263', '#191613'],
  },
  {
    name: 'Bokningssystem',
    sketch: 'booking',
    kind: 'Tjänster och tider',
    desc: 'Tider, bekräftelser och avbokning som fungerar på riktigt — inte ett formulär som skickar ett mejl.',
    seed: 43,
    palette: ['#bcbab5', '#68665f', '#141415'],
  },
  {
    name: 'Portfölj och galleri',
    sketch: 'portfolio',
    kind: 'Kreativa verksamheter',
    desc: 'Arbetet i centrum, i en inramning som lyfter det i stället för att konkurrera.',
    seed: 58,
    palette: ['#a89579', '#655a49', '#161310'],
  },
  {
    name: 'Kampanj och lansering',
    sketch: 'campaign',
    kind: 'Enskild sida',
    desc: 'En sida med ett enda syfte, snabbt uppe och mätt från första dagen.',
    seed: 71,
    palette: ['#a39aa8', '#635d6b', '#141216'],
  },
  {
    name: 'Portal och inloggat',
    sketch: 'portal',
    kind: 'Kunder och medlemmar',
    desc: 'Konton, inloggning och det som ska finnas innanför — kopplat till era system.',
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
    name: 'System och verktyg',
    desc: 'Bokning, inloggning, register och det interna som annars sköts i ett kalkylark.',
  },
  {
    name: 'Prestanda',
    desc: 'Laddtid, tillgänglighet och sökbarhet — det som avgör om någon stannar kvar.',
  },
  {
    name: 'Drift och förvaltning',
    desc: 'Sajten kan ligga hos oss och hållas uppdaterad, mätt och justerad så länge ni vill.',
  },
]

/**
 * Stegen i arbetet.
 *
 * `gives` är vad ni håller i handen när steget är klart. Ett steg utan
 * något att lämna över är svårt att veta när det är färdigt — och lika
 * svårt att ha åsikter om.
 */
export const PROCESS = [
  {
    title: 'Kartläggning',
    body: 'Vi börjar med att förstå er verksamhet, era kunder och vad som faktiskt ska hända när någon hittar hit. Vi gissar inte åt er.',
    gives: 'Ett kort underlag om vad sajten ska göra, och för vem.',
    takes: 'Ett till två samtal',
  },
  {
    title: 'Riktning',
    body: 'Ett tydligt förslag på form och innehåll, med tidplan och pris. Ni vet vart vi är på väg innan vi bygger något — och kan ändra er medan det är enkelt.',
    gives: 'Ett förslag med form, omfattning, tidplan och fast pris.',
    takes: 'Cirka en vecka',
  },
  {
    title: 'Design',
    body: 'Vi ritar varje vy i detalj, för dator, surfplatta och mobil. Ni ser allt och tycker till innan en rad kod skrivs.',
    gives: 'Färdiga vyer för dator, surfplatta och mobil.',
    takes: 'Ett par veckor',
  },
  {
    title: 'Bygge',
    body: 'Handkodat, komponent för komponent, testat i riktiga webbläsare på riktiga enheter. Tillgänglighet är med från början, inte tillagt sist.',
    gives: 'En adress ni kan klicka runt i medan arbetet pågår.',
    takes: 'Två till fyra veckor',
  },
  {
    title: 'Lansering',
    body: 'Vi flyttar upp, mäter och justerar, och lämnar över koden till er. Sedan finns vi kvar för det som behöver ses om när verkligheten möter planen — och vill ni det sköter vi driften på vår egen server.',
    gives: 'Sajten uppe, koden överlämnad och mätningen på plats.',
    takes: 'En dag, och tiden efter',
  },
]

/**
 * VANLIGA FRÅGOR
 * ══════════════
 * De frågor någon faktiskt har innan de hör av sig — pris, tid, vad de
 * själva måste bidra med, och vad som händer sedan. Att svara på dem här
 * kostar ingenting och sparar ett mejl för båda parter.
 *
 * Svaren är hållna i vad vi kan lova utan att veta något om uppdraget.
 * Ett spann är ärligare än en siffra som ändå spricker.
 */
export const FAQ = [
  {
    q: 'Bygger ni bara webbplatser?',
    a: 'Nej. Vi utvecklar också system: bokning med tider, bekräftelser och avbokning, inloggade portaler, register och de interna verktyg som annars sköts i ett kalkylark. Oftast hänger det ihop med sajten, men det måste det inte — vi bygger systemet även när webbplatsen redan finns.',
  },
  {
    q: 'Vad kostar en webbplats?',
    a: 'Det beror på omfattningen, och vi säger ingen siffra innan vi vet vad ni behöver. Efter ett första samtal får ni ett fast pris för hela arbetet, uppdelat per steg, så att ni ser vad varje del kostar innan ni tackar ja.',
  },
  {
    q: 'När betalar vi?',
    a: 'Femton procent när vi sätter i gång, och resten först när sajten är klar och ni är nöjda. Ingen delfakturering på vägen. Det betyder att vi bär arbetet nästan hela sträckan själva, och det är precis meningen: ni ska inte betala för något ni ännu inte sett fungera.',
  },
  {
    q: 'Hur lång tid tar det?',
    a: 'En mindre webbplats tar oftast tre till fem veckor från start till lansering, en större längre. Ni får datum i samband med förslaget, och hör av er från oss i tid om något behöver flyttas.',
  },
  {
    q: 'Vad behöver ni av oss?',
    a: 'Framför allt en timme eller två i början, då ni berättar om verksamheten. Sedan texter och bilder — och saknas de hjälper vi till att ta fram dem. Ni behöver inte kunna något om webb.',
  },
  {
    q: 'Äger vi sajten efteråt?',
    a: 'Ja. Ni får koden och alla konton, utan licenser att förnya och utan att vi sitter på nycklarna. Vill ni byta leverantör längre fram går det utan att bygga om från början.',
  },
  {
    q: 'Kan ni ta över en sajt som redan finns?',
    a: 'Ofta ja. Vi ser över det som finns och säger rakt ut om det är klokare att bygga vidare eller börja om — även när svaret är att ni klarar er utan oss ett tag till.',
  },
  {
    q: 'Vad händer efter lansering?',
    a: 'Vi finns kvar. Små ändringar, mätning av hur sajten faktiskt används, och justeringar utifrån det. Ni väljer om ni vill ha en löpande överenskommelse eller bara höra av er när något dyker upp.',
  },
  {
    q: 'Kan ni sköta driften åt oss?',
    a: 'Ja. För 319 kr i månaden ligger sajten på vår egen server och vi håller den uppe och uppdaterad, med löpande underhåll och de små ändringar som dyker upp. Det är ett tillval och inte ett villkor: koden är er, och vill ni flytta sajten någon annanstans — eller sköta den själva — går det utan att något behöver byggas om.',
  },
]

export const STATS = [
  { value: '15%', label: 'I förskott. Resten betalar ni först när sajten är klar och ni är nöjda.' },
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
/** Ingressen som binder ihop punkterna nedan. */
export const WHY_LEAD =
  'Fyra saker avgör om en webbplats gör nytta. Inget av dem handlar om smak, och alla fyra går att ha åsikter om innan vi bygger något.'

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
    title: 'Snabbt är en del av formen',
    body: 'En sida som laddar långsamt tappar besökare innan de hunnit se något alls. Vi bygger lätt från början i stället för att försöka optimera bort tyngden efteråt.',
  },
  {
    title: 'Det ska hålla efter lansering',
    body: 'Ni får koden och äger den. Vi bygger utan låsningar till oss, och finns kvar för det som behöver ses om när sajten mött sina första riktiga besökare.',
  },
]

/**
 * SAMTALET
 * ════════
 * Det som skiljer ett litet team från en byrå är inte vad som byggs utan
 * vem man pratar med medan det byggs. Den som anlitar oss har samma person
 * mittemot sig hela vägen — det är löftet den här platsen finns för.
 *
 * Punkterna är skrivna som sådant man kan bli besviken på om det inte
 * hålls. Ett löfte som inte går att bryta är inget löfte, bara en trevlig
 * mening.
 */
export const DIALOGUE = {
  lead: 'Ett samtal, hela vägen',
  title: 'Ni har samma människa mittemot er, från första samtalet till lansering.',
  body: 'Inga projektledare emellan, ingen ärendekö, ingen som ska stämma av internt och återkomma. Ni pratar med den som ritar och bygger — och får svar av den som faktiskt vet.',
  points: [
    {
      title: 'Samma personer från start till mål',
      body: 'Den ni pratar med första gången är den ni pratar med sista gången. Ingen överlämning, och inget som går förlorat i den.',
    },
    {
      title: 'Ni ser arbetet medan det växer',
      body: 'Vi visar var vi står under tiden, inte när allt är klart. Det ni tycker till om hinner alltså påverka resultatet.',
    },
    {
      title: 'Ni bestämmer takten',
      body: 'Fast tid varje vecka om ni vill ha det, eller bara när något dyker upp. Hör ni av er mellan gångerna svarar vi ändå.',
    },
  ],
}

