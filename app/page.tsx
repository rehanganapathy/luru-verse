'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { findProperty, verifyChallenge, type FindState } from './actions'
import { Footer, Mock } from '@/components/ui'

const DEMO_KEYS = [
  { label: 'Clean transfer', epid: 'MOCK-1704-0092-3311', doc: 'JYN-1-04412-2024-25', answer: '4412', note: 'Nothing owing. All three bindings move.' },
  { label: 'Arrears left behind', epid: 'MOCK-2210-4471-8802', doc: 'BSK-3-11876-2024-25', answer: '1876', note: 'The previous owner left a water bill.' },
  { label: 'B-Khata + name mismatch', epid: 'MOCK-3390-2255-1140', doc: 'KRP-2-07233-2023-24', answer: '7233', note: 'Meter is still in a 2019 owner’s name.' },
]

export default function Home() {
  const router = useRouter()
  const [state, setState] = useState<FindState>({ step: 'idle' })
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [challengeError, setChallengeError] = useState('')
  const [pending, start] = useTransition()

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
    <div className="stack stack-6">
      <section className="stack stack-4">
        <h1 className="display-lg">
          One property.
          <br />
          Every department.
        </h1>
        <p className="ink2" style={{ maxWidth: '38ch' }}>
          You bought a flat. The sub-registrar knows it by document number, BBMP
          by ePID, BESCOM and BWSSB by two different RR numbers. None of them
          can tell they are talking about the same property, so you become the
          join.
        </p>
      </section>

      {state.step !== 'challenge' && (
        <section className="card card-pad stack stack-4">
          <form className="stack stack-3" onSubmit={submitFind}>
            <div className="field">
              <label className="label" htmlFor="query">
                Registration document number, or ePID
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
            <button className="btn btn-block" type="submit" disabled={pending || !query.trim()}>
              {pending ? 'Looking up…' : 'Find my property'}
            </button>
          </form>

          {state.step === 'error' && (
            <p id="find-error" className="small" style={{ color: 'var(--breach)' }} role="alert">
              {state.message}
            </p>
          )}

          <p className="xs muted">
            One field, because you only ever have one of these to hand. We look
            in both places.
          </p>
        </section>
      )}

      {state.step === 'challenge' && (
        <section className="card card-pad stack stack-4">
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
            are on the gate. Who owns it, what they owe and which accounts are
            attached are not, and a document number alone should not buy them.
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
        </section>
      )}

      <section className="stack stack-3">
        <div className="section-head">
          <span className="eyebrow">For reviewers — three seeded properties</span>
        </div>
        <p className="small muted">
          There is no login. These are the only three properties that exist, and
          every value behind them is invented.
        </p>
        <div className="stack stack-2">
          {DEMO_KEYS.map((d) => (
            <button
              key={d.epid}
              type="button"
              className="card card-pad card-press stack stack-2"
              onClick={() => {
                setQuery(d.doc)
                setState({ step: 'idle' })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <div className="row-between">
                <span className="h3">{d.label}</span>
                <span className="xs muted">Use →</span>
              </div>
              <span className="small ink2">{d.note}</span>
              <span className="binding-meta">
                <span className="mono">{d.doc}</span>
                <span className="mono">confirm {d.answer}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
