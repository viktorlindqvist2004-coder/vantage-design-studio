import { Cursor, Grain, Nav, Rail } from './components/Chrome'
import {
  Contact, Dialogue, Faq, Hero, Manifest, Offer, Process, Showcase, Stats,
  Ticker, Why,
} from './components/Page'
import { useToneUnderNav } from './lib/motion'
import { useSmooth } from './lib/smooth'

/**
 * SIDAN
 * ═════
 * Ordningen är resonemanget: först påståendet, sedan skälen, sedan vad man
 * kan få, hur det går till, vem man pratar med, och sist hur man hör av
 * sig. Frågorna ligger näst sist, där de flesta invändningar dyker upp.
 *
 * Ljust och mörkt växlar hela vägen ned. Varje parti bär sin ton själv;
 * listen läser av vilken som råkar ligga under den och byter färg i takt.
 */

export default function App() {
  useSmooth()
  useToneUnderNav()

  return (
    <>
      <a className="skip-link" href="#arbetet">Hoppa till innehållet</a>
      <Rail />
      <Nav />

      <main>
        <Hero />
        <Ticker />
        <Manifest />
        <Why />
        <Showcase />
        <Offer />
        <Process />
        <Dialogue />
        <Stats />
        <Faq />
        <Contact />
      </main>

      <Grain />
      <Cursor />
    </>
  )
}
