// Karnataka Sakala Services Act, 2011.
//
// Every notified service application receives a 15-digit GSC acknowledgement
// number and a guaranteed timeframe in working days. On default, s.5 entitles
// the applicant to compensatory cost — Rs 20 per day of delay, capped at
// Rs 500, recovered from the defaulting officer.
//
// Honest scope note, repeated on /transparency: Sakala covers *notified*
// services. Khata transfer and new utility connections are notified. Most
// grievances are not — those run on departmental SLAs, which are weaker.

import type { SakalaClock, ServiceId } from './types'

export const COMPENSATION_PER_DAY_PAISE = 2000 // Rs 20
export const COMPENSATION_CAP_PAISE = 50000 // Rs 500

/** Notified services we touch, with their published guarantee. */
export const NOTIFIED_SERVICES: Record<
  ServiceId,
  { serviceName: string; guaranteedDays: number } | null
> = {
  'bbmp-tax': {
    serviceName: 'Transfer of Khata (undisputed)',
    guaranteedDays: 7,
  },
  bescom: {
    serviceName: 'Change of name in electricity connection',
    guaranteedDays: 7,
  },
  // BWSSB name transfer is not in the Sakala notified list we could verify.
  // We say so rather than invent a guarantee.
  bwssb: null,
  // Solid waste has no clock here for a different reason: there is nothing to
  // file. Sakala measures one application against one deadline, and the SWM
  // user fee moves with the khata without an application existing. A clock
  // would be measuring nothing. The instrument that does bite on a recurring
  // service is in lib/swm.ts — the fee charged against the service delivered.
  'bbmp-swm': null,
}

export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

/** Sakala counts working days. Weekends do not run the clock. */
export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from.getTime())
  let remaining = days
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (!isWeekend(d)) remaining -= 1
  }
  return d
}

export function workingDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0
  const d = new Date(from.getTime())
  let count = 0
  while (d < to) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (!isWeekend(d)) count += 1
  }
  return count
}

/**
 * GSC numbers are 15 digits. Real ones encode department and sequence; ours is
 * derived deterministically from the ticket so the same ticket always shows the
 * same number, and is labelled as mocked everywhere it appears.
 */
export function mockGscNumber(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const digits = Math.abs(h).toString().padStart(10, '7').slice(0, 10)
  return `GSC${digits}${(seed.length * 37).toString().padStart(2, '0')}`.slice(
    0,
    15,
  )
}

export function openClock(
  serviceId: ServiceId,
  ticketId: string,
  filedAt: Date,
): SakalaClock | undefined {
  const notified = NOTIFIED_SERVICES[serviceId]
  if (!notified) return undefined
  return {
    gscNumber: mockGscNumber(ticketId),
    serviceName: notified.serviceName,
    guaranteedDays: notified.guaranteedDays,
    filedAt: filedAt.toISOString(),
    dueAt: addWorkingDays(filedAt, notified.guaranteedDays).toISOString(),
    compensationPerDayPaise: COMPENSATION_PER_DAY_PAISE,
    compensationCapPaise: COMPENSATION_CAP_PAISE,
  }
}

export type ClockReading = {
  breached: boolean
  workingDaysElapsed: number
  workingDaysRemaining: number
  daysOverdue: number
  entitlementPaise: number
  entitlementCapped: boolean
}

export function readClock(clock: SakalaClock, now: Date): ClockReading {
  const filed = new Date(clock.filedAt)
  const due = new Date(clock.dueAt)
  const elapsed = workingDaysBetween(filed, now)
  const breached = now > due
  const daysOverdue = breached ? workingDaysBetween(due, now) : 0
  const raw = daysOverdue * clock.compensationPerDayPaise
  const entitlementPaise = Math.min(raw, clock.compensationCapPaise)
  return {
    breached,
    workingDaysElapsed: Math.min(elapsed, clock.guaranteedDays),
    workingDaysRemaining: Math.max(clock.guaranteedDays - elapsed, 0),
    daysOverdue,
    entitlementPaise,
    entitlementCapped: raw > clock.compensationCapPaise,
  }
}
