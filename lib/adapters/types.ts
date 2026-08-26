// THE SEAM.
//
// A department is anything that can answer six questions about a property.
// Adding BDA, GBA, or a gas utility is one file implementing this interface
// plus one line in the registry. Nothing else in the app changes.
//
// The interface is deliberately narrow. It does not expose "list properties
// for person X" — there is no such method, by design, because that reverse
// index is the profiling structure we refuse to build.

import type {
  Binding,
  GrievancePayload,
  GrievanceThread,
  Holder,
  PropertyRef,
  TransferTicket,
} from '../types'

export interface ServiceAdapter {
  id: string
  displayName: string
  accountLabel: string

  /** Property -> binding. Never identity -> properties. */
  resolve(ref: PropertyRef): Promise<Binding | null>

  /** `cleared` are blocker codes the citizen has already satisfied in-app. */
  initiateTransfer(
    b: Binding,
    newHolder: Holder,
    cleared?: string[],
  ): Promise<TransferTicket>
  getTransferStatus(ticketId: string): Promise<TransferTicket | null>

  listGrievances(b: Binding): Promise<GrievanceThread[]>
  fileGrievance(b: Binding, p: GrievancePayload): Promise<GrievanceThread>
}

/**
 * Where a department's own records live. In production this is the
 * department's system of record behind a consented API. Here it is a
 * fixture module plus the citizen's own device.
 */
export interface DepartmentStore {
  bindingFor(epid: string, serviceId: string): Binding | null
  seededGrievances(epid: string, serviceId: string): GrievanceThread[]
}
