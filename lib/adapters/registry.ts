// One entry per department. Adding a fourth was this file plus one adapter —
// see 'bbmp-swm' below, which is that claim being cashed rather than asserted.

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
  /**
   * How a name actually moves at this department.
   *
   * 'application' — the citizen files something and waits. Three of our four
   * bindings work this way, which is the problem the app exists for.
   *
   * 'rides_key' — nothing is filed, because this department already shares an
   * identifier with one that knows about the transfer. BBMP's waste wing bills
   * the SWM user fee on the same SAS number its revenue wing uses, so the
   * khata mutation carries it. The interface has to be able to express "no
   * action required" as a first-class outcome; a track that quietly shows
   * nothing looks identical to a track that is stuck.
   */
  transferMode: 'application' | 'rides_key'
  /** Said on the track when transferMode is 'rides_key'. */
  transferNote?: string
}

const CONFIGS: Record<ServiceId, AdapterConfig> = {
  'bbmp-tax': {
    id: 'bbmp-tax',
    displayName: 'BBMP — Property Tax & Khata',
    accountLabel: 'SAS Application Number',
    responsibleRole: 'BBMP Assistant Revenue Officer, ward office',
    transferMode: 'application',
    transferPreconditions: () => [],
  },
  bescom: {
    id: 'bescom',
    displayName: 'BESCOM — Electricity',
    accountLabel: 'RR Number',
    responsibleRole: 'BESCOM Assistant Executive Engineer, sub-division',
    transferMode: 'application',
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
    transferMode: 'application',
    transferPreconditions: () => [],
  },
  'bbmp-swm': {
    id: 'bbmp-swm',
    displayName: 'BBMP — Solid Waste Management',
    accountLabel: 'Billed on SAS',
    responsibleRole: 'BBMP Health Inspector, ward office',
    transferMode: 'rides_key',
    transferNote:
      'The SWM user fee is raised on the property tax demand, against the same SAS number. When the khata moves, this moves with it — there is no separate application, no indemnity bond and no counter. This is the leg that is already solved, and it is solved for the reason this whole app argues: it shares a key with a system that already knows.',
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

      // Nothing to file. Returning a finished ticket rather than no ticket is
      // the honest answer: the citizen asked what happens at this department,
      // and "nothing needs to" is an answer. Silence is not.
      if (cfg.transferMode === 'rides_key') {
        return {
          ticketId: id,
          serviceId: cfg.id,
          status: 'complete',
          responsible: 'Nobody — it carries across with the khata',
          blockers: [],
          note: cfg.transferNote,
          history: [
            {
              at: filedAt.toISOString(),
              label:
                'No application needed. The SWM user fee is billed on the same number as property tax, so it follows the khata mutation.',
              by: 'System',
            },
          ],
        }
      }

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
  // The fourth department, added the way the seam promised: one config block
  // above, one line here. Nothing else in the app had to change to admit it —
  // the extra behaviour it needed (a transfer that requires no application)
  // went in as a property of the department, not as a special case in the UI.
  'bbmp-swm': makeAdapter(CONFIGS['bbmp-swm']),
}

export const RESPONSIBLE_ROLE: Record<ServiceId, string> = {
  'bbmp-tax': CONFIGS['bbmp-tax'].responsibleRole,
  bescom: CONFIGS.bescom.responsibleRole,
  bwssb: CONFIGS.bwssb.responsibleRole,
  'bbmp-swm': CONFIGS['bbmp-swm'].responsibleRole,
}

export function preconditionsFor(b: Binding): Blocker[] {
  return CONFIGS[b.serviceId].transferPreconditions(b)
}
