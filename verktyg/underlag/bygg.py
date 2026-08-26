"""
UNDERLAGET SOM SKICKAS TILL KUNDER
══════════════════════════════════
Bygger `Vantage-Design-Studio.pdf`: tre A4-sidor med vad studion gör, vad
det kostar och hur ett uppdrag går till. Den bifogas i kundmejl.

VARFÖR DEN LIGGER I REPOT
Skriptet låg först i en tillfällig mapp och försvann två gånger när
maskinen startade om. Priser och villkor står dessutom på två ställen — här
och i `src/data/` — och de måste alltid säga samma sak. Ligger de i samma
repo syns det i historiken när bara det ena ändrats.

KÖRS SÅ HÄR
    python3 verktyg/underlag/bygg.py        # skriver HTML bredvid sig själv
    node    verktyg/underlag/rendera.mjs    # HTML -> PDF, städar metadata

Typsnitten bäddas in ur `public/fonts/`, samma Geist som sajten. Ingen
hämtning över nätet, alltså inget som kan fallera vid renderingen.
"""
import base64
import pathlib

HÄR = pathlib.Path(__file__).resolve().parent
ROT = HÄR.parents[1]

sans = base64.b64encode((ROT / 'public/fonts/geist-latin.woff2').read_bytes()).decode()

HTML = """<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>Vantage Design Studio</title>
<style>
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 100 900;
  src: url(data:font/woff2;base64,SANS) format('woff2');
}

@page { size: A4; margin: 19mm 18mm 20mm; }

:root {
  --black: #16191f;
  --dampad: #5f5c55;
  --brons: #8a6c39;
  --linje: #ccc5b6;
  --harfin: #e3ddd0;
  --botten: #f6f3ec;
}

* { box-sizing: border-box; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  font-family: 'Geist', system-ui, sans-serif;
  font-size: 9.9pt;
  line-height: 1.47;
  color: var(--black);
  background: #fff;
}

h1, h2, h3 { margin: 0; text-wrap: balance; }

/* En rubrik som blir ensam kvar sist på en sida är det tydligaste tecknet
   på att ingen sett dokumentet innan det skickades. */
h3 { font-size: 10.3pt; font-weight: 620; margin-bottom: 0.15em; break-after: avoid; }
.hall-ihop { break-inside: avoid; }

p { margin: 0 0 0.55em; max-width: 60em; }
p:last-child { margin-bottom: 0; }

.topp { display: flex; justify-content: space-between; align-items: flex-end; gap: 12mm; }

.namn { font-size: 20pt; font-weight: 620; letter-spacing: -0.021em; line-height: 1.05; }

.toppkontakt {
  text-align: right;
  font-size: 8.3pt;
  line-height: 1.62;
  color: var(--dampad);
  white-space: nowrap;
}

/* Meandern, samma band som löper runt rutan på sajten. */
.rand { height: 9px; margin: 4mm 0 5.5mm; color: var(--brons); opacity: 0.62; }
.rand svg { display: block; width: 100%; height: 9px; }

.ingress { font-size: 11pt; line-height: 1.45; max-width: 42em; }

section { margin-top: 5.4mm; }

h2 {
  font-size: 12.2pt;
  font-weight: 620;
  letter-spacing: -0.011em;
  padding-bottom: 1.6mm;
  border-bottom: 1px solid var(--linje);
  margin-bottom: 2.9mm;
}

/* Siffran bär hela prisavsnittet och sätts därför en gång, stort. Att
   upprepa den i en kolumn på varje rad hade sett ut som en tabell som
   gått sönder — kolumnrubriken "Från" säger ingenting när alla värden är
   lika. */
.anslag { font-size: 14.5pt; font-weight: 620; letter-spacing: -0.014em; margin-bottom: 0.35em; }

.led { columns: 2; column-gap: 9mm; }
.led > div { break-inside: avoid; margin-bottom: 2mm; }
.led b { font-weight: 620; }
.led span { display: block; color: var(--dampad); font-size: 9.5pt; line-height: 1.45; }

table { width: 100%; border-collapse: collapse; }

th {
  text-align: left;
  font-size: 8.3pt;
  font-weight: 600;
  letter-spacing: 0.055em;
  text-transform: uppercase;
  color: var(--brons);
  padding: 0 0 1.6mm;
  border-bottom: 1px solid var(--linje);
}

th.h { text-align: right; }

td { padding: 1.8mm 0; border-bottom: 1px solid var(--harfin); vertical-align: top; }
tr:last-child td { border-bottom: 0; }

td.vad { padding-right: 8mm; }
td.vad b { font-weight: 620; }
td.vad span { display: block; color: var(--dampad); font-size: 9.4pt; line-height: 1.42; }

td.kr {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 560;
  padding-left: 4mm;
}

.villkor { margin-top: 2.8mm; font-size: 9.3pt; color: var(--dampad); line-height: 1.5; }

.steg > div { padding: 1.8mm 0; border-bottom: 1px solid var(--harfin); break-inside: avoid; }
.steg > div:last-child { border-bottom: 0; }
.steg p { font-size: 9.6pt; color: var(--dampad); line-height: 1.46; margin: 0; }

.levererar { margin-top: 0.9mm; font-size: 8.9pt; color: var(--brons); }

.exempel { columns: 2; column-gap: 9mm; margin-bottom: 3.2mm; }
.exempel > div { break-inside: avoid; margin-bottom: 2mm; }
.exempel b { font-weight: 620; }
.exempel span { display: block; color: var(--dampad); font-size: 9.4pt; line-height: 1.42; }

.not { font-size: 9.2pt; color: var(--dampad); line-height: 1.48; }

.fragor > div { padding: 1.8mm 0; border-bottom: 1px solid var(--harfin); break-inside: avoid; }
.fragor > div:last-child { border-bottom: 0; }
.fragor p { font-size: 9.6pt; color: var(--dampad); line-height: 1.46; margin: 0; }

.slut { margin-top: 6mm; padding: 5mm 5.5mm; background: var(--botten); break-inside: avoid; }
.slut h2 { border: 0; padding: 0; margin-bottom: 2.2mm; font-size: 13pt; }
.slut p { font-size: 10pt; }

.adresser {
  margin-top: 3.4mm;
  padding-top: 3.2mm;
  border-top: 1px solid var(--linje);
  font-size: 9.6pt;
  line-height: 1.75;
}

.adresser b { font-weight: 620; }
</style>
</head>
<body>

<div class="topp">
  <div class="namn">Vantage Design Studio</div>
  <div class="toppkontakt">
    Viktor och Arvid<br>
    070 790 48 76<br>
    viktor.vantage@gmail.com
  </div>
</div>

<div class="rand">
  <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 640 9">
    <defs>
      <pattern id="m" width="32" height="9" patternUnits="userSpaceOnUse">
        <path d="M0 7H2.4V2H27V7H24.5V4H8v2h11M27 7H32" fill="none" stroke="currentColor" stroke-width="1.2"/>
      </pattern>
    </defs>
    <rect width="640" height="9" fill="url(#m)"/>
  </svg>
</div>

<p class="ingress">Vi är två personer som bygger webbplatser och system åt mindre företag. Ingen mall i botten, ingen plattform ni hyr. Allt ritas och kodas för er verksamhet, och ni pratar hela vägen med oss som gör jobbet.</p>

<section>
  <h2>Vad vi gör</h2>
  <p>De flesta som driver något litet får välja mellan två saker. Antingen en mallsajt som ser ut som alla andras, eller en byrå som kostar som en anställd. Vi ligger däremellan.</p>
  <p>Vi bygger företagswebbplatser, e-handel, portföljer och kampanjsidor. Vi bygger också system: bokning med tider, bekräftelser och avbokning, inloggade portaler, register och sådant som annars sköts i ett kalkylark. Oftast hänger systemet ihop med sajten, men det behöver det inte. Har ni redan en webbplats bygger vi bara systemet.</p>
  <p>Arbetet ser likadant ut oavsett storlek. En advokatbyrå och ett bageri ska inte få samma sajt med olika logotyp, vilket är precis vad en mall ger.</p>

  <div class="led" style="margin-top:2.8mm">
    <div><b>Webbdesign</b><span>Ett gränssnitt som gör det ni erbjuder lätt att förstå.</span></div>
    <div><b>Utveckling</b><span>Handskriven kod som laddar snabbt och går att bygga vidare på.</span></div>
    <div><b>Identitet</b><span>Logotyp, typografi och färg som hänger ihop.</span></div>
    <div><b>System och verktyg</b><span>Bokning, inloggning, register och det interna.</span></div>
    <div><b>Prestanda och tillgänglighet</b><span>Laddtid och sökbarhet, det som avgör om någon stannar kvar.</span></div>
    <div><b>Drift och förvaltning</b><span>Sajten kan ligga hos oss och skötas så länge ni vill.</span></div>
  </div>
</section>

<section>
  <h2>Priser</h2>

  <p class="anslag">Allt vi bygger börjar på 5 000 kr.</p>
  <p>Priset justeras utifrån omfattning. Efter ett första samtal får ni ett fast pris för hela arbetet, uppdelat per steg, så att ni ser vad varje del kostar innan ni tackar ja.</p>

  <div class="led" style="margin-top:3mm">
    <div><b>Kampanj- och lanseringssida</b><span>En sida med ett enda syfte, snabbt uppe och mätt från första dagen.</span></div>
    <div><b>Företagswebbplats</b><span>Sidan som förklarar vad ni gör, för vem och varför valet ska falla på er.</span></div>
    <div><b>Portfölj och galleri</b><span>Arbetet i centrum, i en inramning som lyfter det.</span></div>
    <div><b>Bokningssystem</b><span>Tider, bekräftelser och avbokning som fungerar på riktigt.</span></div>
    <div><b>E-handel</b><span>Från produktsida till genomförd kassa, byggt för att sälja.</span></div>
    <div><b>Portal och inloggat</b><span>Konton, inloggning och det som ska finnas innanför.</span></div>
  </div>

  <div class="hall-ihop">
  <h3 style="margin-top:5mm">Tillägg</h3>
  <table>
    <thead>
      <tr><th>Utöver uppdraget</th><th class="h">Från</th></tr>
    </thead>
    <tbody>
      <tr><td class="vad"><b>Ytterligare vy</b><span>Utöver det som ingår i uppdraget.</span></td><td class="kr">1 200 kr</td></tr>
      <tr><td class="vad"><b>Språkversion</b><span>Hela sajten på ytterligare ett språk.</span></td><td class="kr">2 900 kr</td></tr>
      <tr><td class="vad"><b>Texter och innehåll</b><span>Vi skriver, eller redigerar det ni redan har.</span></td><td class="kr">2 400 kr</td></tr>
      <tr><td class="vad"><b>Logotyp och identitet</b><span>Logotyp, typografi och färg.</span></td><td class="kr">3 900 kr</td></tr>
      <tr><td class="vad"><b>Drift och förvaltning</b><span>Sajten på vår server, med övervakning, uppdateringar, löpande underhåll och mindre ändringar. Tillval, inte villkor.</span></td><td class="kr">319 kr/mån</td></tr>
    </tbody>
  </table>
  </div>

  <p class="villkor"><b>Betalning.</b> Femton procent när arbetet inleds, resten först när sajten är levererad och godkänd. Ingen delfakturering däremellan. Vi bär alltså kostnaden för nästan hela uppdraget själva, och det är meningen: ni ska inte betala för något ni ännu inte sett fungera.</p>
  <p class="villkor"><b>Äganderätt.</b> Koden och samtliga konton lämnas över till er vid lansering. Inga licenser att förnya, inga nycklar kvar hos oss. Byter ni leverantör längre fram behöver ingenting byggas om.</p>
</section>

<section>
  <h2>Så går det till</h2>

  <div class="steg" style="margin-top:2.6mm">
    <div>
      <h3>Kartläggning</h3>
      <p>Vi börjar med att förstå er verksamhet, era kunder och vad som faktiskt ska hända när någon hittar hit. Vi gissar inte åt er.</p>
      <div class="levererar">Ni får ett kort underlag om vad sajten ska göra och för vem. Ett till två samtal.</div>
    </div>
    <div>
      <h3>Riktning</h3>
      <p>Ett förslag på form och innehåll, med tidplan och pris. Ni vet vart vi är på väg innan vi bygger något, och kan ändra er medan det är enkelt.</p>
      <div class="levererar">Ni får ett förslag med form, omfattning, tidplan och fast pris. Cirka en vecka.</div>
    </div>
    <div>
      <h3>Design</h3>
      <p>Vi ritar varje vy i detalj, för dator, surfplatta och mobil. Ni ser allt och tycker till innan en rad kod skrivs.</p>
      <div class="levererar">Ni får färdiga vyer för dator, surfplatta och mobil. Ett par veckor.</div>
    </div>
    <div>
      <h3>Bygge</h3>
      <p>Handkodat, komponent för komponent, testat i riktiga webbläsare på riktiga enheter. Tillgänglighet är med från början, inte tillagt sist när det är dyrt.</p>
      <div class="levererar">Ni får en adress att klicka runt i medan arbetet pågår. Två till fyra veckor.</div>
    </div>
    <div>
      <h3>Lansering</h3>
      <p>Vi flyttar upp, mäter och justerar, och lämnar över koden. Sedan finns vi kvar för det som behöver ses om när verkligheten möter planen.</p>
      <div class="levererar">Ni får sajten uppe, koden överlämnad och mätningen på plats. En dag, och tiden efter.</div>
    </div>
  </div>

  <p class="villkor">En mindre webbplats tar oftast tre till fem veckor från start till lansering. En större tar längre. Ni får datum i samband med förslaget.</p>
</section>

<section>
  <h2>Exempel att titta på</h2>
  <p>På vår webbplats ligger sex kompletta exempelsidor, en för varje sorts uppdrag vi tar. De har riktig typografi, riktig layout och saker som går att klicka på. Var och en har sin egen färgvärld och sitt eget typsnitt, eftersom formen ska följa uppgiften.</p>

  <div class="exempel" style="margin-top:3mm">
    <div><b>Företagswebbplats</b><span>Startsida, tjänster, om oss och kontakt.</span></div>
    <div><b>E-handel</b><span>Produktrutnät, varukorg och kassa.</span></div>
    <div><b>Bokning</b><span>Kalender med lediga tider och bekräftelse.</span></div>
    <div><b>Portfölj</b><span>Galleri som går att öppna och bläddra i.</span></div>
    <div><b>Kampanj</b><span>En sida med ett enda syfte.</span></div>
    <div><b>Portal</b><span>Inloggat läge med översikt och status.</span></div>
  </div>

  <p class="not">Exemplen är byggda av oss. Studion är ny och har inga kunduppdrag att visa, och vi visar hellre något vi gjort själva än någon annans arbete. Namn, priser och innehåll i exemplen är påhittade.</p>
</section>

<section>
  <h2>Vanliga frågor</h2>
  <div class="fragor">
    <div>
      <h3>Kan ni ta över en sajt som redan finns?</h3>
      <p>Ofta ja. Vi ser över det som finns och säger rakt ut om det är klokare att bygga vidare eller börja om. Även när svaret är att ni klarar er utan oss ett tag till.</p>
    </div>
    <div>
      <h3>Vad händer efter lansering?</h3>
      <p>Vi finns kvar. Små ändringar, mätning av hur sajten faktiskt används, och justeringar utifrån det. Ni väljer om ni vill ha en löpande överenskommelse eller bara höra av er när något dyker upp.</p>
    </div>
  </div>
</section>

<div class="slut">
  <h2>Ett samtal kostar ingenting</h2>
  <p>Berätta kort vad ni håller på med, så säger vi vad vi tror krävs och vad det landar på. Tycker vi att ni klarar er utan oss säger vi det också.</p>
  <div class="adresser">
    <b>Viktor</b> &nbsp; viktor.vantage@gmail.com &nbsp;&nbsp;·&nbsp;&nbsp; 070 790 48 76<br>
    <b>Arvid</b> &nbsp; arvid.vantage@gmail.com
  </div>
</div>

</body>
</html>
"""

ut = HÄR / 'underlag.html'
ut.write_text(HTML.replace('SANS', sans), encoding='utf-8')
print(f'skrev {ut} ({round(len(HTML) / 1024)} kB)')
