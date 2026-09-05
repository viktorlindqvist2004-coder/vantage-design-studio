import { Cursor, Grain, Nav, Rail } from './components/Chrome'
import { Verk } from './components/Verk'
import { useSteg } from './lib/steg'

/**
 * SIDAN
 * ═════
 * Sidan är ett enda verk: en film som ligger fast i rutan hela vägen, med
 * upplysningarna rullande vid dess sida. Det finns inga partier att bläddra
 * mellan och ingen vanlig sida under filmen — det var precis det som gjorde
 * den förra versionen till en vanlig sida som råkade ha film i sig.
 *
 * Allt innehåll bor i data/akter.ts och delas i fem akter som följer
 * tagningarna. Bilden och texten hör ihop: man ser hantverket medan man
 * läser om vad vi bygger, ritningen medan man läser om priset.
 */

export default function App() {
  useSteg()

  return (
    <>
      <a className="skip-link" href="#forst">Hoppa till innehållet</a>
      <Rail />
      <Nav />
      <main>
        <Verk />
      </main>
      <Grain />
      <Cursor />
    </>
  )
}
