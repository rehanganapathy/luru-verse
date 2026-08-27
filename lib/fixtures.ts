// ALL MOCK DATA. Every value here is invented.
//
// Rules we held to, listed again on /transparency:
//   - No real Aadhaar, PAN, OTP, payment instrument or personal data. Not even
//     in fixtures, not even fake-but-well-formed ones.
//   - Names are common Karnataka names with no real person intended.
//   - ePIDs, SAS, RR and document numbers follow the *shape* of the real ones
//     so the UI is honest about field length and format, but no issued
//     identifier was used.
//   - Ward and zone names are real BBMP administrative names, because those
//     are public and getting them wrong would make the demo less legible.

import type { GrievanceThread, PropertyObject, ServiceId } from './types'
import type { Beat } from './swm'

const MOCK_EKYC = 'eKYC-MOCK-0000'

export const PROPERTIES: PropertyObject[] = [
  {
    ePID: 'MOCK-1704-0092-3311',
    registrationDocNo: 'JYN-1-04412-2024-25',
    address: 'Flat 402, Sanjeevini Residency, 4th Cross, Kaggadasapura',
    locality: 'C V Raman Nagar',
    ward: 'Jeevanbhimanagar (Ward 84)',
    zone: 'Mahadevapura',
    khataType: 'e-Khata',
    builtUpAreaSqFt: 1180,
    ownerOnRecord: 'Prakash Rao Kulkarni',
    possessionChallenge: '4412',
    bindings: [
      {
        serviceId: 'bbmp-tax',
        displayName: 'BBMP — Property Tax & Khata',
        accountLabel: 'SAS Application Number',
        accountRef: '2024-25-MOCK-88412',
        holderName: 'Prakash Rao Kulkarni',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        lastUpdated: '2026-08-11T06:30:00.000Z',
      },
      {
        serviceId: 'bescom',
        displayName: 'BESCOM — Electricity',
        accountLabel: 'RR Number',
        accountRef: 'M7-MOCK-441209',
        holderName: 'Prakash Rao Kulkarni',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        lastUpdated: '2026-08-19T04:10:00.000Z',
      },
      {
        serviceId: 'bwssb',
        displayName: 'BWSSB — Water & Sewerage',
        accountLabel: 'RR Number',
        accountRef: '0084-MOCK-11207',
        holderName: 'Prakash Rao Kulkarni',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        lastUpdated: '2026-08-18T09:45:00.000Z',
      },
      {
        // The fourth binding, and the one that behaves differently. BBMP bills
        // the SWM user fee on the property tax demand, so its account
        // reference IS the SAS number above. Same key, same wing, same demand
        // note — which is why nothing has to be applied for when the khata
        // moves. See lib/swm.ts.
        serviceId: 'bbmp-swm',
        displayName: 'BBMP — Solid Waste Management',
        accountLabel: 'Billed on SAS',
        accountRef: '2024-25-MOCK-88412',
        holderName: 'Prakash Rao Kulkarni',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        note: 'Billed with property tax on the same number, so it moves when the khata moves. Nothing to file.',
        lastUpdated: '2026-08-11T06:30:00.000Z',
      },
    ],
  },
  {
    ePID: 'MOCK-2210-4471-8802',
    registrationDocNo: 'BSK-3-11876-2024-25',
    address: 'No. 27, Ground Floor, 9th Main, Padmanabhanagar',
    locality: 'Banashankari',
    ward: 'Padmanabhanagar (Ward 175)',
    zone: 'South',
    khataType: 'A',
    builtUpAreaSqFt: 1640,
    ownerOnRecord: 'Shantamma H N',
    possessionChallenge: '1876',
    bindings: [
      {
        serviceId: 'bbmp-tax',
        displayName: 'BBMP — Property Tax & Khata',
        accountLabel: 'SAS Application Number',
        accountRef: '2024-25-MOCK-31905',
        holderName: 'Shantamma H N',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        lastUpdated: '2026-08-20T11:00:00.000Z',
      },
      {
        serviceId: 'bescom',
        displayName: 'BESCOM — Electricity',
        accountLabel: 'RR Number',
        accountRef: 'S4-MOCK-902314',
        holderName: 'Shantamma H N',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        lastUpdated: '2026-08-21T05:22:00.000Z',
      },
      {
        serviceId: 'bwssb',
        displayName: 'BWSSB — Water & Sewerage',
        accountLabel: 'RR Number',
        accountRef: '0175-MOCK-40988',
        holderName: 'Shantamma H N',
        status: 'active',
        // The arrears case. This is the number that ruins handovers: it is
        // discovered at the counter, after registration, by the new owner.
        outstandingPaise: 418000,
        blockers: [
          {
            code: 'BWSSB_ARREARS',
            plainLanguage:
              'The previous owner left ₹4,180 unpaid on the water connection. BWSSB will not move the name until this is cleared. You can clear it here, or ask the seller to.',
            resolvableInApp: true,
            amountPaise: 418000,
          },
        ],
        lastUpdated: '2026-08-14T07:05:00.000Z',
      },
      {
        serviceId: 'bbmp-swm',
        displayName: 'BBMP — Solid Waste Management',
        accountLabel: 'Billed on SAS',
        accountRef: '2024-25-MOCK-31905',
        holderName: 'Shantamma H N',
        status: 'active',
        // Two months of SWM user fee unpaid. Small enough that nobody chases
        // it, and it rides along on the tax demand rather than arriving as its
        // own bill — which is precisely why people do not know they owe it.
        outstandingPaise: 40000,
        blockers: [],
        note: 'Billed with property tax on the same number, so it moves when the khata moves. Nothing to file.',
        lastUpdated: '2026-08-20T11:00:00.000Z',
      },
    ],
  },
  {
    ePID: 'MOCK-3390-2255-1140',
    registrationDocNo: 'KRP-2-07233-2023-24',
    address: 'Site 14, Sy. No. 62/3, Chikkabanavara Main Road',
    locality: 'Chikkabanavara',
    ward: 'Bagalakunte (Ward 40)',
    zone: 'Dasarahalli',
    khataType: 'B',
    builtUpAreaSqFt: 900,
    ownerOnRecord: 'Nagaraj Gowda M',
    possessionChallenge: '7233',
    bindings: [
      {
        serviceId: 'bbmp-tax',
        displayName: 'BBMP — Property Tax & Khata',
        accountLabel: 'SAS Application Number',
        accountRef: '2023-24-MOCK-55021',
        holderName: 'Nagaraj Gowda M',
        status: 'blocked',
        outstandingPaise: 0,
        blockers: [
          {
            code: 'B_KHATA_NOT_CONVERTED',
            plainLanguage:
              'This is a B-Khata property. Khata transfer is not available until it is regularised to A-Khata or e-Khata. Everything else on this page still works.',
            resolvableInApp: false,
          },
        ],
        lastUpdated: '2026-06-02T10:15:00.000Z',
      },
      {
        serviceId: 'bescom',
        displayName: 'BESCOM — Electricity',
        accountLabel: 'RR Number',
        accountRef: 'D2-MOCK-771450',
        // The mismatch case: the meter was never moved off the person who
        // sold the site in 2019. Two owners ago.
        holderName: 'Muniyappa (previous holder)',
        status: 'mismatch',
        outstandingPaise: 0,
        blockers: [
          {
            code: 'HOLDER_MISMATCH',
            plainLanguage:
              'The electricity meter is still in the name of an owner from before the current one. BESCOM needs the earlier sale deed as well as yours before it will move the name.',
            resolvableInApp: false,
          },
        ],
        lastUpdated: '2019-11-08T06:00:00.000Z',
      },
      {
        serviceId: 'bwssb',
        displayName: 'BWSSB — Water & Sewerage',
        accountLabel: 'RR Number',
        accountRef: '0040-MOCK-20117',
        holderName: 'Nagaraj Gowda M',
        status: 'active',
        outstandingPaise: 96000,
        blockers: [
          {
            code: 'BWSSB_ARREARS',
            plainLanguage:
              'Water bill of ₹960 is unpaid. Clear it before starting the name transfer, or it will block the application later.',
            resolvableInApp: true,
            amountPaise: 96000,
          },
        ],
        lastUpdated: '2026-08-01T08:30:00.000Z',
      },
      {
        serviceId: 'bbmp-swm',
        displayName: 'BBMP — Solid Waste Management',
        accountLabel: 'Billed on SAS',
        accountRef: '2023-24-MOCK-55021',
        holderName: 'Nagaraj Gowda M',
        status: 'active',
        outstandingPaise: 0,
        blockers: [],
        // The fee is being collected. The service is not being delivered. That
        // sentence is the entire point of the collection screen, and it is
        // true of this property in the fixtures.
        note: 'Billed with property tax on the same number. The fee is current — the collection is not.',
        lastUpdated: '2026-06-02T10:15:00.000Z',
      },
    ],
  },
]

/**
 * COLLECTION BEATS. One per property, joined by address, not by household.
 *
 * The fee slabs follow BBMP's own structure — a monthly SWM user fee on the
 * property tax demand, banded by built-up area. The band boundaries and the
 * amounts below are invented; we did not verify the current notified slab, and
 * /transparency says so rather than quoting a figure we cannot stand behind.
 */
export const BEATS: Record<string, Beat> = {
  'MOCK-1704-0092-3311': {
    beatCode: 'MOCK/JBN-84/B-11',
    routeCode: 'AT-MOCK-212',
    responsible: 'BBMP Health Inspector, Jeevanbhimanagar ward office',
    scheduledDays: { wet: [1, 2, 3, 4, 5, 6], dry: [5], sanitary: [2, 6] },
    monthlyUserFeePaise: 20000,
    households: 264,
    // The ordinary case: a tipper misses a day now and then. Worth showing,
    // not worth escalating, and the screen should be able to tell them apart.
    seededMisses: [
      { daysAgo: 9, stream: 'wet' },
      { daysAgo: 17, stream: 'wet' },
    ],
  },
  'MOCK-2210-4471-8802': {
    beatCode: 'MOCK/PNR-175/B-14',
    routeCode: 'AT-MOCK-448',
    responsible: 'BBMP Health Inspector, Padmanabhanagar ward office',
    scheduledDays: { wet: [1, 2, 3, 4, 5, 6], dry: [4], sanitary: [1, 5] },
    monthlyUserFeePaise: 20000,
    households: 318,
    // THE RESTRAINT CASE, and it earns its place. Sanitary waste has been
    // missed the last two rounds running — one short of the threshold, so the
    // screen reports it and does nothing else. A tool that escalates on every
    // wobble trains the ward office to ignore it, which costs the one
    // complaint that mattered. Two is a bad fortnight. Three is a pattern.
    seededMisses: [
      { daysAgo: 1, stream: 'sanitary' },
      { daysAgo: 5, stream: 'sanitary' },
      { daysAgo: 3, stream: 'wet' },
      { daysAgo: 12, stream: 'wet' },
    ],
  },
  'MOCK-3390-2255-1140': {
    beatCode: 'MOCK/BGK-40/B-07',
    routeCode: 'AT-MOCK-091',
    responsible: 'BBMP Health Inspector, Bagalakunte ward office',
    scheduledDays: { wet: [1, 2, 3, 4, 5, 6], dry: [3], sanitary: [2, 6] },
    monthlyUserFeePaise: 10000,
    households: 191,
    seededMisses: [
      { daysAgo: 2, stream: 'wet' },
      { daysAgo: 8, stream: 'wet' },
    ],
    // THE FINDING, citizen side. Dry waste on this street stopped being
    // collected eleven weeks ago and no complaint was ever raised, because
    // nobody was counting — you notice a missed pickup, you do not notice a
    // pattern. The waste did not stop being generated, so it went somewhere:
    // the corner of the road, which is now a black spot BBMP will read as
    // indiscipline rather than as a route that no longer arrives.
    chronic: {
      stream: 'dry',
      sinceDaysAgo: 77,
      reason:
        'The dry-waste round was folded into a neighbouring route when the collection contract changed. This street sits at the edge of both and is on neither.',
    },
  },
}

export function getBeat(epid: string): Beat | null {
  return BEATS[epid] ?? null
}

/**
 * Departmental grievance history that pre-dates the current owner.
 *
 * This is the whole argument for keying the thread on the property. A new
 * owner today has no way to learn that the sewage line on this street has
 * been complained about four times since March. Here they do.
 */
export const SEEDED_GRIEVANCES: GrievanceThread[] = [
  {
    id: 'GRV-MOCK-40912',
    propertyEPID: 'MOCK-2210-4471-8802',
    raisedAgainst: ['bwssb'],
    category: 'Sewage overflow',
    openedAt: '2026-03-14T05:20:00.000Z',
    raisedByRole: 'previous_owner',
    events: [
      { at: '2026-03-14T05:20:00.000Z', kind: 'filed', text: 'Sewage backing up into the ground floor bathroom after rain.', by: 'Previous owner' },
      { at: '2026-03-14T05:21:00.000Z', kind: 'routed', text: 'Routed to BWSSB, Sub-division South-3.', by: 'System' },
      { at: '2026-03-27T09:00:00.000Z', kind: 'departmental_update', text: 'Site inspected. Jetting scheduled.', by: 'BWSSB AEE' },
      { at: '2026-05-02T06:40:00.000Z', kind: 'refiled', text: 'Problem returned within three weeks. Refiling on the same thread.', by: 'Previous owner' },
      { at: '2026-06-19T11:10:00.000Z', kind: 'refiled', text: 'Third time this year. No permanent fix carried out.', by: 'Previous owner' },
    ],
  },
  {
    id: 'GRV-MOCK-51188',
    propertyEPID: 'MOCK-3390-2255-1140',
    raisedAgainst: ['bescom'],
    category: 'Voltage fluctuation',
    openedAt: '2026-07-02T14:05:00.000Z',
    raisedByRole: 'previous_owner',
    events: [
      { at: '2026-07-02T14:05:00.000Z', kind: 'filed', text: 'Severe voltage drop every evening between 7 and 9.', by: 'Previous owner' },
      { at: '2026-07-02T14:06:00.000Z', kind: 'routed', text: 'Routed to BESCOM, Dasarahalli Sub-division.', by: 'System' },
      { at: '2026-07-21T08:00:00.000Z', kind: 'departmental_update', text: 'Transformer load study requested.', by: 'BESCOM AE' },
    ],
  },
  {
    // The complaint that has been filed against the wrong thing for a year.
    //
    // Everyone involved treats this as a dumping problem, so every response is
    // a dumping response: clear the heap, put up a board, threaten a fine. The
    // collection log on this property says the dry-waste round stopped
    // arriving eleven weeks ago. Nobody joined those two facts, because the
    // complaint sits in one system and the beat roster in another — the same
    // shape of failure as the sewer cluster on the ward map, one street down.
    id: 'GRV-MOCK-62204',
    propertyEPID: 'MOCK-3390-2255-1140',
    raisedAgainst: ['bbmp-swm'],
    category: 'Garbage dumping at street corner',
    openedAt: '2026-05-29T04:15:00.000Z',
    raisedByRole: 'previous_owner',
    events: [
      { at: '2026-05-29T04:15:00.000Z', kind: 'filed', text: 'Rubbish is piling up at the corner of the road. Cattle and dogs pull it across the street every morning.', by: 'Previous owner' },
      { at: '2026-05-29T04:16:00.000Z', kind: 'routed', text: 'Routed to BBMP Solid Waste Management, Bagalakunte ward.', by: 'System' },
      { at: '2026-06-06T10:30:00.000Z', kind: 'departmental_update', text: 'Black spot cleared. Warning board installed. Public requested to hand waste to the auto-tipper.', by: 'BBMP Health Inspector' },
      { at: '2026-07-14T05:50:00.000Z', kind: 'refiled', text: 'Cleared once and back within a fortnight. The board is still there. So is the rubbish.', by: 'Previous owner' },
      { at: '2026-08-18T06:20:00.000Z', kind: 'refiled', text: 'Third time. Nobody here is refusing to hand over waste — there is no one to hand it to.', by: 'Previous owner' },
    ],
  },
]

export const SERVICE_ORDER: ServiceId[] = ['bbmp-tax', 'bescom', 'bwssb', 'bbmp-swm']

export function findProperty(query: string): PropertyObject | null {
  const q = query.trim().toUpperCase().replace(/\s+/g, '')
  if (!q) return null
  return (
    PROPERTIES.find(
      (p) =>
        p.ePID.toUpperCase().replace(/\s+/g, '') === q ||
        p.registrationDocNo.toUpperCase().replace(/\s+/g, '') === q,
    ) ?? null
  )
}

export function getProperty(epid: string): PropertyObject | null {
  return PROPERTIES.find((p) => p.ePID === epid) ?? null
}
