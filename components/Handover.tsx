'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import type { PropertyObject, ServiceId, TransferTicket } from '@/lib/types'
import { rupees } from '@/lib/format'
import { readClock } from '@/lib/sakala'
import {
  EMPTY_LEDGER,
  forProperty,
  nowWithOffset,
  readLedger,
  withProperty,
  writeLedger,
  type Ledger,
} from '@/lib/ledger'
import { initiateHandover } from '@/app/property/[epid]/handover/actions'
import { Mock, Pill } from './ui'
import { DemoClock } from './DemoClock'

export function Handover({ property }: { property: PropertyObject }) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLedger(readLedger())
    setHydrated(true)
  }, [])

  function update(next: Ledger) {
    setLedger(next)
    writeLedger(next)
  }

  const mine = forProperty(ledger, property.ePID)
  const started = Boolean(mine.consent)

  if (!hydrated) {
    return <p className="muted small">Reading your device…</p>
  }

  return started ? (
    <Tracks property={property} ledger={ledger} update={update} />
  ) : (
    <Consent property={property} ledger={ledger} update={update} />
  )
}

/* --- Screen 3: consent ---------------------------------------------------- */

function Consent({
  property,
  ledger,
  update,
}: {
  property: PropertyObject
  ledger: Ledger
  update: (l: Ledger) => void
}) {
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const tickets = await initiateHandover(property.ePID, name, [])
      const mine = forProperty(ledger, property.ePID)
      const now = new Date()
      const expires = new Date(now.getTime() + 30 * 60 * 1000)
      update(
        withProperty(ledger, property.ePID, {
          ...mine,
          consent: {
            grantedAt: now.toISOString(),
            scope: 'forward_verification',
            newHolderName: name.trim() || 'New owner',
            expiresAt: expires.toISOString(),
          },
          tickets: Object.fromEntries(tickets.map((t) => [t.serviceId, t])),
        }),
      )
    })
  }

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <div className="eyebrow">Start handover</div>
        <h1 className="display">
          Move all of it at once
        </h1>
        <p className="ink2">
          One consent, four departments. Today this is three separate
          applications, three counters, three sets of documents, and arrears you
          find out about one at a time. The fourth needs no application at all,
          and you would have had no way to know that either.
        </p>
      </div>

      <form className="card card-pad stack stack-4" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="name">
            Your name, as it appears on the sale deed
          </label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="notice stack stack-2">
          <strong className="small">What you are agreeing to</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }} className="small stack stack-1">
            <li>
              We ask BBMP&rsquo;s revenue and waste wings, BESCOM and BWSSB
              about <em>this property</em> and check whether your name matches
              what they hold.
            </li>
            <li>
              We never ask any of them what else you own. That question has no
              button in this app.
            </li>
            <li>
              Nothing is kept on our servers. The tickets below are written to
              this browser, and expire from the session in 30 minutes.
            </li>
            <li>
              Any transfer a department disputes goes to a human officer, the
              way BBMP&rsquo;s own auto-mutation already does. Nothing here is
              final and nothing here is a bearer token.
            </li>
          </ul>
        </div>

        <div className="notice" style={{ background: 'var(--block-bg)', borderColor: '#eddcbd' }}>
          <strong className="small">This consent step is mocked.</strong>{' '}
          <span className="small">
            A real build routes it through Aadhaar eKYC or DigiLocker, the way
            e-Aasthi does. We collect no identity document, send no OTP, and
            verify nothing. Ticking the box below proves only that you ticked
            a box.
          </span>
        </div>

        <label className="row" style={{ alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flex: 'none' }}
          />
          <span className="small">
            I am the new owner of{' '}
            <Mock what="Mock address">{property.address}</Mock> and I consent to
            this one-time check.
          </span>
        </label>

        <button className="btn btn-block" type="submit" disabled={!agreed || pending}>
          {pending ? 'Contacting four departments…' : 'Consent and start'}
        </button>
      </form>
    </div>
  )
}

/* --- Screen 4: three parallel tracks -------------------------------------- */

const DEPT_SHORT: Record<ServiceId, string> = {
  'bbmp-tax': 'Khata mutation',
  bescom: 'BESCOM name transfer',
  bwssb: 'BWSSB name transfer',
  'bbmp-swm': 'Solid waste user fee',
}

function Tracks({
  property,
  ledger,
  update,
}: {
  property: PropertyObject
  ledger: Ledger
  update: (l: Ledger) => void
}) {
  const mine = forProperty(ledger, property.ePID)
  const [, start] = useTransition()

  // Re-render on a timer so the countdown is genuinely live, not a static
  // number that only moves when you navigate.
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const now = nowWithOffset(ledger)

  const tickets = useMemo(
    () =>
      property.bindings
        .map((b) => mine.tickets[b.serviceId])
        .filter((t): t is TransferTicket => Boolean(t)),
    [property.bindings, mine.tickets],
  )

  function clearBlocker(code: string) {
    const cleared = [...mine.clearedBlockers, code]
    start(async () => {
      const fresh = await initiateHandover(
        property.ePID,
        mine.consent?.newHolderName ?? 'New owner',
        cleared,
      )
      update(
        withProperty(ledger, property.ePID, {
          ...mine,
          clearedBlockers: cleared,
          tickets: Object.fromEntries(fresh.map((t) => [t.serviceId, t])),
        }),
      )
    })
  }

  const running = tickets.filter((t) => t.status === 'in_progress').length
  const blocked = tickets.filter((t) => t.status === 'blocked').length
  const done = tickets.filter((t) => t.status === 'complete').length
  const breached = tickets.filter(
    (t) => t.sakala && readClock(t.sakala, now).breached,
  ).length

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <div className="eyebrow">Handover in progress</div>
        <h1 className="display">{tickets.length} tracks</h1>
        <p className="ink2 small">
          Not a wizard. They run at the same time, at their own speeds, and one
          being stuck does not stop the others.{' '}
          <Mock what="Mock name">{mine.consent?.newHolderName}</Mock> is the
          name going on all of them — including the one that was already done
          before you started.
        </p>
      </div>

      <div className="card card-pad stack stack-2">
        <span className="eyebrow">Right now</span>
        <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
          {running > 0 && <Pill tone="run">{running} running</Pill>}
          {blocked > 0 && <Pill tone="block">{blocked} blocked</Pill>}
          {breached > 0 && <Pill tone="breach">{breached} past guarantee</Pill>}
          {done > 0 && <Pill tone="done">{done} needed nothing</Pill>}
          {running === 0 && blocked === 0 && done === 0 && (
            <Pill tone="done">All done</Pill>
          )}
        </div>
      </div>

      <div className="pair">
        {tickets.map((t) => (
          <Track
            key={t.serviceId}
            ticket={t}
            now={now}
            propertyEpid={property.ePID}
            onClear={clearBlocker}
          />
        ))}
      </div>

      <DemoClock ledger={ledger} update={update} />

      <details className="card card-pad">
        <summary className="h3" style={{ cursor: 'pointer' }}>
          Where this state lives
        </summary>
        <p className="small ink2" style={{ marginTop: 'var(--sp-3)' }}>
          Everything above is in this browser&rsquo;s local storage, written by{' '}
          <code className="mono">lib/ledger.ts</code>. Our server holds no
          record that you looked at this property. Close the tab and the
          departments still have your applications — that is where an
          application belongs — but the join between you and this address exists
          nowhere except on your device.
        </p>
      </details>

      <Link className="btn btn-ghost btn-block" href={`/property/${encodeURIComponent(property.ePID)}`}>
        Back to the property
      </Link>
    </div>
  )
}

function Track({
  ticket,
  now,
  propertyEpid,
  onClear,
}: {
  ticket: TransferTicket
  now: Date
  propertyEpid: string
  onClear: (code: string) => void
}) {
  const clock = ticket.sakala ? readClock(ticket.sakala, now) : null
  const breached = clock?.breached ?? false
  const tone = breached
    ? 'breach'
    : ticket.status === 'in_progress'
      ? 'run'
      : ticket.status === 'complete'
        ? 'done'
        : 'block'

  return (
    <article className={`track track-${tone} stack stack-3`}>
      <div className="row-between">
        <h2 className="h3">{DEPT_SHORT[ticket.serviceId]}</h2>
        <Pill tone={tone}>
          {breached
            ? 'Past guarantee'
            : ticket.status === 'in_progress'
              ? 'In progress'
              : ticket.status === 'complete'
                ? 'Done'
                : 'Blocked'}
        </Pill>
      </div>

      {/* The Sakala clock. This is the whole reason to build this screen. */}
      {ticket.sakala && clock && (
        <div className="stack stack-2">
          <div className="clock">
            <span className="clock-num" style={{ color: breached ? 'var(--breach)' : 'var(--ink)' }}>
              {breached ? clock.daysOverdue : clock.workingDaysRemaining}
            </span>
            <span className="clock-unit">
              {breached
                ? `working day${clock.daysOverdue === 1 ? '' : 's'} past the guarantee`
                : `working day${clock.workingDaysRemaining === 1 ? '' : 's'} left of ${ticket.sakala.guaranteedDays}`}
            </span>
          </div>
          <div className={`meter${breached ? ' meter-breach' : ''}`}>
            <i
              style={{
                width: `${Math.min(100, (clock.workingDaysElapsed / ticket.sakala.guaranteedDays) * 100)}%`,
              }}
            />
          </div>
          <p className="xs muted">
            Guaranteed under the Karnataka Sakala Services Act 2011 —{' '}
            {ticket.sakala.serviceName}, {ticket.sakala.guaranteedDays} working
            days. GSC{' '}
            <Mock what="Mock GSC number">
              <span className="mono">{ticket.sakala.gscNumber}</span>
            </Mock>
          </p>
        </div>
      )}

      {/* "Nothing to do here" is a result, and it needs the same weight as a
          countdown or the citizen will assume the track is broken. */}
      {ticket.note && (
        <div className="notice">
          <p className="small">{ticket.note}</p>
        </div>
      )}

      {!ticket.sakala && ticket.status === 'in_progress' && (
        <p className="xs muted">
          Not a Sakala-notified service, so there is no statutory clock on it.
          We are not going to invent one.
        </p>
      )}

      <dl className="respons">
        <dt>With</dt>
        <dd>{ticket.responsible}</dd>
        {ticket.sakala && (
          <>
            <dt>Due</dt>
            <dd className="tnum">
              {new Date(ticket.sakala.dueAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                timeZone: 'Asia/Kolkata',
              })}
            </dd>
          </>
        )}
      </dl>

      {ticket.blockers.map((b) => (
        <div key={b.code} className="next stack stack-3">
          <div className="stack stack-2">
            <span className="xs" style={{ fontWeight: 600, color: 'var(--block)' }}>
              What you must do next
            </span>
            <p className="small">{b.plainLanguage}</p>
          </div>
          {b.resolvableInApp ? (
            <button className="btn btn-sm" type="button" onClick={() => onClear(b.code)}>
              {b.amountPaise
                ? `Pay ${rupees(b.amountPaise)} and unblock`
                : 'Upload it and unblock'}
              <span className="xs" style={{ opacity: 0.6 }}>· mocked</span>
            </button>
          ) : (
            <p className="xs muted">
              This one cannot be finished in an app. It needs a person at the
              department, and pretending otherwise would waste your trip.
            </p>
          )}
        </div>
      ))}

      {/* The lever. A status viewer tells you that you are late. This tells
          you that being late has a price, and who pays it. */}
      {breached && clock && ticket.sakala && (
        <div className="next next-breach stack stack-3">
          <div className="stack stack-2">
            <span className="xs" style={{ fontWeight: 600, color: 'var(--breach)' }}>
              The guarantee was missed
            </span>
            <p className="small">
              Section 5 of the Sakala Act entitles you to{' '}
              <strong>{rupees(clock.entitlementPaise)}</strong> for{' '}
              {clock.daysOverdue} working day{clock.daysOverdue === 1 ? '' : 's'}{' '}
              of delay — {rupees(ticket.sakala.compensationPerDayPaise)} a day,
              capped at {rupees(ticket.sakala.compensationCapPaise)}
              {clock.entitlementCapped ? ' (you have hit the cap)' : ''}. It is
              recovered from the officer responsible, not from the public purse.
            </p>
          </div>
          <Link
            className="btn btn-sm btn-breach"
            href={`/property/${encodeURIComponent(propertyEpid)}/handover/claim?service=${ticket.serviceId}`}
          >
            Claim your compensation
          </Link>
        </div>
      )}

      <details>
        <summary className="xs muted" style={{ cursor: 'pointer' }}>
          History
        </summary>
        <div className="thread stack stack-3" style={{ marginTop: 'var(--sp-3)' }}>
          {ticket.history.map((h, i) => (
            <div key={i} className="thread-item stack" style={{ gap: 2 }}>
              <span className="small">{h.label}</span>
              <span className="xs muted">
                {new Date(h.at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata',
                })}{' '}
                · {h.by}
              </span>
            </div>
          ))}
        </div>
      </details>
    </article>
  )
}
