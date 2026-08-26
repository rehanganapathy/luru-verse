// THE DEPARTMENT VIEW.
//
// The citizen side of this app is keyed on one property. This side is keyed on
// infrastructure: pipes, feeders, stretches of road, and the works that touch
// them. They share one thing — the grievance threads — and that shared edge is
// the whole point of the screen.
//
// ---------------------------------------------------------------------------
// WHAT THIS VIEW DELIBERATELY CANNOT DO
//
// It cannot name a person. It cannot list the properties belonging to anyone.
// It cannot be filtered by owner, and there is no field in any type below that
// would let it. Coverage gaps are reported as counts on a stretch, never as a
// list of households, because "show me who has power but has not been assessed
// for tax" is a name-and-shame query and we are not building the machine that
// answers it.
//
// A department gets the gap. It does not get the person. Finding the person is
// the department's own job, through its own due process, with its own records
// and its own accountability for doing it — which is exactly where that step
// belongs.
// ---------------------------------------------------------------------------

export type Network = 'water' | 'sewer' | 'power'

export const NETWORKS: Record<
  Network,
  { label: string; owner: string; colorVar: string }
> = {
  water: { label: 'Water mains', owner: 'BWSSB', colorVar: '--net-water' },
  sewer: { label: 'Sewer lines', owner: 'BWSSB', colorVar: '--net-sewer' },
  power: { label: 'LT / HT feeders', owner: 'BESCOM', colorVar: '--net-power' },
}

/** A junction in the ward street network. Purely schematic coordinates. */
export type Node = { id: string; x: number; y: number }

/** A run of pipe or cable between junctions. */
export type Line = {
  id: string
  network: Network
  /** Node ids, in order. */
  path: string[]
  label: string
  /** Diameter in mm for pipes, or conductor description for feeders. */
  spec: string
  laidYear: number
  condition: 'good' | 'ageing' | 'critical'
}

export type WorkStatus = 'completed' | 'in_progress' | 'upcoming'

export type Work = {
  id: string
  network: Network
  title: string
  status: WorkStatus
  /** Which lines this work touches. Drives the map highlight. */
  lineIds: string[]
  where: string
  startedOn?: string
  completedOn?: string
  expectedStart?: string
  costLakh: number
  /** Tender / work order reference. Mocked. */
  ref: string
  note?: string
}

/**
 * A cluster of citizen complaints, positioned on the network.
 *
 * `threadIds` point at the same append-only threads the citizen sees. That is
 * the join that makes this screen worth building: the department is looking at
 * the identical record, not a summarised copy that quietly drops the reopen
 * count.
 */
export type Cluster = {
  id: string
  network: Network
  nodeId: string
  stretch: string
  openComplaints: number
  reopened: number
  oldestDays: number
  threadIds: string[]
}

/**
 * Connections with no matching tax assessment at the same address.
 *
 * Reported per stretch as a COUNT. Deliberately not enumerable, not
 * clickable-through to an address list, and not exportable. See the header.
 */
export type CoverageGap = {
  id: string
  nodeId: string
  stretch: string
  /** Live utility connections found with no matching BBMP assessment. */
  unassessedConnections: number
  /** Rough annual property tax foregone, at ward median. Mocked. */
  estAnnualRevenueLakh: number
}

/* --- the ward -------------------------------------------------------------- */

export const WARD = {
  name: 'Padmanabhanagar',
  number: 175,
  zone: 'South',
  households: 8420,
  subDivision: 'BWSSB South-3 / BESCOM Padmanabhanagar',
}

// Schematic street network. Jittered off a grid so it reads as a ward rather
// than as graph paper. Coordinates are in the map's own viewBox space.
export const NODES: Node[] = [
  { id: 'a1', x: 58, y: 72 },   { id: 'a2', x: 236, y: 60 },
  { id: 'a3', x: 430, y: 78 },  { id: 'a4', x: 622, y: 64 },
  { id: 'b1', x: 70, y: 186 },  { id: 'b2', x: 250, y: 172 },
  { id: 'b3', x: 442, y: 192 }, { id: 'b4', x: 634, y: 178 },
  { id: 'c1', x: 52, y: 298 },  { id: 'c2', x: 238, y: 286 },
  { id: 'c3', x: 424, y: 306 }, { id: 'c4', x: 618, y: 292 },
  { id: 'd1', x: 66, y: 410 },  { id: 'd2', x: 254, y: 398 },
  { id: 'd3', x: 446, y: 418 }, { id: 'd4', x: 640, y: 404 },
  { id: 'e2', x: 240, y: 508 }, { id: 'e3', x: 432, y: 520 },
  { id: 'e4', x: 626, y: 500 },
]

export const NODE_BY_ID: Record<string, Node> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
)

/** Streets, drawn under everything as context. */
export const ROADS: [string, string][] = [
  ['a1', 'a2'], ['a2', 'a3'], ['a3', 'a4'],
  ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4'],
  ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'],
  ['d1', 'd2'], ['d2', 'd3'], ['d3', 'd4'],
  ['e2', 'e3'], ['e3', 'e4'],
  ['a1', 'b1'], ['b1', 'c1'], ['c1', 'd1'],
  ['a2', 'b2'], ['b2', 'c2'], ['c2', 'd2'], ['d2', 'e2'],
  ['a3', 'b3'], ['b3', 'c3'], ['c3', 'd3'], ['d3', 'e3'],
  ['a4', 'b4'], ['b4', 'c4'], ['c4', 'd4'], ['d4', 'e4'],
]

export const ROAD_LABELS = [
  { x: 262, y: 128, text: '9th Main', anchor: 'start' as const },
  { x: 150, y: 392, text: '4th Cross', anchor: 'start' as const },
  { x: 660, y: 240, text: 'Ring Road', anchor: 'end' as const },
]

/** The lake. Bengaluru wards drain toward one, and the sewer network shows it. */
export const LAKE = { cx: 598, cy: 466, rx: 78, ry: 50, name: 'Kere (tank)' }

export const LINES: Line[] = [
  {
    id: 'w-main',
    network: 'water',
    path: ['a2', 'b2', 'c2', 'd2', 'e2'],
    label: 'Water main — 9th Main',
    spec: '150 mm DI',
    laidYear: 2011,
    condition: 'good',
  },
  {
    id: 'w-cross',
    network: 'water',
    path: ['d1', 'd2', 'd3', 'd4'],
    label: 'Water main — 4th Cross',
    spec: '100 mm CI',
    laidYear: 1994,
    condition: 'ageing',
  },
  {
    id: 'w-north',
    network: 'water',
    path: ['b1', 'b2', 'b3', 'b4'],
    label: 'Water distribution — north',
    spec: '100 mm DI',
    laidYear: 2016,
    condition: 'good',
  },
  {
    id: 's-trunk',
    network: 'sewer',
    path: ['a3', 'b3', 'c3', 'd3', 'e3', 'e4'],
    label: 'Sewer trunk — falls to kere',
    spec: '300 mm SW',
    laidYear: 1987,
    condition: 'critical',
  },
  {
    id: 's-lat-4c',
    network: 'sewer',
    path: ['d1', 'd2', 'd3'],
    label: 'Sewer lateral — 4th Cross',
    spec: '200 mm SW',
    laidYear: 1991,
    condition: 'critical',
  },
  {
    id: 's-lat-n',
    network: 'sewer',
    path: ['b1', 'b2', 'b3'],
    label: 'Sewer lateral — north',
    spec: '200 mm SW',
    laidYear: 2014,
    condition: 'good',
  },
  {
    id: 'p-feeder-1',
    network: 'power',
    path: ['b4', 'b3', 'b2', 'b1'],
    label: 'HT feeder F-1 from sub-station',
    spec: '11 kV overhead',
    laidYear: 2009,
    condition: 'ageing',
  },
  {
    id: 'p-feeder-2',
    network: 'power',
    path: ['b4', 'c4', 'd4', 'e4'],
    label: 'HT feeder F-2 — Ring Road',
    spec: '11 kV UG cable',
    laidYear: 2019,
    condition: 'good',
  },
  {
    id: 'p-lt-9m',
    network: 'power',
    path: ['b2', 'c2', 'd2', 'e2'],
    label: 'LT distribution — 9th Main',
    spec: 'LT AB cable',
    laidYear: 2021,
    condition: 'good',
  },
]

export const SUBSTATION = { nodeId: 'b4', label: 'BESCOM 66/11 kV sub-station' }

export const WORKS: Work[] = [
  {
    id: 'WRK-MOCK-2201',
    network: 'power',
    title: 'LT re-conductoring to AB cable, 9th Main',
    status: 'completed',
    lineIds: ['p-lt-9m'],
    where: '9th Main, full stretch',
    completedOn: '2025-11-18',
    costLakh: 41,
    ref: 'BESCOM/PNR/WO/2025-26/118',
  },
  {
    id: 'WRK-MOCK-2244',
    network: 'sewer',
    title: 'Sewer rehabilitation Phase 1 — north laterals',
    status: 'completed',
    lineIds: ['s-lat-n'],
    where: 'North laterals, b1–b3',
    completedOn: '2026-02-27',
    costLakh: 96,
    ref: 'BWSSB/S3/WO/2025-26/044',
  },
  {
    id: 'WRK-MOCK-2310',
    network: 'water',
    title: 'Water main replacement, 100 mm CI to 150 mm DI',
    status: 'in_progress',
    lineIds: ['w-cross'],
    where: '4th Cross, d1–d4',
    startedOn: '2026-07-30',
    costLakh: 132,
    ref: 'BWSSB/S3/WO/2026-27/012',
    note: 'Trenching complete on d1–d2. Road restoration pending.',
  },
  {
    id: 'WRK-MOCK-2318',
    network: 'power',
    title: 'Transformer augmentation, 250 to 500 kVA',
    status: 'in_progress',
    lineIds: ['p-feeder-1'],
    where: 'Near sub-station, b4',
    startedOn: '2026-08-11',
    costLakh: 58,
    ref: 'BESCOM/PNR/WO/2026-27/067',
  },
  {
    id: 'WRK-MOCK-2402',
    network: 'sewer',
    title: 'Sewer rehabilitation Phase 2 — 4th Cross laterals',
    status: 'upcoming',
    lineIds: ['s-lat-4c'],
    where: '4th Cross, d1–d3',
    expectedStart: '2026-10-15',
    costLakh: 148,
    ref: 'BWSSB/S3/TND/2026-27/031',
    note: 'Tender floated. Work order not yet issued.',
  },
  {
    id: 'WRK-MOCK-2409',
    network: 'water',
    title: 'New connections — Padmanabhanagar extension',
    status: 'upcoming',
    lineIds: ['w-north'],
    where: 'North distribution, b1–b4',
    expectedStart: '2026-11-03',
    costLakh: 74,
    ref: 'BWSSB/S3/TND/2026-27/038',
  },
  {
    id: 'WRK-MOCK-2415',
    network: 'power',
    title: 'Streetlight LED conversion',
    status: 'upcoming',
    lineIds: ['p-feeder-2'],
    where: 'Ring Road, b4–e4',
    expectedStart: '2026-12-01',
    costLakh: 29,
    ref: 'BESCOM/PNR/TND/2026-27/091',
  },
]

export const CLUSTERS: Cluster[] = [
  {
    id: 'CL-MOCK-01',
    network: 'sewer',
    nodeId: 'd2',
    stretch: '4th Cross, d1–d3',
    openComplaints: 11,
    reopened: 6,
    oldestDays: 165,
    // The same thread the citizen sees on the property page.
    threadIds: ['GRV-MOCK-40912'],
  },
  {
    // The finding. Sits on the 1987 trunk that falls to the kere, is the
    // most-reopened cluster in the ward, and is the one stretch no current or
    // planned work touches. Every other cluster below is covered by something.
    id: 'CL-MOCK-02',
    network: 'sewer',
    nodeId: 'c3',
    stretch: 'Sewer trunk, c3–d3 (falls to kere)',
    openComplaints: 9,
    reopened: 4,
    oldestDays: 210,
    threadIds: [],
  },
  {
    id: 'CL-MOCK-03',
    network: 'power',
    nodeId: 'b3',
    stretch: 'Feeder F-1, b2–b3',
    openComplaints: 4,
    reopened: 1,
    oldestDays: 55,
    threadIds: [],
  },
  {
    id: 'CL-MOCK-04',
    network: 'water',
    nodeId: 'd3',
    stretch: '4th Cross, d3–d4',
    openComplaints: 3,
    reopened: 0,
    oldestDays: 22,
    threadIds: [],
  },
]

export const COVERAGE_GAPS: CoverageGap[] = [
  {
    id: 'GAP-MOCK-01',
    nodeId: 'c1',
    stretch: 'West block, c1–d1',
    unassessedConnections: 34,
    estAnnualRevenueLakh: 11.9,
  },
  {
    id: 'GAP-MOCK-02',
    nodeId: 'e3',
    stretch: 'Kere-side layout, e3–e4',
    unassessedConnections: 61,
    estAnnualRevenueLakh: 18.4,
  },
  {
    id: 'GAP-MOCK-03',
    nodeId: 'a3',
    stretch: 'North extension, a3–b3',
    unassessedConnections: 19,
    estAnnualRevenueLakh: 6.2,
  },
]

/* --- derived --------------------------------------------------------------- */

/** Which line ids have planned or running work touching them. */
export function coveredLineIds(): Set<string> {
  const s = new Set<string>()
  for (const w of WORKS) {
    if (w.status !== 'completed') w.lineIds.forEach((id) => s.add(id))
  }
  return s
}

/**
 * THE FINDING.
 *
 * A cluster sitting on a stretch that no current or planned work touches. This
 * is the one number on the screen a department cannot get today, because the
 * complaint system and the works programme are different systems that have
 * never been asked the same question.
 */
export function unplannedClusters(): Cluster[] {
  const covered = coveredLineIds()
  const lineOf = (c: Cluster) =>
    LINES.filter(
      (l) => l.network === c.network && l.path.includes(c.nodeId),
    )
  return CLUSTERS.filter((c) => {
    const ls = lineOf(c)
    return ls.length > 0 && !ls.some((l) => covered.has(l.id))
  })
}

export function gapTotals() {
  return {
    connections: COVERAGE_GAPS.reduce((n, g) => n + g.unassessedConnections, 0),
    revenueLakh: COVERAGE_GAPS.reduce((n, g) => n + g.estAnnualRevenueLakh, 0),
  }
}

export function pathD(path: string[]): string {
  return path
    .map((id, i) => {
      const n = NODE_BY_ID[id]
      return `${i === 0 ? 'M' : 'L'} ${n.x} ${n.y}`
    })
    .join(' ')
}

/**
 * Networks share roads, and drawn on the centreline they land exactly on top of
 * one another — the water main was completely hidden under the LT cable. Real
 * utility drawings offset each service from the road centreline for the same
 * reason, so we do too: perpendicular offset at every vertex, averaged across
 * the two adjacent segments so corners stay closed.
 */
const NETWORK_OFFSET: Record<Network, number> = {
  water: -4,
  sewer: 0,
  power: 4,
}

function unitNormal(a: Node, b: Node): [number, number] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return [-dy / len, dx / len]
}

export function offsetPathD(path: string[], network: Network): string {
  const offset = NETWORK_OFFSET[network]
  const pts = path.map((id) => NODE_BY_ID[id])
  if (offset === 0 || pts.length < 2) return pathD(path)

  return pts
    .map((p, i) => {
      const normals: [number, number][] = []
      if (pts[i - 1]) normals.push(unitNormal(pts[i - 1], p))
      if (pts[i + 1]) normals.push(unitNormal(p, pts[i + 1]))
      const nx = normals.reduce((n, v) => n + v[0], 0)
      const ny = normals.reduce((n, v) => n + v[1], 0)
      const len = Math.hypot(nx, ny) || 1
      const x = p.x + (nx / len) * offset
      const y = p.y + (ny / len) * offset
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}
