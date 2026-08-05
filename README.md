# Vantage Design Studio

Webbplats för Vantage Design Studio — designstudio för webbplatser, grundad 2026 av
Viktor Lindqvist.

Sidans idé: besökaren möter ett fotografi av ett skrivbord, lätt oskarpt. När
man scrollar åker kameran framåt in i bildskärmen på fotot — och innanför
skärmen ligger själva webbplatsen. Längst ner backar kameran ut igen och lämnar
kvar kontaktuppgifterna på skrivbordet.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

## Driftsättning på Vercel

Projektet är en vanlig Vite-sajt utan server. `vercel.json` sätter byggkommando,
utdatakatalog och cache-huvuden, så Vercel behöver ingen extra konfiguration.

| Inställning | Värde |
| --- | --- |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

**Root Directory** beror på var koden ligger:

- Eget repo med sajten i roten → lämna tomt.
- Sajten som en mapp i ett större repo → sätt till `vantage-studio`, och slå på
  *Include files outside the root directory* endast om det behövs (det gör det
  inte här).

Ligger projektet i ett repo tillsammans med annat bör du också sätta en
*Ignored Build Step* i Vercel, annars byggs sajten om vid varje push som inte
rör den:

```bash
git diff --quiet HEAD^ HEAD -- .
```

## Filmen

Hela sidan ligger på ett enda klipp i `public/clips/`. Kameran åker in i
bildskärmen, ut i rummet, förbi fönstret, hyllan och lampan, och slutar vid
skrivbordet. Klippet spelas aldrig av sig självt — scrollen sätter
uppspelningspunkten, så kameran rör sig exakt så långt och så fort som man drar.

Skärmen i klippet är **magenta**. Den färgen nycklas bort i `KeyedVideo`, och
bakom den ligger den riktiga webbplatsen. När kameran åkt hela vägen in och
magentan fyller rutan är det alltså sidan man ser, i full skärpa.

### Byta klipp

1. Rendera ett klipp där skärmen är en jämn, mättad magenta.
2. Lägg originalet i `clips-raw/` och kör `node scripts/prepare-clip.mjs`.
3. Läs av tiderna i klippet och skriv in dem i `src/data/film.ts`: när
   magentan fyller rutan (`enter`), och vilka sekunder varje plats i rummet
   upptar (`SHOTS`).

Omkodningen gör varje bildruta till en nyckelbildruta. En vanlig MP4 har en
nyckelbildruta ungefär varannan sekund och webbläsaren kan bara hoppa till en
sådan — därför hackar scrubbning av vanliga filer. Klippet levereras i två
format eftersom Chromium utan patentbelagda kodekar inte spelar H.264 och
Safari inte spelar VP9.

## Så fungerar kameran

Hela dramaturgin styrs av **ett enda värde**: `window.scrollY`. Sidan har ingen
egen scrollbar — `.viewport` ligger stilla och en tom, hög `.scroll-spacer` ger
sidan sin höjd.

Scrollen delas i tre akter (`src/App.tsx`):

| Skede | Sträcka | Vad som händer |
| --- | --- | --- |
| 1 | till `enter` i klippet | Kameran åker in mot skärmen |
| 2 | innehållets höjd | Klippet står stilla medan sidan rullar |
| 3 | resten av klippet | Kameran fortsätter genom rummet |

Utan pausen i mitten skulle kameran åka vidare medan man läser.

**Skrivbordet** (`src/lib/scene.ts`) är ett enda plan — fotografiet. Kameran
åker rakt fram mot skärmen i bilden, vilket motsvarar att skala fotot kring
skärmens mittpunkt med `(P − z) / (P − z − zc)` när kameran flyttat sig `zc`
framåt. Formeln i stället för en rak `scale(1 → 7)` gör att rörelsen
accelererar som en riktig framåtåkning: långsamt på håll, snabbt de sista
metrarna. Fotot täcker alltid fönstret, så slutskalan blir densamma oavsett
fönsterformat.

Samtidigt tonas en kraftigare oskarp kopia av fotot in — skärpedjupet minskar
när kameran närmar sig, som en riktig kamera som ställer om fokus från rummet
till skärmen. Att korstona två färdiga bilder är mycket billigare än att
animera `filter: blur()`.

**Skärmens innehåll** (`src/components/ScreenContent.tsx`) ritas i fönstrets
fulla storlek och skalas ned med `1 / kameraskalan`. När kameran nått hela vägen
in tar de två skalorna ut varandra och sidan ligger i exakt 1:1 — texten är då
lika skarp som på vilken vanlig sida som helst, inte uppförstorad.

## Prestanda

Inget renderas om i React per bildruta. Komponenter prenumererar på
bildruteloopen med `useFrame` (`src/lib/hooks.ts`) och skriver direkt till
`element.style` — React ritar bara om vid faktiska tillståndsbyten, som när vi
kliver in i skärmen. Bara `transform` och `opacity` animeras.

Eftersom innehållet inuti skärmen rullas med `transform` fungerar varken
`position: sticky` eller `IntersectionObserver` därinne. Sektionerna räknar i
stället ut sin egen position via `useTrack` (`src/lib/track.ts`).

## Minskad rörelse

Med `prefers-reduced-motion: reduce` sätts akt 1 och 3 till noll. Sidan startar
då direkt inne i skärmen och beter sig som en helt vanlig webbplats — ingen
kamerarörelse, ingen parallax, och kontakten ligger som en vanlig sektion sist.

## Innan sidan går live

Följande är platshållare och behöver bytas ut (allt ligger i
`src/data/content.ts`):

- **Arbetena** är sex *konceptarbeten* som visar formspråket, inte riktiga
  uppdrag. De är märkta "Urval — konceptarbeten" i gränssnittet. Byt ut dem mot
  riktiga case när de finns.
- **E-post** (`hej@vantagestudio.se`) och **telefonnummer** är påhittade.
- **Plats** står som "Sverige" — smalna av till ort om du vill.
- Lägg till en riktig OG-bild och `og:url` i `index.html` inför delning.

## Filer

```
src/
  App.tsx                  akterna, sidans höjd, kamerans förflyttning
  lib/
    scroll.ts              bildruteloop, utjämnad scroll, härledda värden
    scene.ts               kamerans matematik
    track.ts               sektionernas egen position inuti skärmen
    hooks.ts               useFrame, mätning, minskad rörelse
  data/
    scene-photo.ts         bakgrundsfotot och skärmytans inpassning
    content.ts             all text, projekt och tjänster
  components/
    Stage.tsx              kamerakontext och kamerans förlopp
    Scene.tsx              skrivbordsfotot och skärmytan
    ScreenContent.tsx      sidan som ligger på bildskärmen
    inner/                 sektionerna inuti skärmen
  styles/                  tokens, bas, scen, skärm, gränssnitt
```
