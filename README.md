# Handover

One property object. Every department.

A prototype for **Build What Moves India**. Independent hackathon build — not
affiliated with or endorsed by BBMP, BESCOM, BWSSB, the Sakala Mission or the
Government of Karnataka. All data is mocked and labelled as such in the UI.

---

## The idea in one paragraph

You buy a flat. One real-world event, four systems that cannot tell they are
talking about the same property: the sub-registrar knows it by document number,
BBMP by ePID, BESCOM by one RR number, BWSSB by a different one. There is no
shared key, so the citizen becomes the join — four applications, four document
uploads, four queues, and arrears discovered one at a time, usually too late.
BBMP has already fixed the khata leg via e-Aasthi eKYC auto-mutation. The
utility legs did not move. That gap is what this builds into.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required. The app is fully usable with none.

## Optional: the model path

Two features use a language model — grievance triage and blocker explanation.
Set **one** of these and restart:

```bash
OPENAI_API_KEY=...      # optionally OPENAI_MODEL, defaults to gpt-5
ANTHROPIC_API_KEY=...   # optionally ANTHROPIC_MODEL, defaults to claude-opus-5
```

If no key is set, the key is rejected, the call fails, or it takes longer than
seven seconds, a deterministic keyword classifier answers instead **and the UI
says so on screen**. This is not a stub — it is the intended behaviour. A civic
tool that goes down because an inference endpoint is slow is not a civic tool.

`/transparency` reports which path is live on the running deployment.

## Deploy

```bash
npx vercel            # or connect the repo in the Vercel dashboard
```

Nothing to configure. No database, no auth provider, no secrets required. The
app holds no server-side state — see below.

---

## How it is put together

```
lib/types.ts             The property object and its bindings. No personId, anywhere.
lib/adapters/types.ts    ServiceAdapter — the seam. Six methods, none of them reverse.
lib/adapters/registry.ts BBMP, BESCOM, BWSSB. Adding a fourth is one file plus one line.
lib/adapters/vehicle.declared.ts   Declared, not built. The extensibility proof.
lib/sakala.ts            Working-day arithmetic, GSC numbers, s.5 compensation.
lib/ledger.ts            Where state lives: the citizen's device, not our server.
lib/ai.ts                Two model calls, and the fallback that makes them optional.
lib/fixtures.ts          Three seeded properties. Everything in here is invented.
lib/dept.ts              The ward: network graph, works, clusters, coverage gaps.
```

### Three design constraints

**Pull, not push.** Nothing is stored centrally. The citizen initiates, consents
once, the app fans out per session. Ticket state and consent are written to
`localStorage` by `lib/ledger.ts`. There is no table anywhere that says which
person is connected to which property.

**Forward verification only.** Property → identity, check for a match. Never
identity → list of properties. There is no such method on `ServiceAdapter` and
no screen that could call one. This is also why the lookup has two steps: step
one returns address and ward (what you can read off the gate); holder names,
account references and arrears require a second fact you would only have if you
hold the document.

**Revocable, not bearer.** The object is not a token. Holding it does not mean
owning the flat. Disputed transfers route to a human officer, the way BBMP's
auto-mutation already does. Property law is built on reversibility.

### The department view

`/dept` is keyed on infrastructure rather than on a property: pipes, feeders,
stretches of road, and the works that touch them. It exists to make the
adoption argument concrete rather than asserted.

Two things it produces that no department can get today:

**Complaints against the works programme.** The map marks complaint clusters
and rings the ones no current or tendered work touches. In the seeded ward that
is exactly one — a 1987 sewer trunk rated critical, with nine open complaints,
four of them reopened, falling to the kere, and absent from the capex list.
The complaint system and the works programme are separate systems that have
never been asked the same question, so this can happen without anyone doing
anything wrong.

**Assessment gaps.** A live utility connection at an address with no matching
property tax assessment is, on the face of it, a missing assessment. Nobody
builds this today because it needs a join between a connection list and an
assessment roll, and there is no shared key to join them on. Keying on the
property produces it as a side effect.

The map is an inline SVG drawn from a small graph, not a tile layer. A tile
provider would be an external service receiving our ward queries, which cuts
against the premise; and a 40 KB SVG loads where a tile layer does not.

**What it deliberately cannot do.** No owner name appears anywhere on the
screen. There is no property list and no filter that would produce one.
Assessment gaps are reported as counts on a named stretch — enough to send a
surveyor down that road, not enough to hand anyone a list of households. The
rows do not expand, there is no export, and no endpoint behind them returns
one. "Show me who has power but has not paid tax" is a name-and-shame query,
and the structure that answers it answers far worse questions too.

### The Sakala lever

Under the Karnataka Sakala Services Act 2011, a notified service application
gets a 15-digit GSC number and a guaranteed timeframe in working days. On
default, s.5 entitles the applicant to ₹20/day up to ₹500, recovered from the
responsible officer's salary. Almost nobody claims it, because claiming requires
knowing the entitlement exists, knowing the GSC number, knowing the appellate
authority, and writing the appeal. The app holds all four, so it writes it.

Honest scope note, repeated in the UI: Sakala covers *notified* services. Khata
transfer and electricity name change are notified and carry clocks here. We
could not verify a notified BWSSB name-transfer timeframe, so that track shows
no statutory countdown rather than an invented one.

### Reviewer notes

- **No login.** Three seeded properties, listed on the home page with the
  numbers needed to open them.
- **Move the clock.** The handover screen has a reviewer control that pushes the
  date forward so you can watch a guarantee lapse and the compensation claim
  appear, without waiting seven working days. It shifts the *reading* of now;
  stored timestamps are never rewritten, so the arithmetic on screen is the same
  arithmetic that would run in production.
- **The dotted underline + dot** on any value means it is mocked.
  `/transparency` is the complete list.

## Routes

| Route | What it is |
|---|---|
| `/` | Find your property — two-step lookup |
| `/property/[epid]` | The object: one card, three bindings |
| `/property/[epid]/handover` | Consent, then three parallel tracks with live Sakala clocks |
| `/property/[epid]/handover/claim` | Pre-filled s.5 compensation appeal |
| `/property/[epid]/grievance` | Append-only threads keyed on the property |
| `/dept` | Department view: ward map, works, assessment gaps |
| `/transparency` | What's real and what's mocked |

## What is deliberately not here

Deposits, escrow, rental agreements. Real API integrations (prohibited by the
brief, and unavailable anyway). Any city but Bengaluru. Auth beyond no-auth.
Admin panels — reviewers test the citizen experience.
