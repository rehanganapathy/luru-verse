// DECLARED, NOT BUILT — and that is the point.
//
// Sell a car and you re-live the identical problem: the RC sits with the RTO,
// insurance is a separate transfer with a separate form, FASTag is a third,
// and challans follow the vehicle regardless of who is driving it. Same
// shape, different object type. Same four-queue tax on the citizen.
//
// These four lines are the whole extensibility claim. We did not build them,
// and we are not pretending we did.

import type { ServiceAdapter } from './types'

export const VEHICLE_ADAPTERS: Array<
  Pick<ServiceAdapter, 'id' | 'displayName' | 'accountLabel'>
> = [
  { id: 'rto', displayName: 'RTO — Registration Certificate', accountLabel: 'Registration Number' },
  { id: 'insurance', displayName: 'Motor Insurance', accountLabel: 'Policy Number' },
  { id: 'fastag', displayName: 'FASTag', accountLabel: 'Tag ID' },
  { id: 'challan', displayName: 'e-Challan (Traffic)', accountLabel: 'Vehicle Number' },
]
