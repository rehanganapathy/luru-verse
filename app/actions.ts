'use server'

import { checkChallenge, lookup, usedEpidForm, type Lookup } from '@/lib/resolve'

export type FindState =
  | { step: 'idle' }
  | { step: 'challenge'; query: string; usedEpid: boolean; found: Extract<Lookup, { ok: true }> }
  | { step: 'error'; message: string }

export async function findProperty(
  _prev: FindState,
  formData: FormData,
): Promise<FindState> {
  const query = String(formData.get('query') ?? '')
  const result = lookup(query)
  if (!result.ok) {
    return {
      step: 'error',
      message:
        'No property found for that number. Check for a typo, or try the other identifier — the ePID from your tax receipt, or the document number from your sale deed.',
    }
  }
  return { step: 'challenge', query, usedEpid: usedEpidForm(query), found: result }
}

export async function verifyChallenge(
  epid: string,
  answer: string,
  usedEpid: boolean,
): Promise<{ ok: boolean }> {
  return { ok: checkChallenge(epid, answer, usedEpid) }
}
