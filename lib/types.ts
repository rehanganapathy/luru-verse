// Core domain. The object is keyed on the PROPERTY, never on the person.
// Nothing in this file has a `personId`, and that is deliberate — see
// /transparency and constraint 2 (forward verification only).

export type ServiceId = 'bbmp-tax' | 'bescom' | 'bwssb' | 'bbmp-swm'

export type KhataType = 'A' | 'B' | 'e-Khata'

export type BindingStatus =
  | 'active'
  | 'transfer_pending'
  | 'blocked'
  | 'mismatch'

export type Blocker = {
  code: string
  /** What the citizen must do, in their own words. Never an error code. */
  plainLanguage: string
  /** True if the app can carry the citizen through it without a counter visit. */
  resolvableInApp: boolean
  /** Set when clearing the blocker costs money (arrears, fees). */
  amountPaise?: number
}

export type Binding = {
  serviceId: ServiceId
  displayName: string
  /** "SAS Number", "RR Number" — what the department calls its own key. */
  accountLabel: string
  accountRef: string
  holderName: string
  status: BindingStatus
  outstandingPaise: number
  blockers: Blocker[]
  lastUpdated: string
  /** Sakala guarantee, where the action maps to a notified service. */
  sakala?: SakalaClock
  /**
   * One line about how this binding behaves that the status field cannot
   * carry. Used by the SWM binding to say the thing that matters most about
   * it: there is nothing to file, because it is billed on the khata.
   */
  note?: string
}

export type SakalaClock = {
  /** 15-digit GSC acknowledgement number, issued on filing. */
  gscNumber: string
  serviceName: string
  /** Statutory working days for this notified service. */
  guaranteedDays: number
  filedAt: string
  dueAt: string
  /** Karnataka Sakala Services Act 2011 s.5 — compensation on default. */
  compensationPerDayPaise: number
  compensationCapPaise: number
}

export type PropertyObject = {
  ePID: string
  registrationDocNo: string
  address: string
  locality: string
  ward: string
  zone: string
  khataType: KhataType
  builtUpAreaSqFt: number
  ownerOnRecord: string
  /** Last four of the registration doc, used as the possession challenge. */
  possessionChallenge: string
  bindings: Binding[]
}

export type TransferStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'complete'
  | 'referred_to_officer'

export type TransferTicket = {
  ticketId: string
  serviceId: ServiceId
  status: TransferStatus
  /** Whose desk it is on right now. "State is the interface." */
  responsible: string
  blockers: Blocker[]
  sakala?: SakalaClock
  /** Why this track looks the way it does, when that needs saying. */
  note?: string
  history: TrackEvent[]
}

export type TrackEvent = {
  at: string
  label: string
  by: string
}

export type Holder = {
  name: string
  /** Mocked eKYC reference. Never a real Aadhaar number, not even in fixtures. */
  ekycRef: string
}

export type PropertyRef = {
  ePID?: string
  registrationDocNo?: string
}

export type GrievanceEvent = {
  at: string
  kind: 'filed' | 'routed' | 'departmental_update' | 'refiled' | 'closed'
  text: string
  by: string
}

export type GrievanceThread = {
  id: string
  propertyEPID: string
  raisedAgainst: ServiceId[]
  category: string
  /** Append-only. Refiling appends; it never resets the clock. */
  events: GrievanceEvent[]
  openedAt: string
  slaDeadline?: string
  /** Kept across a transfer. The new owner inherits the history. */
  raisedByRole: 'current_owner' | 'previous_owner'
}

export type GrievancePayload = {
  text: string
  lang: 'en' | 'kn' | 'hi'
  photoNote?: string
  locationNote?: string
}
