'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PropertyObject, ServiceId } from '@/lib/types'
import { rupees } from '@/lib/format'
import { readClock } from '@/lib/sakala'
import { EMPTY_LEDGER, forProperty, nowWithOffset, readLedger, type Ledger } from '@/lib/ledger'
import { RESPONSIBLE_ROLE } from '@/lib/adapters/registry'
import { Mock } from './ui'

/**
 * The appeal, pre-filled.
 *
 * Almost nobody claims Sakala compensation, and the reason is not that people
 * do not want ₹500. It is that claiming requires knowing the entitlement
 * exists, knowing the GSC number, knowing which appellate authority, and
 * writing the thing. We already hold all four. So we write it.
 */
export function ClaimForm({
  property,
  serviceId,
}: {
  property: PropertyObject
  serviceId: ServiceId
}) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  const [hydrated, setHydrated] = useState(false)
  const [filed, setFiled] = useState(false)

  useEffect(() => {
    setLedger(readLedger())
    setHydrated(true)
  }, [])

  if (!hydrated) return <p className="muted small">Reading your device…</p>

  const mine = forProperty(ledger, property.ePID)
  const ticket = mine.tickets[serviceId]
  const now = nowWithOffset(ledger)

  if (!ticket?.sakala) {
    return (
      <div className="stack stack-4">
        <h1 className="display">Nothing to claim</h1>
        <p className="ink2">
          There is no open Sakala application on this track, so there is no
          guarantee to have missed.
        </p>
        <Link className="btn btn-ghost btn-block" href={`/property/${encodeURIComponent(property.ePID)}/handover`}>
          Back to the tracks
        </Link>
      </div>
    )
  }

  const clock = readClock(ticket.sakala, now)
  const holder = mine.consent?.newHolderName ?? 'New owner'

  const appeal = `To: The Competent Officer (Appellate Authority under s.6, Karnataka Sakala Services Act, 2011)
Department: ${ticket.responsible === 'You — see the next step below' ? RESPONSIBLE_ROLE[serviceId] : ticket.responsible}

Subject: Appeal for compensatory cost under Section 5, Karnataka Sakala Services Act, 2011

1. Service applied for: ${ticket.sakala.serviceName}
2. GSC acknowledgement number: ${ticket.sakala.gscNumber}
3. Date of application: ${new Date(ticket.sakala.filedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
4. Stipulated time limit: ${ticket.sakala.guaranteedDays} working days
5. Date due: ${new Date(ticket.sakala.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
6. Delay as on date: ${clock.daysOverdue} working days
7. Property: ${property.address}, ${property.ward}, ${property.zone} (ePID ${property.ePID})

The above application was neither disposed of nor rejected with reasons within
the stipulated period. I therefore claim compensatory cost of ${rupees(clock.entitlementPaise)}
at the rate of ${rupees(ticket.sakala.compensationPerDayPaise)} per day of default${clock.entitlementCapped ? `, restricted to the statutory ceiling of ${rupees(ticket.sakala.compensationCapPaise)}` : ''}, and request that
the service be delivered forthwith.

${holder}
Applicant`

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <div className="eyebrow">Sakala — compensatory cost</div>
        <h1 className="display">
          They owe you {rupees(clock.entitlementPaise)}
        </h1>
        <p className="ink2 small">
          {clock.daysOverdue} working day{clock.daysOverdue === 1 ? '' : 's'} past
          a {ticket.sakala.guaranteedDays}-day statutory guarantee. Under section
          5 the amount is recovered from the salary of the officer responsible
          for the default, which is the part that makes it a lever rather than a
          refund.
        </p>
      </div>

      <div className="card card-pad stack stack-3">
        <div className="row-between">
          <span className="eyebrow">Carried over for you</span>
        </div>
        <dl className="respons">
          <dt>GSC number</dt>
          <dd className="mono xs"><Mock what="Mock GSC number">{ticket.sakala.gscNumber}</Mock></dd>
          <dt>Service</dt>
          <dd>{ticket.sakala.serviceName}</dd>
          <dt>Rate</dt>
          <dd className="tnum">{rupees(ticket.sakala.compensationPerDayPaise)} per day</dd>
          <dt>Ceiling</dt>
          <dd className="tnum">{rupees(ticket.sakala.compensationCapPaise)}</dd>
        </dl>
      </div>

      <div className="stack stack-3">
        <h2 className="h2">Your appeal, written</h2>
        <textarea
          className="textarea mono"
          style={{ minHeight: 320, fontSize: 'var(--t-xs)', lineHeight: 1.6 }}
          defaultValue={appeal}
          aria-label="Pre-filled Sakala appeal"
        />
        <p className="xs muted">
          Edit anything you like. Nothing here is sent anywhere yet.
        </p>
      </div>

      {filed ? (
        <div className="next stack stack-2">
          <strong className="small">Not actually filed.</strong>
          <p className="small">
            There is no integration with the Sakala portal in this prototype and
            we are not going to pretend there is. In a real build this posts to
            the appellate authority for the department and returns an
            acknowledgement. What we have shown is the part that is genuinely
            missing today: knowing the entitlement exists, and having the appeal
            already written when you find out.
          </p>
        </div>
      ) : (
        <button className="btn btn-breach btn-block" type="button" onClick={() => setFiled(true)}>
          File this appeal
          <span className="xs" style={{ opacity: 0.7 }}>· mocked</span>
        </button>
      )}

      <div className="notice">
        <strong>Honest scope note.</strong> Sakala covers <em>notified</em>{' '}
        services — khata transfer and utility name changes are on the list of
        roughly 1,250. Most grievances are not, and run on weaker departmental
        SLAs instead. We show the statutory clock only where one actually
        exists.
      </div>

      <Link className="btn btn-ghost btn-block" href={`/property/${encodeURIComponent(property.ePID)}/handover`}>
        Back to the tracks
      </Link>
    </div>
  )
}
