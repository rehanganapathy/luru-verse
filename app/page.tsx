'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { findProperty, verifyChallenge, type FindState } from './actions'
import { Footer, Mock } from '@/components/ui'

const DEMO_KEYS = [
  { label: 'Clean transfer', epid: 'MOCK-1704-0092-3311', doc: 'JYN-1-04412-2024-25', answer: '4412', note: 'Nothing owing. All four bindings move, and one of them needs no application at all.' },
  { label: 'Arrears left behind', epid: 'MOCK-2210-4471-8802', doc: 'BSK-3-11876-2024-25', answer: '1876', note: 'The previous owner left a water bill, and two months of waste fee.' },
  { label: 'B-Khata + name mismatch', epid: 'MOCK-3390-2255-1140', doc: 'KRP-2-07233-2023-24', answer: '7233', note: 'Meter still in a 2019 owner’s name. Dry waste has not been collected for 11 weeks.' },
]

// The four registers, and what each one calls the same flat. Three lines each,
// because the value on its own does not make the point — you have to be able to
// see which department is holding it.
const FOUR_KEYS = [
  { who: 'Sub-registrar', val: 'JYN-1-04412-2024-25', what: 'Registration document' },
  { who: 'BBMP', val: '2024-25-MOCK-88412', what: 'Property tax ePID' },
  { who: 'BESCOM', val: 'M7-MOCK-441209', what: 'Electricity RR number' },
  { who: 'BWSSB', val: '0084-MOCK-11207', what: 'Water RR number' },
]

// The seeded case, stated on the landing rather than only behind the search —
// the three states this product has to be able to show, and the colour each
// one is allowed to use.
const TRACKS = [
  { name: 'Khata transfer · BBMP', tone: 'run' as const, state: 'Running', figure: '17', unit: 'days left of 30', line: 'On a case worker’s desk at the Jayanagar ARO. Nothing is waiting on you.' },
  { name: 'Electricity account · BESCOM', tone: 'block' as const, state: 'Blocked', figure: '₹18,400', unit: 'in arrears', line: 'Left behind by the previous owner. The transfer cannot move until it is settled, and the screen says whose bill it is.' },
  { name: 'Water connection · BWSSB', tone: 'breach' as const, state: 'Breached', figure: '9', unit: 'days past guarantee', line: 'The deadline passed. This is the only place the interface takes a side.' },
]

export default function Home() {
  const router = useRouter()
  const [state, setState] = useState<FindState>({ step: 'idle' })
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [challengeError, setChallengeError] = useState('')
  const [pending, start] = useTransition()
  const heroRef = useRef<HTMLElement>(null)

  // The header floats transparent on the photograph and has to go back to
  // paper the moment the paper reaches it — white nav on a white sheet is
  // unreadable, and this is the one screen in the product where the chrome
  // sits on an image at all. The flip is a class on <body> because the header
  // lives in the root layout, outside this tree.
  //
  // An observer rather than a scroll handler: the root is shrunk from the top
  // by exactly the header's height, so "the band no longer intersects" is
  // precisely "the band has passed under the header" — no threshold to guess,
  // no work on the scroll thread. The header's height is read from the token
  // so this cannot drift away from the CSS.
  useEffect(() => {
    const band = heroRef.current
    if (!band) return
    const h =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--topbar-h'),
        10,
      ) || 60
    const io = new IntersectionObserver(
      ([entry]) => document.body.classList.toggle('hero-chrome', entry.isIntersecting),
      { rootMargin: `-${h}px 0px 0px 0px`, threshold: 0 },
    )
    io.observe(band)
    return () => {
      io.disconnect()
      document.body.classList.remove('hero-chrome')
    }
  }, [])

  function submitFind(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const fd = new FormData()
      fd.set('query', query)
      setState(await findProperty(state, fd))
    })
  }

  function submitChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (state.step !== 'challenge') return
    start(async () => {
      const res = await verifyChallenge(state.found.epid, answer, state.usedEpid)
      if (res.ok) {
        router.push(`/property/${encodeURIComponent(state.found.epid)}`)
      } else {
        setChallengeError('That does not match. Check the last four digits again.')
      }
    })
  }

  return (
    // No pane-in here: its transform would re-contain the hero's fixed media
    // layer to the page. The entrance animation moves onto the sections.
    <div className="stack flush-top">
      {/* The hero states the problem, over the building where the rules that
          created it were written. Nothing to click here on purpose — this
          screen has one job and it is comprehension. */}
      <section className="hero-shell bleed" ref={heroRef}>
        <div className="hero-media" aria-hidden="true">
          <img
            src="/vidhana-soudha-dither.jpg"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="bleed-inner">
          <div className="hero stack stack-4">
            <div className="eyebrow">
              Bengaluru · Independent prototype · Not a government service
            </div>
            <h1 className="display-lg">
              Four departments hold your flat. None of them can tell it is the
              same flat.
            </h1>
          </div>
        </div>
      </section>

      {/* The only action on this page, in its own band. Step two replaces it in
          place rather than opening somewhere else, so the thing you were doing
          stays where you were doing it. */}
      <section
        id="find"
        className={`find-band bleed pane-in${state.step === 'challenge' ? ' find-band-solo' : ''}`}
      >
        <div className="bleed-inner">
          {state.step !== 'challenge' ? (
            <>
              <p className="lede">
                So you become the shared key, carrying paper from counter to
                counter and proving the same fact four times. Luruverse holds the
                four identifiers together, puts a clock on every request, and
                names the desk it is sitting on.
              </p>
              <div className="stack stack-2">
                <form className="find-form" onSubmit={submitFind}>
                  <div className="field">
                    <label className="eyebrow" htmlFor="query">
                      Document number, or ePID
                    </label>
                    <input
                      id="query"
                      name="query"
                      className="input mono"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder="JYN-1-04412-2024-25"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        if (state.step === 'error') setState({ step: 'idle' })
                      }}
                      aria-describedby={state.step === 'error' ? 'find-error' : undefined}
                    />
                  </div>
                  <button className="btn" type="submit" disabled={pending || !query.trim()}>
                    {pending ? 'Looking up…' : 'Open it'}
                  </button>
                </form>
                {state.step === 'error' ? (
                  <p id="find-error" className="small" style={{ color: 'var(--breach)' }} role="alert">
                    {state.message}
                  </p>
                ) : (
                  <p className="xs muted">
                    One field, because you only ever have one of these to hand.
                    We look in both places.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="stack stack-4">
              <div className="stack stack-2">
                <div className="eyebrow">Step 2 of 2 — confirm it is yours</div>
                <p className="h2">
                  <Mock what="Mock address">{state.found.address}</Mock>
                </p>
                <p className="small muted">
                  <Mock what="Mock ward">{state.found.ward}</Mock>
                </p>
              </div>

              <div className="notice">
                That is all we will show until you answer below. Address and ward
                are on the gate. Who owns it, what they owe and which accounts
                are attached are not, and a document number alone should not buy
                them.
              </div>

              <form className="stack stack-3" onSubmit={submitChallenge}>
                <div className="field">
                  <label className="label" htmlFor="answer">
                    {state.found.challengeLabel}
                  </label>
                  <input
                    id="answer"
                    className="input mono tnum"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    placeholder="0000"
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value)
                      setChallengeError('')
                    }}
                    aria-describedby="answer-hint"
                  />
                  <p id="answer-hint" className="xs muted">
                    {state.found.challengeHint}
                  </p>
                </div>
                {challengeError && (
                  <p className="small" style={{ color: 'var(--breach)' }} role="alert">
                    {challengeError}
                  </p>
                )}
                <button className="btn btn-block" type="submit" disabled={pending || answer.length < 4}>
                  {pending ? 'Checking…' : 'Open the property'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => {
                    setState({ step: 'idle' })
                    setAnswer('')
                    setChallengeError('')
                  }}
                >
                  Search a different number
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Full-bleed and opaque on purpose: the hero photograph is pinned to
          the viewport, so everything after it must paint over it edge to
          edge — a shell-width sheet would let the picture show through the
          gutters. The bleed-inner keeps the content on the shell's measure. */}
      <div className="landing-body bleed pane-in">
        <div className="bleed-inner stack stack-7">
        <section id="problem" className="stack stack-2">
          <div className="section-head">
            <h2 className="display">No two of these can be derived from another</h2>
            <span className="eyebrow">One flat · four keys</span>
          </div>
          <div className="keys-mini">
            {FOUR_KEYS.map((k) => (
              <div className="key-mini" key={k.who}>
                <span>{k.who}</span>
                <span>
                  <Mock what="Mock identifier">{k.val}</Mock>
                </span>
                <span>{k.what}</span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ maxWidth: '72ch' }}>
            There is no shared key, so today you are the shared key. That is the
            whole problem, and it is not a technical one.
          </p>
        </section>

        <section id="tracks" className="stack stack-2">
          <div className="section-head">
            <h2 className="display">Every request gets a clock and a name</h2>
            <span className="eyebrow">Colour means state, only ever</span>
          </div>
          {TRACKS.map((t) => (
            <div className="track-row" key={t.name}>
              <div className="stack stack-2">
                <span className="h3">{t.name}</span>
                <span className={`pill pill-${t.tone}`} style={{ alignSelf: 'flex-start' }}>
                  {t.state}
                </span>
              </div>
              <div className="figure" style={{ color: `var(--${t.tone})` }}>
                <b>
                  <Mock what="Mock figure">{t.figure}</Mock>
                </b>
                <span>{t.unit}</span>
              </div>
              <p className="small ink2" style={{ maxWidth: '48ch' }}>
                {t.line}
              </p>
            </div>
          ))}
          <p className="small muted" style={{ maxWidth: '72ch' }}>
            Nine days past a 21-day guarantee is a compensable delay under
            Sakala. The claim comes pre-filled from the case file — the one
            action in this product that is coloured red.
          </p>
        </section>

        <section id="demo" className="stack stack-2">
          <div className="section-head">
            <h2 className="display">Three seeded properties</h2>
            <span className="eyebrow">No login · all values invented</span>
          </div>
          {DEMO_KEYS.map((d) => (
            <button
              key={d.epid}
              type="button"
              className="demo-row"
              onClick={() => {
                setQuery(d.doc)
                setState({ step: 'idle' })
                document.getElementById('find')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                document.getElementById('query')?.focus({ preventScroll: true })
              }}
            >
              <span className="h3">{d.label}</span>
              <span className="small ink2">{d.note}</span>
              <span className="stack" style={{ textAlign: 'right', gap: '4px' }}>
                <span className="mono small">{d.doc}</span>
                <span className="mono xs muted">confirm {d.answer} →</span>
              </span>
            </button>
          ))}
        </section>

        <p className="hero-cap">
          Photograph: Vidhana Soudha, Bengaluru. A landmark, not an endorsement           this is an independent prototype, unaffiliated with the Government of
          Karnataka.
        </p>
        </div>
      </div>

      {/* Same covering-sheet contract as landing-body: the sheet must reach
          the page's edges or the pinned photograph bleeds through. */}
      <div className="footer-sheet bleed">
        <div className="bleed-inner">
          <Footer />
        </div>
      </div>
    </div>
  )
}
