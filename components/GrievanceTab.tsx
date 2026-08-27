'use client'

import { useEffect, useState } from 'react'
import type {
  GrievanceThread,
  PropertyObject,
  ServiceId,
} from '@/lib/types'
import {
  EMPTY_LEDGER,
  forProperty,
  readLedger,
  withProperty,
  writeLedger,
  type Ledger,
} from '@/lib/ledger'
import { Mock, Pill } from './ui'

const DEPT_NAME: Record<ServiceId, string> = {
  'bbmp-tax': 'BBMP (Revenue)',
  bescom: 'BESCOM',
  bwssb: 'BWSSB',
  'bbmp-swm': 'BBMP (Solid Waste)',
}

type Triage = {
  serviceIds: ServiceId[]
  category: string
  restatement: string
  confidence: 'high' | 'low'
  source: 'model' | 'fallback'
}

export function GrievanceTab({
  property,
  seeded,
  modelLive,
}: {
  property: PropertyObject
  seeded: GrievanceThread[]
  modelLive: boolean
}) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setLedger(readLedger())
    setHydrated(true)
  }, [])

  const mine = forProperty(ledger, property.ePID)
  const own = mine.grievances.filter((g) => g.propertyEPID === property.ePID)
  // A seeded thread the citizen has since appended to lives in BOTH lists —
  // the collection log escalates onto the previous owner's complaint rather
  // than opening a second one. The device's copy is the newer one, so it wins,
  // and the seeded original drops out instead of appearing twice.
  const ownIds = new Set(own.map((g) => g.id))
  const all = [...own, ...seeded.filter((g) => !ownIds.has(g.id))].sort(
    (a, b) => +new Date(b.openedAt) - +new Date(a.openedAt),
  )

  function update(next: Ledger) {
    setLedger(next)
    writeLedger(next)
  }

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <div className="eyebrow">Grievances on this property</div>
        <h1 className="display">
          The complaints stay with the address
        </h1>
        <p className="ink2 small">
          Not with the person who filed them, and not with a ticket number that
          resets when you refile. A thread opened by the previous owner is still
          here, and you can see how many times it has been reopened.
        </p>
      </div>

      <Compose
        property={property}
        modelLive={modelLive}
        onFiled={(thread) =>
          update(
            withProperty(ledger, property.ePID, {
              ...mine,
              grievances: [thread, ...mine.grievances],
            }),
          )
        }
      />

      {hydrated && (
        <section className="stack stack-3">
          <div className="section-head">
            <h2 className="h2">History</h2>
            <span className="xs muted">
              {all.length} thread{all.length === 1 ? '' : 's'}
            </span>
          </div>
          {all.length === 0 && (
            <p className="small muted">Nothing has ever been filed on this property.</p>
          )}
          {all.map((g) => (
            <Thread key={g.id} thread={g} onAppend={(t) =>
              update(
                withProperty(ledger, property.ePID, {
                  ...mine,
                  grievances: mine.grievances.some((x) => x.id === t.id)
                    ? mine.grievances.map((x) => (x.id === t.id ? t : x))
                    : [t, ...mine.grievances],
                }),
              )
            } />
          ))}
        </section>
      )}
    </div>
  )
}

/* --- filing --------------------------------------------------------------- */

function Compose({
  property,
  modelLive,
  onFiled,
}: {
  property: PropertyObject
  modelLive: boolean
  onFiled: (t: GrievanceThread) => void
}) {
  const [text, setText] = useState('')
  const [lang, setLang] = useState<'en' | 'kn' | 'hi'>('en')
  const [photo, setPhoto] = useState(false)
  const [location, setLocation] = useState(false)
  const [triage, setTriage] = useState<Triage | null>(null)
  const [busy, setBusy] = useState(false)

  async function route() {
    if (!text.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      })
      setTriage(await res.json())
    } catch {
      setTriage({
        serviceIds: ['bbmp-tax'],
        category: 'Needs review',
        restatement: 'We could not reach the classifier. A person will route this.',
        confidence: 'low',
        source: 'fallback',
      })
    } finally {
      setBusy(false)
    }
  }

  function file() {
    if (!triage) return
    const now = new Date().toISOString()
    const notes = [
      photo ? 'Photo attached (mocked — no file is uploaded).' : null,
      location ? 'Location attached (mocked — no location is read).' : null,
    ].filter(Boolean)

    onFiled({
      id: `GRV-${Date.now().toString().slice(-8)}`,
      propertyEPID: property.ePID,
      raisedAgainst: triage.serviceIds,
      category: triage.category,
      openedAt: now,
      raisedByRole: 'current_owner',
      events: [
        { at: now, kind: 'filed', text, by: 'You' },
        ...(notes.length
          ? [{ at: now, kind: 'filed' as const, text: notes.join(' '), by: 'You' }]
          : []),
        {
          at: now,
          kind: 'routed',
          text: `Routed to ${triage.serviceIds.map((s) => DEPT_NAME[s]).join(' and ')} — ${triage.category}.`,
          by: triage.source === 'model' ? 'Model triage' : 'Keyword fallback',
        },
      ],
    })
    setText('')
    setTriage(null)
    setPhoto(false)
    setLocation(false)
  }

  return (
    <section className="card card-pad stack stack-4">
      <div className="stack stack-2">
        <h2 className="h2">Raise a complaint</h2>
        <p className="xs muted">
          Say what is wrong in your own words. You do not have to know which
          department owns it — that is the app&rsquo;s problem, not yours.
        </p>
      </div>

      <div className="field">
        <label className="label" htmlFor="grievance">
          What is happening?
        </label>
        <textarea
          id="grievance"
          className={`textarea${lang === 'kn' ? ' kn' : ''}`}
          lang={lang}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setTriage(null)
          }}
          placeholder={
            lang === 'kn'
              ? 'ಉದಾ: ಮನೆಯ ಮುಂದೆ ಚರಂಡಿ ತುಂಬಿ ಹರಿಯುತ್ತಿದೆ, ವಾಸನೆ ಬರುತ್ತಿದೆ'
              : lang === 'hi'
                ? 'जैसे: शाम को रोज़ बिजली चली जाती है और मीटर बहुत गरम हो जाता है'
                : 'e.g. Sewage is overflowing outside the gate and the smell is unbearable'
          }
        />
      </div>

      <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
        {(['en', 'kn', 'hi'] as const).map((l) => (
          <button
            key={l}
            type="button"
            className={`btn btn-sm ${lang === l ? '' : 'btn-ghost'}`}
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
          >
            {l === 'en' ? 'English' : l === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
          </button>
        ))}
      </div>

      <div className="row wrap" style={{ gap: 'var(--sp-3)' }}>
        <label className="row small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} />
          Attach photo <span className="xs muted">· mocked</span>
        </label>
        <label className="row small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={location} onChange={(e) => setLocation(e.target.checked)} />
          Attach location <span className="xs muted">· mocked</span>
        </label>
      </div>

      {!triage && (
        <button className="btn btn-block" type="button" onClick={route} disabled={busy || !text.trim()}>
          {busy ? 'Reading it…' : 'Work out where this goes'}
        </button>
      )}

      {triage && (
        <div className="notice stack stack-3">
          <div className="stack stack-2">
            <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
              {triage.serviceIds.map((s) => (
                <Pill key={s} tone="run">{DEPT_NAME[s]}</Pill>
              ))}
              <Pill tone={triage.confidence === 'high' ? 'done' : 'block'}>
                {triage.confidence === 'high' ? 'Confident' : 'Unsure — a person will check'}
              </Pill>
            </div>
            <p className="small"><strong>{triage.category}</strong></p>
            {triage.restatement && (
              <p className={`small ink2${lang === 'kn' ? ' kn' : ''}`}>{triage.restatement}</p>
            )}
          </div>

          <p className="xs muted">
            {triage.source === 'model'
              ? 'Routed by a language model, because "ಚರಂಡಿ ತುಂಬಿದೆ", "gutter block ho gaya" and "drain overflowing" are the same complaint and no keyword list survives contact with how people actually type.'
              : modelLive
                ? 'A model key is configured but the call did not come back usable — a timeout, a rejected key, or a malformed reply. A keyword classifier routed this instead. Telling you that is better than a spinner.'
                : 'No model key is configured on this deployment, so a keyword classifier routed this. The app is fully usable either way — that is deliberate.'}
          </p>

          <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
            <button className="btn btn-sm" type="button" onClick={file}>
              File it
            </button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setTriage(null)}>
              Wrong — let me edit
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/* --- the append-only thread ----------------------------------------------- */

function Thread({
  thread,
  onAppend,
}: {
  thread: GrievanceThread
  onAppend: (t: GrievanceThread) => void
}) {
  const [refiling, setRefiling] = useState(false)
  const [note, setNote] = useState('')

  const refileCount = thread.events.filter((e) => e.kind === 'refiled').length
  const ageDays = Math.floor(
    (Date.now() - +new Date(thread.openedAt)) / 86400000,
  )

  return (
    <article className="card card-pad stack stack-3">
      <div className="row-between">
        <div className="stack" style={{ gap: 2 }}>
          <h3 className="h3">{thread.category}</h3>
          <span className="xs muted mono">{thread.id}</span>
        </div>
        {refileCount > 0 ? (
          <Pill tone="breach">Reopened {refileCount}×</Pill>
        ) : (
          <Pill tone="idle">Open</Pill>
        )}
      </div>

      <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
        {thread.raisedAgainst.map((s) => (
          <span key={s} className="xs muted">{DEPT_NAME[s]}</span>
        ))}
      </div>

      {thread.raisedByRole === 'previous_owner' && (
        <div className="notice">
          <strong className="small">Opened by the previous owner.</strong>{' '}
          <span className="small">
            {ageDays} days old and still on the property. You would have had no
            way to know this before buying.
          </span>
        </div>
      )}

      <div className="thread stack stack-3">
        {thread.events.map((e, i) => (
          <div
            key={i}
            className={`thread-item stack${i === thread.events.length - 1 ? ' thread-item-now' : ''}`}
            style={{ gap: 2 }}
          >
            <span className="small">{e.text}</span>
            <span className="xs muted">
              {new Date(e.at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Kolkata',
              })}{' '}
              · {e.by} · {e.kind.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {refiling ? (
        <div className="stack stack-3">
          <textarea
            className="textarea"
            style={{ minHeight: 80 }}
            placeholder="What has happened since?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Add to this thread"
          />
          <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
            <button
              className="btn btn-sm"
              type="button"
              disabled={!note.trim()}
              onClick={() => {
                onAppend({
                  ...thread,
                  events: [
                    ...thread.events,
                    { at: new Date().toISOString(), kind: 'refiled', text: note, by: 'You' },
                  ],
                })
                setNote('')
                setRefiling(false)
              }}
            >
              Add to this thread
            </button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setRefiling(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-sm btn-ghost" type="button" onClick={() => setRefiling(true)}>
          Still not fixed — add to this thread
        </button>
      )}

      <p className="xs muted">
        Appending never resets the age of this complaint. That is the whole
        mechanic: a department cannot make a six-month-old problem look like a
        new one by closing it and making you file again.
      </p>
    </article>
  )
}
