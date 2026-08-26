// WHERE STATE LIVES.
//
// Constraint 1 says nothing is stored centrally. That has a consequence people
// usually hand-wave: the transfer tickets, the consent record and anything the
// citizen files still have to live somewhere.
//
// Our answer: on the citizen's device. The ledger below is held in
// localStorage. It holds the consent grant, the ticket references and the
// grievances filed from this device. Our server holds none of it — reload the
// page and it is read back off the device, not fetched from us.
//
// In production the ticket ids would be pointers into each department's own
// system of record, which is where they belong. The department already stores
// your application; that is not a new disclosure. What we refuse to build is
// the *join* — the table that says which properties belong to which person.

'use client'

import type {
  GrievanceThread,
  ServiceId,
  TransferTicket,
} from './types'

export const LEDGER_KEY = 'handover.ledger.v1'

export type ConsentGrant = {
  grantedAt: string
  /** Forward verification only: we checked identity AGAINST a property. */
  scope: 'forward_verification'
  newHolderName: string
  expiresAt: string
}

export type PropertyLedger = {
  consent?: ConsentGrant
  tickets: Record<string, TransferTicket>
  grievances: GrievanceThread[]
  /** Blockers the citizen has cleared in-app, e.g. paid arrears. */
  clearedBlockers: string[]
}

export type Ledger = {
  version: 1
  /** Reviewer control. Shifts the clock forward so SLA breach is demonstrable. */
  demoClockOffsetDays: number
  properties: Record<string, PropertyLedger>
}

export const EMPTY_LEDGER: Ledger = {
  version: 1,
  demoClockOffsetDays: 0,
  properties: {},
}

export function emptyPropertyLedger(): PropertyLedger {
  return { tickets: {}, grievances: [], clearedBlockers: [] }
}

export function readLedger(): Ledger {
  if (typeof window === 'undefined') return EMPTY_LEDGER
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY)
    if (!raw) return EMPTY_LEDGER
    const parsed = JSON.parse(raw) as Ledger
    if (parsed.version !== 1) return EMPTY_LEDGER
    return parsed
  } catch {
    return EMPTY_LEDGER
  }
}

export function writeLedger(l: Ledger): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(l))
  } catch {
    // Private browsing, storage disabled, quota. The app must still work —
    // it just forgets on reload. Never throw at the citizen for this.
  }
}

export function forProperty(l: Ledger, epid: string): PropertyLedger {
  return l.properties[epid] ?? emptyPropertyLedger()
}

export function withProperty(
  l: Ledger,
  epid: string,
  next: PropertyLedger,
): Ledger {
  return { ...l, properties: { ...l.properties, [epid]: next } }
}

/** The demo clock. Presentation only — stored timestamps are never rewritten. */
export function nowWithOffset(l: Ledger): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + l.demoClockOffsetDays)
  return d
}

export function blockerKey(serviceId: ServiceId, code: string): string {
  return `${serviceId}:${code}`
}
