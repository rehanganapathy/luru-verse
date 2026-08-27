'use client'

import {
  CLUSTERS,
  COVERAGE_GAPS,
  LAKE,
  LINES,
  NODE_BY_ID,
  NETWORKS,
  ROADS,
  ROAD_LABELS,
  SUBSTATION,
  WORKS,
  WARD,
  coveredLineIds,
  offsetPathD,
  pathD,
  type Network,
} from '@/lib/dept'

/**
 * A schematic ward map, drawn from the network graph in lib/dept.ts.
 *
 * Deliberately not a real tile map. Three reasons, in order of how much they
 * mattered: a tile provider is an external service we would be sending ward
 * queries to, which cuts against the whole premise; the brief prohibits real
 * integrations; and a 40 KB inline SVG loads on a patchy connection where a
 * tile layer does not. The topology is what carries the meaning here — which
 * pipe runs where, and what sits on it — and topology does not need satellite
 * imagery.
 *
 * Every coordinate is invented. This is not the shape of Padmanabhanagar.
 */
export function WardMap({
  active,
  showWorks,
  showClusters,
  showGaps,
  selectedWorkId,
  onSelectWork,
}: {
  active: Record<Network, boolean>
  showWorks: boolean
  showClusters: boolean
  showGaps: boolean
  selectedWorkId: string | null
  onSelectWork: (id: string | null) => void
}) {
  const covered = coveredLineIds()
  const selected = WORKS.find((w) => w.id === selectedWorkId) ?? null
  const highlighted = new Set(selected?.lineIds ?? [])

  return (
    <div className="map-wrap">
      <svg
        viewBox="26 34 660 512"
        role="img"
        aria-label={`Schematic utility map of ${WARD.name} ward. All geometry is invented.`}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4"
                  markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill="var(--net-sewer)" opacity="0.7" />
          </marker>
        </defs>

        {/* Ground */}
        <rect x="26" y="34" width="660" height="512" fill="var(--map-ground)" />

        {/* The kere. Every sewer trunk in this city falls toward one, which is
            exactly why an unrehabilitated 1987 trunk is not only a service
            problem. */}
        <ellipse
          cx={LAKE.cx} cy={LAKE.cy} rx={LAKE.rx} ry={LAKE.ry}
          fill="var(--map-lake)" stroke="#c3d4de" strokeWidth="1"
        />
        <text x={LAKE.cx} y={LAKE.cy + 4} textAnchor="middle"
              fontSize="11" fill="#7c93a3">{LAKE.name}</text>

        {/* Streets, drawn as casing + fill so they read as roads under the
            services rather than as more lines competing with them. */}
        <g strokeLinecap="round">
          {ROADS.map(([a, b]) => {
            const na = NODE_BY_ID[a]
            const nb = NODE_BY_ID[b]
            return (
              <line key={`c-${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke="#d6d0c4" strokeWidth="15" />
            )
          })}
          {ROADS.map(([a, b]) => {
            const na = NODE_BY_ID[a]
            const nb = NODE_BY_ID[b]
            return (
              <line key={`f-${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke="#f2eee6" strokeWidth="12" />
            )
          })}
        </g>
        <g fontSize="10" fill="var(--ink-3)">
          {ROAD_LABELS.map((l) => (
            <text key={l.text} x={l.x} y={l.y} textAnchor={l.anchor}>
              {l.text}
            </text>
          ))}
        </g>

        {/* Utility lines */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {LINES.filter((l) => active[l.network]).map((l) => {
            const color = `var(${NETWORKS[l.network].colorVar})`
            const isHi = highlighted.has(l.id)
            const dim = selected !== null && !isHi
            return (
              <g key={l.id} opacity={dim ? 0.18 : 1}>
                {isHi && (
                  <path d={offsetPathD(l.path, l.network)} stroke={color}
                        strokeWidth="12" opacity="0.22" />
                )}
                <path
                  d={offsetPathD(l.path, l.network)}
                  stroke={color}
                  strokeWidth={l.condition === 'critical' ? 3.5 : 2.5}
                  /* Ageing and critical runs are drawn broken, so the eye finds
                     the old infrastructure before reading a single label. */
                  strokeDasharray={
                    l.condition === 'critical' ? '9 5'
                      : l.condition === 'ageing' ? '2 4'
                        : undefined
                  }
                  markerEnd={l.network === 'sewer' ? 'url(#arrow)' : undefined}
                >
                  <title>{`${l.label} · ${l.spec} · laid ${l.laidYear} · ${l.condition}`}</title>
                </path>
              </g>
            )
          })}
        </g>

        {/* Sub-station */}
        {active.power && (
          <g>
            <rect
              x={NODE_BY_ID[SUBSTATION.nodeId].x - 7}
              y={NODE_BY_ID[SUBSTATION.nodeId].y - 7}
              width="14" height="14" rx="2"
              fill="var(--net-power)"
            />
            <text
              x={NODE_BY_ID[SUBSTATION.nodeId].x - 12}
              y={NODE_BY_ID[SUBSTATION.nodeId].y - 12}
              textAnchor="end"
              fontSize="10" fill="var(--ink-2)"
            >
              Sub-station
            </text>
          </g>
        )}

        {/* Works */}
        {showWorks &&
          WORKS.filter((w) => active[w.network]).map((w) => {
            const line = LINES.find((l) => l.id === w.lineIds[0])
            if (!line) return null
            const mid = NODE_BY_ID[line.path[Math.floor(line.path.length / 2)]]
            const isSel = w.id === selectedWorkId
            const stroke =
              w.status === 'completed' ? 'var(--done)'
                : w.status === 'in_progress' ? 'var(--run)'
                  : 'var(--ink-3)'
            return (
              <g
                key={w.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectWork(isSel ? null : w.id)}
              >
                <circle
                  cx={mid.x} cy={mid.y} r={isSel ? 13 : 9}
                  fill={w.status === 'completed' ? stroke : 'var(--card)'}
                  stroke={stroke}
                  strokeWidth="2.5"
                  strokeDasharray={w.status === 'upcoming' ? '3 3' : undefined}
                />
                <title>{`${w.title} — ${w.status.replace('_', ' ')}`}</title>
              </g>
            )
          })}

        {/* Complaint clusters. Radius scales with volume; the ring marks the
            ones nothing is planned for. */}
        {showClusters &&
          CLUSTERS.filter((c) => active[c.network]).map((c) => {
            const n = NODE_BY_ID[c.nodeId]
            const r = 7 + Math.min(c.openComplaints, 12) * 1.1
            const lines = LINES.filter(
              (l) => l.network === c.network && l.path.includes(c.nodeId),
            )
            const unplanned = lines.length > 0 && !lines.some((l) => covered.has(l.id))
            return (
              <g key={c.id}>
                <circle
                  cx={n.x} cy={n.y} r={r}
                  fill="var(--breach)"
                  opacity={unplanned ? 0.3 : 0.16}
                />
                {unplanned && (
                  <circle
                    cx={n.x} cy={n.y} r={r + 6}
                    fill="none" stroke="var(--breach)" strokeWidth="1.75"
                    strokeDasharray="4 3"
                  />
                )}
                <text
                  x={n.x} y={n.y + 4} textAnchor="middle"
                  fontSize="11" fontWeight="700" fill="var(--breach)"
                  stroke="var(--map-ground)" strokeWidth="3"
                  paintOrder="stroke"
                >
                  {c.openComplaints}
                </text>
                <title>
                  {`${c.openComplaints} open complaints, ${c.reopened} reopened, oldest ${c.oldestDays} days — ${c.stretch}`}
                </title>
              </g>
            )
          })}

        {/* Coverage gaps — counts on a stretch, never a list of households. */}
        {showGaps &&
          COVERAGE_GAPS.map((g) => {
            const n = NODE_BY_ID[g.nodeId]
            return (
              <g key={g.id}>
                <rect
                  x={n.x - 9} y={n.y - 9} width="18" height="18" rx="3"
                  fill="var(--block-bg)" stroke="var(--block)" strokeWidth="1.75"
                />
                <text
                  x={n.x} y={n.y + 4} textAnchor="middle"
                  fontSize="10" fontWeight="700" fill="var(--block)"
                >
                  {g.unassessedConnections}
                </text>
                <title>
                  {`${g.unassessedConnections} connections with no matching tax assessment — ${g.stretch}`}
                </title>
              </g>
            )
          })}
      </svg>

      <p className="map-hint">
        Schematic, not survey geometry. Every coordinate, pipe and figure on this
        map is invented. Broken lines are ageing or critical-condition runs.
      </p>
    </div>
  )
}
