// One entry per department. Adding a fourth is this file plus one adapter.

import type {
  Binding,
  Blocker,
  GrievancePayload,
  GrievanceThread,
  Holder,
  PropertyRef,
  ServiceId,
  TransferTicket,
} from '../types'
import type { ServiceAdapter } from './types'
import { PROPERTIES, SEEDED_GRIEVANCES } from '../fixtures'
import { openClock } from '../sakala'

type AdapterConfig = {
  id: ServiceId
  displayName: string
  accountLabel: string
  /** Who actually owns this desk. Shown to the citizen, not hidden in a log. */
  responsibleRole: string
  /**
   * What this department demands before it will move a name, expressed as
   * blockers rather than prose. A precondition the citizen can satisfy and a
   * precondition that sends them to a counter are different states, and the
   * interface has to be able to tell them apart.
   */
  transferPreconditions: (b: Binding) => Blocker[]
}

const CONFIGS: Record<ServiceId, AdapterConfig> = {
  'bbmp-tax': {
    id: 'bbmp-tax',
    displayName: 'BBMP — Property Tax & Khata',
    accountLabel: 'SAS Application Number',
    responsibleRole: 'BBMP Assistant Revenue Officer, ward office',
    transferPreconditions: () => [],
  },
  bescom: {
    id: 'bescom',
    displayName: 'BESCOM — Electricity',
    accountLabel: 'RR Number',
    responsibleRole: 'BESCOM Assistant Executive Engineer, sub-division',
    transferPreconditions: (b) =>
      b.status === 'mismatch'
        ? []
        : [
            {
              code: 'BESCOM_INDEMNITY_BOND',
              plainLanguage:
                'BESCOM needs an indemnity bond on ₹200 stamp paper, signed by you and the seller. Upload it here and we will attach it to the application.',
              resolvableInApp: true,
            },
          ],
  },
  bwssb: {
    id: 'bwssb',
    displayName: 'BWSSB — Water & Sewerage',
    accountLabel: 'RR Number',
    responsibleRole: 'BWSSB Assistant Executive Engineer, sub-division',
    transferPreconditions: () => [],
  },
}

function findBinding(ref: PropertyRef, serviceId: ServiceId): Binding | null {
  const prop = PROPERTIES.find(
    (p) =>
      (ref.ePID && p.ePID === ref.ePID) ||
      (ref.registrationDocNo && p.registrationDocNo === ref.registrationDocNo),
  )
  if (!prop) return null
  return prop.bindings.find((b) => b.serviceId === serviceId) ?? null
}

function ticketId(serviceId: ServiceId, epid: string): string {
  return `TKT-${serviceId.toUpperCase().replace('-', '')}-${epid.slice(-8)}`
}

function makeAdapter(cfg: AdapterConfig): ServiceAdapter {
  return {
    id: cfg.id,
    displayName: cfg.displayName,
    accountLabel: cfg.accountLabel,

    async resolve(ref) {
      return findBinding(ref, cfg.id)
    },

    async initiateTransfer(
      b,
      newHolder: Holder,
      cleared: string[] = [],
    ): Promise<TransferTicket> {
      const prop = PROPERTIES.find((p) =>
        p.bindings.some((x) => x.accountRef === b.accountRef),
      )
      const epid = prop?.ePID ?? 'UNKNOWN'
      const id = ticketId(cfg.id, epid)
      const filedAt = new Date()
      // Two sources of blockage, and the citizen should not have to care
      // which is which: facts about this property (arrears, a stale name) and
      // standing departmental rules (the indemnity bond BESCOM asks everyone
      // for). We merge them, minus anything already cleared.
      const outstanding = [...b.blockers, ...cfg.transferPreconditions(b)].filter(
        (x) => !cleared.includes(x.code),
      )

      // A transfer that cannot proceed is not an error. It is a state, with a
      // named owner and a named next step.
      const status = outstanding.length > 0 ? 'blocked' : 'in_progress'

      return {
        ticketId: id,
        serviceId: cfg.id,
        status,
        responsible:
          status === 'blocked' ? 'You — see the next step below' : cfg.responsibleRole,
        blockers: outstanding,
        sakala: status === 'in_progress' ? openClock(cfg.id, id, filedAt) : undefined,
        history: [
          {
            at: filedAt.toISOString(),
            label:
              status === 'in_progress'
                ? `Application filed with ${cfg.displayName.split(' — ')[0]}. Sakala clock started.`
                : `Cannot file yet — ${outstanding.length} thing${outstanding.length > 1 ? 's' : ''} to clear first.`,
            by: newHolder.name,
          },
        ],
      }
    },

    async getTransferStatus() {
      // Ticket state lives on the citizen's device, not on our server.
      // See lib/ledger.ts. This method exists so the seam is honest about
      // what a real adapter would do: call the department and ask.
      return null
    },

    async listGrievances(b) {
      const prop = PROPERTIES.find((p) =>
        p.bindings.some((x) => x.accountRef === b.accountRef),
      )
      if (!prop) return []
      return SEEDED_GRIEVANCES.filter(
        (g) => g.propertyEPID === prop.ePID && g.raisedAgainst.includes(cfg.id),
      )
    },

    async fileGrievance(b, p: GrievancePayload): Promise<GrievanceThread> {
      const prop = PROPERTIES.find((x) =>
        x.bindings.some((y) => y.accountRef === b.accountRef),
      )
      const now = new Date().toISOString()
      return {
        id: `GRV-${Date.now().toString().slice(-8)}`,
        propertyEPID: prop?.ePID ?? 'UNKNOWN',
        raisedAgainst: [cfg.id],
        category: 'Uncategorised',
        openedAt: now,
        raisedByRole: 'current_owner',
        events: [{ at: now, kind: 'filed', text: p.text, by: 'You' }],
      }
    },
  }
}

export const ADAPTERS: Record<ServiceId, ServiceAdapter> = {
  'bbmp-tax': makeAdapter(CONFIGS['bbmp-tax']),
  bescom: makeAdapter(CONFIGS.bescom),
  bwssb: makeAdapter(CONFIGS.bwssb),
}

export const RESPONSIBLE_ROLE: Record<ServiceId, string> = {
  'bbmp-tax': CONFIGS['bbmp-tax'].responsibleRole,
  bescom: CONFIGS.bescom.responsibleRole,
  bwssb: CONFIGS.bwssb.responsibleRole,
}

export function preconditionsFor(b: Binding): Blocker[] {
  return CONFIGS[b.serviceId].transferPreconditions(b)
}
