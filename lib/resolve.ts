import { PROPERTIES } from './fixtures'

export type Lookup =
  | { ok: true; epid: string; address: string; ward: string; challengeLabel: string; challengeHint: string }
  | { ok: false; reason: 'not_found' }

function norm(s: string): string {
  return s.trim().toUpperCase().replace(/[\s]/g, '')
}

/**
 * Step one of two. Resolving an identifier returns the property's ADDRESS AND
 * WARD ONLY — public-record facts you could read off the gate.
 *
 * It deliberately does not return holder names, account references or
 * outstanding amounts. Those need step two. Knowing a document number is not
 * the same as having a claim on the property, and an app that hands over the
 * previous owner's name and their unpaid bills to anyone who can type a number
 * has built a lookup service for people who should not have one.
 */
export function lookup(query: string): Lookup {
  const q = norm(query)
  if (!q) return { ok: false, reason: 'not_found' }

  const byEpid = PROPERTIES.find((p) => norm(p.ePID) === q)
  if (byEpid) {
    return {
      ok: true,
      epid: byEpid.ePID,
      address: byEpid.address,
      ward: byEpid.ward,
      challengeLabel: 'Last 4 digits of the registration document number',
      challengeHint: 'From your sale deed — the number ending in four digits.',
    }
  }

  const byDoc = PROPERTIES.find((p) => norm(p.registrationDocNo) === q)
  if (byDoc) {
    return {
      ok: true,
      epid: byDoc.ePID,
      address: byDoc.address,
      ward: byDoc.ward,
      challengeLabel: 'Last 4 digits of the ePID',
      challengeHint: 'From your BBMP property tax receipt or e-Khata.',
    }
  }

  return { ok: false, reason: 'not_found' }
}

/** Step two. Forward verification: we check a fact you hold against the
 *  property. We never go the other way. */
export function checkChallenge(epid: string, answer: string, usedEpid: boolean): boolean {
  const p = PROPERTIES.find((x) => x.ePID === epid)
  if (!p) return false
  const expected = usedEpid
    ? p.registrationDocNo.replace(/\D/g, '').slice(-4)
    : p.ePID.replace(/\D/g, '').slice(-4)
  return answer.trim() === expected
}

export function usedEpidForm(query: string): boolean {
  const q = norm(query)
  return PROPERTIES.some((p) => norm(p.ePID) === q)
}
