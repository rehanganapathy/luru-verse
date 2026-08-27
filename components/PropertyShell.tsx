'use client'

/**
 * THE APP SHELL for everything keyed on one property.
 *
 * Replaces PropertyTabs, which was a row of four links and nothing else. The
 * problem with that was not the links. It was that the single column had no
 * room to answer "which flat is this, and what is its state" anywhere except
 * the top of the page, so the moment you scrolled into the collection log you
 * had lost both.
 *
 * On a phone this is still a header and a row of tabs, because a phone has no
 * room for anything else and the old behaviour was right for it. On anything
 * wider it becomes what the screen actually is: a rail that holds the context
 * and does not move, and a pane that changes. Same component, same list, one
 * source of truth — a nav that exists twice drifts.
 *
 * The badges are live: arrears owed, tracks running, complaints open, rounds
 * missed. They read from the same ledger the pages do, so the rail cannot say
 * something the pane disagrees with.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { PropertyObject } from '@/lib/types'
import { rupees } from '@/lib/format'
import {
  collectionReports,
  EMPTY_LEDGER,
  forProperty,
  nowWithOffset,
  readLedger,
  type Ledger,
} from '@/lib/ledger'
import { buildLog, escalating, STREAM_ORDER, summarise } from '@/lib/swm'
import { getBeat } from '@/lib/fixtures'
import { Mock } from './ui'

type Badge = { text: string; tone?: 'warn' | 'breach' } | null

export function PropertyShell({
  property,
  seededGrievanceCount,
  children,
}: {
  property: PropertyObject
  seededGrievanceCount: number
  children: React.ReactNode
}) {
  const path = usePathname()
  const base = `/property/${encodeURIComponent(property.ePID)}`

  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  useEffect(() => setLedger(readLedger()), [])
  const mine = forProperty(ledger, property.ePID)

  const owed = property.bindings.reduce((n, b) => n + b.outstandingPaise, 0)
  const tickets = Object.values(mine.tickets)
  const running = tickets.filter((t) => t.status === 'in_progress').length
  const blockedCount = tickets.filter((t) => t.status === 'blocked').length
  const openComplaints = mine.grievances.length + seededGrievanceCount

  // The collection badge is the one that earns its place: a missed round is
  // invisible everywhere else in the app, and it is the thing most likely to be
  // true right now.
  const beat = getBeat(property.ePID)
  let missed = 0
  let chronic = false
  if (beat) {
    const entries = buildLog(beat, nowWithOffset(ledger), 21, collectionReports(mine))
    const sums = STREAM_ORDER.map((s) => summarise(entries, s))
    missed = sums.reduce((n, s) => n + s.missed, 0)
    chronic = escalating(sums).length > 0
  }

  const links: Array<{ href: string; label: string; exact: boolean; badge: Badge }> = [
    { href: base, label: 'Property', exact: true, badge: null },
    {
      href: `${base}/handover`,
      label: 'Handover',
      exact: false,
      badge: blockedCount
        ? { text: `${blockedCount} blocked`, tone: 'warn' }
        : running
          ? { text: `${running} running` }
          : null,
    },
    {
      href: `${base}/garbage`,
      label: 'Garbage',
      exact: false,
      badge: chronic
        ? { text: 'not collected', tone: 'breach' }
        : missed > 0
          ? { text: `${missed} missed`, tone: 'warn' }
          : null,
    },
    {
      href: `${base}/grievance`,
      label: 'Grievances',
      exact: false,
      badge: openComplaints ? { text: String(openComplaints) } : null,
    },
  ]

  return (
    <div className="split">
      <aside className="rail stack stack-4" aria-label="This property">
        <div className="rail-head stack stack-2">
          <div className="eyebrow">Property object</div>
          <div className="rail-addr">
            <Mock what="Mock address">{property.address}</Mock>
          </div>
          <div className="xs muted">
            <Mock what="Mock ward">{property.ward}</Mock>
          </div>
          <div className="xs muted mono wide-only" style={{ overflowWrap: 'anywhere' }}>
            <Mock>{property.ePID}</Mock>
          </div>
        </div>

        <nav className="rail-nav" aria-label="Property sections">
          {links.map((l) => {
            const active = l.exact ? path === l.href : path.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className="rail-link"
                aria-current={active ? 'page' : undefined}
              >
                <span>{l.label}</span>
                {l.badge && (
                  <span
                    className={`rail-badge${
                      l.badge.tone === 'breach'
                        ? ' rail-badge-breach'
                        : l.badge.tone === 'warn'
                          ? ' rail-badge-warn'
                          : ''
                    }`}
                  >
                    {l.badge.text}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Only rendered when there is something to say. An always-present
            summary block that usually reads "nothing" trains people to skip
            the place the important number will eventually appear. */}
        {owed > 0 && (
          <div className="stack rail-owed" style={{ gap: 2 }}>
            <span className="xs muted">Outstanding across all four</span>
            <span className="tnum" style={{ color: 'var(--block)', fontWeight: 600 }}>
              <Mock what="Mock amount">{rupees(owed)}</Mock>
            </span>
          </div>
        )}

        <p className="xs muted wide-only" style={{ marginTop: 'auto' }}>
          Keyed on the property, never on you. Nothing on this screen came from
          a list of what anyone owns, because no such list exists here.
        </p>
      </aside>

      {/* key on the path so the entrance animation replays per view, which is
          the only signal that anything changed on an instant client nav */}
      <div className="pane-in" key={path}>
        {children}
      </div>
    </div>
  )
}
