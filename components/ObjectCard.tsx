'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Binding, PropertyObject } from '@/lib/types'
import { rupees, since } from '@/lib/format'
import { Mock, Pill } from './ui'
import { KeyStrip } from './KeyStrip'
import { forProperty, readLedger, type Ledger, EMPTY_LEDGER } from '@/lib/ledger'
import { VEHICLE_ADAPTERS } from '@/lib/adapters/vehicle.declared'

const STATUS: Record<
  Binding['status'],
  { tone: 'run' | 'block' | 'breach' | 'done' | 'idle'; label: string }
> = {
  active: { tone: 'done', label: 'On record' },
  transfer_pending: { tone: 'run', label: 'Transfer running' },
  blocked: { tone: 'block', label: 'Blocked' },
  mismatch: { tone: 'breach', label: 'Name mismatch' },
}

export function ObjectCard({ property }: { property: PropertyObject }) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  useEffect(() => setLedger(readLedger()), [])
  const mine = forProperty(ledger, property.ePID)
  const started = Object.keys(mine.tickets).length > 0

  const totalOwed = property.bindings.reduce((n, b) => n + b.outstandingPaise, 0)
  const problems = property.bindings.filter(
    (b) => b.blockers.length > 0 || b.status === 'mismatch',
  ).length

  return (
    <div className="stack stack-5">
      {/* The object. One card. This screen is the whole pitch: four things
          that live in four portals, on one screen, in two seconds. */}
      <section className="stack stack-4">
        <div className="stack stack-2">
          <div className="eyebrow">Property object</div>
          <h1 className="display">
            <Mock what="Mock address">{property.address}</Mock>
          </h1>
          <p className="small muted">
            <Mock what="Mock locality, ward and zone">
              {property.locality} · {property.ward} · {property.zone} zone
            </Mock>
          </p>
        </div>

        <div className="binding-meta">
          <span><Mock>{property.khataType} khata</Mock></span>
          <span className="tnum">
            <Mock>{property.builtUpAreaSqFt.toLocaleString('en-IN')} sq ft</Mock>
          </span>
          <span className="mono">
            ePID <Mock>{property.ePID}</Mock>
          </span>
        </div>

        <KeyStrip property={property} />

        <div className="notice">
          This object is keyed on the property, not on you. There is no page
          anywhere in this app that lists what a given person owns — the lookup
          only runs in one direction, and{' '}
          <Link href="/transparency#forward">that is on purpose</Link>.
        </div>
      </section>

      {/* Summary line before the detail. On a 360px screen the citizen should
          know whether they have a problem before they scroll. */}
      <section className="card card-pad stack stack-2">
        <span className="eyebrow">Across all {property.bindings.length}</span>
        <span className={`headline tnum${totalOwed > 0 ? ' headline-warn' : ''}`}>
          {totalOwed > 0 ? (
            <>
              <Mock what="Mock amount">{rupees(totalOwed)}</Mock> outstanding
            </>
          ) : (
            'Nothing outstanding'
          )}
        </span>
        <span className="small ink2">
          {problems === 0
            ? 'No department will block a transfer. This is the easy case.'
            : `${problems} of ${property.bindings.length} departments will block a transfer until you clear something.`}
        </span>
      </section>

      <section className="stack stack-3">
        <div className="section-head">
          <h2 className="h2">Service bindings</h2>
          <span className="xs muted">
            {property.bindings.length} live · {VEHICLE_ADAPTERS.length} declared
          </span>
        </div>

        <div className="pair">
        {property.bindings.map((b) => {
          const s = STATUS[b.status]
          return (
            <article key={b.serviceId} className="card card-pad stack stack-3">
              <div className="row-between">
                <h3 className="h3">{b.displayName}</h3>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>

              <div className="row-between" style={{ alignItems: 'flex-end' }}>
                <div className="stack grow" style={{ gap: 2 }}>
                  <span className="xs muted">In the name of</span>
                  <span className="binding-holder">
                    <Mock what="Mock name">{b.holderName}</Mock>
                  </span>
                </div>
                {b.outstandingPaise > 0 && (
                  <div className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
                    <span className="xs muted">Owing</span>
                    <span className="binding-owed tnum">
                      <Mock what="Mock amount">{rupees(b.outstandingPaise)}</Mock>
                    </span>
                  </div>
                )}
              </div>

              <div className="binding-meta">
                <span className="mono">
                  {b.accountLabel} <Mock>{b.accountRef}</Mock>
                </span>
                <span>
                  updated <Mock>{since(b.lastUpdated)}</Mock>
                </span>
                {b.outstandingPaise === 0 && <span>nothing owing</span>}
              </div>

              {b.note && <p className="small ink2">{b.note}</p>}

              {b.serviceId === 'bbmp-swm' && (
                <Link
                  className="btn btn-sm btn-ghost"
                  href={`/property/${encodeURIComponent(property.ePID)}/garbage`}
                  style={{ alignSelf: 'flex-start' }}
                >
                  See the collection log
                </Link>
              )}

              {b.blockers.map((x) => (
                <div key={x.code} className="next stack stack-2">
                  <span className="xs" style={{ fontWeight: 600, color: 'var(--block)' }}>
                    Will block a transfer
                  </span>
                  <p className="small">{x.plainLanguage}</p>
                </div>
              ))}
            </article>
          )
        })}

        </div>

        {/* The seam, stated where a reviewer will actually see it. */}
        <details className="card card-pad">
          <summary className="h3" style={{ cursor: 'pointer' }}>
            Declared, not built: the same shape for a vehicle
          </summary>
          <div className="stack stack-3" style={{ marginTop: 'var(--sp-3)' }}>
            <p className="small ink2">
              Sell a car and the problem is identical: the RC sits with the RTO,
              insurance transfers separately, FASTag separately, and challans
              follow the vehicle regardless of who is driving. Four queues, one
              event, no shared key.
            </p>
            <ul className="stack stack-2" style={{ margin: 0, paddingLeft: 18 }}>
              {VEHICLE_ADAPTERS.map((a) => (
                <li key={a.id} className="small">
                  <strong>{a.displayName}</strong>{' '}
                  <span className="muted">— keyed on {a.accountLabel}</span>
                </li>
              ))}
            </ul>
            <p className="xs muted">
              These four are declarations against the same{' '}
              <code className="mono">ServiceAdapter</code> interface the{' '}
              {property.bindings.length} live bindings implement. We did not
              build them, and we are not claiming we did. The fourth live
              binding — BBMP&rsquo;s waste wing — is what the claim looks like
              when it is cashed: one config block and one line in the registry,
              and nothing else in the app changed to admit it.
            </p>
          </div>
        </details>
      </section>

      <section className="pair">
        <Link className="btn btn-block pair-span" href={`/property/${encodeURIComponent(property.ePID)}/handover`}>
          {started ? 'Continue handover' : 'I bought this property'}
        </Link>
        <Link className="btn btn-ghost btn-block" href={`/property/${encodeURIComponent(property.ePID)}/garbage`}>
          Check garbage collection
        </Link>
        <Link className="btn btn-ghost btn-block" href={`/property/${encodeURIComponent(property.ePID)}/grievance`}>
          Raise or view a complaint
        </Link>
      </section>
    </div>
  )
}
