import { Footer } from '@/components/ui'
import { modelConfigured } from '@/lib/ai'

export const metadata = {
  title: "What's real and what's mocked — Handover",
}

type Row = { thing: string; state: 'real' | 'mock' | 'partial'; note: string }

const ROWS: Row[] = [
  {
    thing: 'The problem',
    state: 'real',
    note: 'Sub-registrar, BBMP, BESCOM and BWSSB genuinely hold no shared key for a property. A buyer genuinely files four separate applications. Nothing about the premise is invented.',
  },
  {
    thing: 'BBMP e-Aasthi auto-mutation',
    state: 'real',
    note: 'BBMP has moved khata mutation to an eKYC-based flow that auto-approves undisputed cases. That leg is already solved and we do not claim credit for it.',
  },
  {
    thing: 'The gap we built into',
    state: 'real',
    note: 'BESCOM and BWSSB name transfers remain separate manual applications with their own indemnity bonds. The e-Khata application already collects a BESCOM connection number and does nothing with it.',
  },
  {
    thing: 'Karnataka Sakala Services Act 2011',
    state: 'real',
    note: 'The Act, the 15-digit GSC number, the guaranteed timeframes and the ₹20/day compensation capped at ₹500 recovered from the defaulting officer are all real. Roughly 1,250 services are notified.',
  },
  {
    thing: 'Which services are Sakala-notified',
    state: 'partial',
    note: 'Khata transfer and electricity name change are notified and we show clocks on them. We could not verify a notified BWSSB name-transfer timeframe, so that track carries no statutory countdown. We would rather show a gap than invent a guarantee.',
  },
  {
    thing: 'Ward and zone names',
    state: 'real',
    note: 'BBMP ward and zone names are public administrative facts. Using fake ones would have made the interface less legible, not more honest.',
  },
  {
    thing: 'Every property in the app',
    state: 'mock',
    note: 'Three seeded fixtures. Addresses, buildings and owners are invented. No real property, no real owner, no real transaction.',
  },
  {
    thing: 'ePIDs, SAS numbers, RR numbers, document numbers',
    state: 'mock',
    note: 'Shaped like the real ones so field lengths and formats in the UI are honest, but every one is prefixed MOCK and none was ever issued.',
  },
  {
    thing: 'GSC acknowledgement numbers',
    state: 'mock',
    note: 'Derived deterministically from the ticket id so they stay stable across reloads. Not issued by Sakala.',
  },
  {
    thing: 'Outstanding amounts and arrears',
    state: 'mock',
    note: 'Invented. Chosen to be plausible: the ₹4,180 water arrear is the kind of number that actually surfaces at a counter after registration.',
  },
  {
    thing: 'The ward map, pipes and feeders',
    state: 'mock',
    note: 'Every coordinate, diameter, laid-year and condition rating is invented. It is a schematic drawn from a small graph in lib/dept.ts, not survey geometry, and it is not the shape of Padmanabhanagar. No tile provider is contacted.',
  },
  {
    thing: 'Works, tenders and costs',
    state: 'mock',
    note: 'Invented work orders, tender references and figures in lakh. Shaped to be plausible; none corresponds to a real BWSSB or BESCOM work.',
  },
  {
    thing: 'Assessment gap counts',
    state: 'partial',
    note: 'The numbers are invented. The mechanism is real: a utility connection at an address with no matching tax assessment is a genuine signal, and no system currently joins those two rolls because there is no shared key to join them on.',
  },
  {
    thing: 'Department APIs',
    state: 'mock',
    note: 'There are none. No request leaves this app to BBMP, BESCOM, BWSSB or Sakala. The hackathon brief prohibits real integrations, and we would not have had access anyway.',
  },
  {
    thing: 'Consent and eKYC',
    state: 'mock',
    note: 'A checkbox. No Aadhaar, no PAN, no OTP, no DigiLocker, no identity document is collected or verified anywhere in this app — not in the UI, not in the fixtures, not in test data.',
  },
  {
    thing: 'Payments',
    state: 'mock',
    note: 'The "pay and unblock" button changes a flag on your device. No payment instrument is collected and no payment is processed.',
  },
  {
    thing: 'Document upload',
    state: 'mock',
    note: 'The indemnity bond checkbox uploads nothing. There is no file input and no storage.',
  },
  {
    thing: 'Filing a Sakala appeal',
    state: 'mock',
    note: 'The appeal text is genuinely generated from your ticket. Sending it is not implemented.',
  },
  {
    thing: 'Login',
    state: 'mock',
    note: 'There is none, deliberately. Three seeded properties, a two-step lookup, no accounts and no session on our side.',
  },
]

export default function Transparency() {
  const live = modelConfigured()

  return (
    <div className="stack stack-6">
      <section className="stack stack-3">
        <div className="eyebrow">Full disclosure</div>
        <h1 className="display-lg">
          What&rsquo;s real and
          <br />
          what&rsquo;s mocked
        </h1>
        <p className="ink2">
          Every invented value in this app carries a small dotted underline and
          a dot. This page is the complete list behind that marker.
        </p>
      </section>

      <section className="stack stack-3">
        {ROWS.map((r) => (
          <div key={r.thing} className="card card-pad stack stack-2">
            <div className="row-between">
              <h2 className="h3">{r.thing}</h2>
              <span
                className={`pill pill-${r.state === 'real' ? 'done' : r.state === 'mock' ? 'block' : 'idle'}`}
              >
                {r.state === 'real' ? 'Real' : r.state === 'mock' ? 'Mocked' : 'Partly real'}
              </span>
            </div>
            <p className="small ink2">{r.note}</p>
          </div>
        ))}
      </section>

      <section id="forward" className="stack stack-4">
        <h2 className="display">Three things we refused to build</h2>

        <div className="card card-pad stack stack-2">
          <h3 className="h3">1. A central registry</h3>
          <p className="small ink2">
            Nothing is stored on our servers. The citizen initiates, consents
            once, and the app fans out per session — the Account Aggregator and
            DigiLocker pattern. Ticket state and consent live in your
            browser&rsquo;s local storage, written by{' '}
            <code className="mono">lib/ledger.ts</code>. A single table of who
            owns what would be a more valuable target than anything it enables.
          </p>
        </div>

        <div className="card card-pad stack stack-2">
          <h3 className="h3">2. A reverse index</h3>
          <p className="small ink2">
            Verification runs one way only: property → identity, check for a
            match. There is no method anywhere in the adapter interface that
            takes a person and returns their properties, and there is no screen
            that could call one. A person-to-assets index is the 360-degree
            profiling structure the 2018 Aadhaar judgment warned about, and it
            would not survive DPDP purpose limitation.
          </p>
          <p className="small ink2">
            This is why the lookup has two steps. Step one returns only the
            address and ward — what you can read off the gate. Holder names,
            account references and arrears need a second fact you could only
            have if you hold the document.
          </p>
        </div>

        <div id="dept" className="card card-pad stack stack-2">
          <h3 className="h3">2b. A department view that cannot name anyone</h3>
          <p className="small ink2">
            Adding a department screen is where the forward-verification rule
            usually quietly dies, so it is worth being precise about what we
            did. The ward view is keyed on infrastructure — pipes, feeders,
            stretches of road — not on people. It carries no owner name, no
            property list, and no filter that would produce one.
          </p>
          <p className="small ink2">
            Assessment gaps are the sharp case. &ldquo;A connection with no
            matching tax assessment&rdquo; is genuinely useful to a revenue
            department and genuinely dangerous as a list. We report it as a
            count on a named stretch — enough to send a surveyor down that road,
            not enough to hand anyone a list of households. The rows do not
            expand, there is no export, and there is no endpoint behind them
            that returns one. Finding the specific property stays the
            department&rsquo;s job, through its own due process and its own
            accountability for doing it.
          </p>
        </div>

        <div className="card card-pad stack stack-2">
          <h3 className="h3">3. Bearer semantics</h3>
          <p className="small ink2">
            The property object is not a token. Holding it does not mean owning
            the flat. Disputed transfers route to a human officer, exactly the
            way BBMP&rsquo;s auto-mutation already does. Property law is built
            on reversibility, and adjudication is where the value is — a bearer
            instrument would remove the escape hatch that makes the whole system
            work.
          </p>
        </div>
      </section>

      <section className="stack stack-4">
        <h2 className="display">Where the model does work</h2>
        <p className="ink2 small">
          Two places, and nowhere else. Navigation, search, layout and every
          state transition in this app are deterministic code.
        </p>
        <div className="card card-pad stack stack-2">
          <h3 className="h3">Grievance triage</h3>
          <p className="small ink2">
            Free text in Kannada, Hinglish or English resolved to a department
            and a category. This is the &ldquo;you never have to know which
            department owns your problem&rdquo; promise, and it is genuinely
            hard without a model.
          </p>
        </div>
        <div className="card card-pad stack stack-2">
          <h3 className="h3">Blocker explanation</h3>
          <p className="small ink2">
            A departmental rejection reason rewritten as one sentence of plain
            language and one concrete next action.
          </p>
        </div>
        <div className="notice">
          <strong className="small">
            {live
              ? 'A model key is configured on this deployment.'
              : 'No model key is configured on this deployment.'}
          </strong>{' '}
          <span className="small">
            Either way the app works end to end. If the key is absent, the call
            fails, or it takes longer than seven seconds, a keyword classifier
            answers instead and the interface says so on screen rather than
            hiding it. A civic tool that goes down because an inference endpoint
            is slow is not a civic tool.
          </span>
        </div>
      </section>

      <section className="stack stack-3">
        <h2 className="display">Attribution</h2>
        <p className="small ink2">
          Independent hackathon prototype. Not affiliated with, endorsed by, or
          connected to BBMP, BESCOM, BWSSB, the Sakala Mission, the Government
          of Karnataka, or any of their systems. No government logo, seal,
          emblem or wordmark is used anywhere in this build. Department names
          appear descriptively, to say which real-world counter a track
          corresponds to.
        </p>
      </section>

      <Footer />
    </div>
  )
}
