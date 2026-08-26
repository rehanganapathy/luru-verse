'use server'

import { getProperty } from '@/lib/fixtures'
import { ADAPTERS } from '@/lib/adapters/registry'
import type { TransferTicket } from '@/lib/types'

/**
 * The cascade. One consent, one fan-out, three departments.
 *
 * Note what this function does NOT do: it does not write anything. It resolves
 * the bindings, asks each adapter what would happen, and hands the tickets
 * back to the caller — who stores them on their own device. There is no row in
 * any table of ours that says this person is connected to this property.
 */
export async function initiateHandover(
  epid: string,
  newHolderName: string,
  cleared: string[],
): Promise<TransferTicket[]> {
  const property = getProperty(epid)
  if (!property) return []

  const holder = {
    name: newHolderName.trim() || 'New owner',
    // Mocked. A real build hands off to DigiLocker / AA-style eKYC and keeps
    // only the assertion, never the identifier.
    ekycRef: 'eKYC-MOCK-0000',
  }

  return Promise.all(
    property.bindings.map((b) =>
      ADAPTERS[b.serviceId].initiateTransfer(b, holder, cleared),
    ),
  )
}
