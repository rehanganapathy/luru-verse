'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CLUSTERS,
  COVERAGE_GAPS,
  LINES,
  NETWORKS,
  WARD,
  WORKS,
  gapTotals,
  unplannedClusters,
  type Network,
  type WorkStatus,
} from '@/lib/dept'
import { WardMap } from './WardMap'
import { Mock, Pill } from './ui'

const STATUS_LABEL: Record<WorkStatus, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  upcoming: 'Upcoming',
}

export function DeptView() {
  const [active, setActive] = useState<Record<Network, boolean>>({
    water: true,
    sewer: true,
    power: true,
  })
  const [showWorks, setShowWorks] = useState(true)
  const [showClusters, setShowClusters] = useState(true)
  const [showGaps, setShowGaps] = useState(false)
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null)
  const [filter, setFilter] = useState<WorkStatus | 'all'>('all')

  const unplanned = unplannedClusters()
  const gaps = gapTotals()
  const selected = WORKS.find((w) => w.id === selectedWorkId) ?? null

  const works = WORKS.filter((w) => filter === 'all' || w.status === filter)
  const openTotal = CLUSTERS.reduce((n, c) => n + c.openComplaints, 0)
  const reopenTotal = CLUSTERS.reduce((n, c) => n + c.reopened, 0)

  return (
    <div className="stack stack-6">
      <section className="stack stack-3">
        <div className="eyebrow">Department view · {NETWORKS.water.owner} / {NETWORKS.power.owner}</div>
        <h1 className="display-lg">
          <Mock what="Mock ward">{WARD.name}</Mock>
          <br />
          Ward {WARD.number}
        </h1>
        <p className="ink2">
          The citizen side of this app is keyed on one property. This side is
          keyed on the infrastructure — which pipe runs where, what has been
          complained about on it, and what work is planned. The two share one
          record: the grievance threads.
        </p>
      </section>

      {/* The privacy statement goes first, not in a footer. On a screen like
          this it is the load-bearing claim. */}
      <section className="notice stack stack-2">
        <strong className="small">This screen cannot name anyone.</strong>
        <p className="small">
          There is no owner name on this page, no property list, and no filter
          that would produce one. Coverage gaps are reported as counts on a
          stretch of road. A department gets the gap; finding the household
          behind it stays the department&rsquo;s own job, through its own due
          process — which is exactly where that step belongs.{' '}
          <Link href="/transparency#dept">Why we drew the line there →</Link>
        </p>
      </section>

      {/* --- the finding ---------------------------------------------------- */}
      {unplanned.length > 0 && (
        <section className="finding stack stack-3">
          <div className="stack stack-2">
            <span className="eyebrow" style={{ color: 'var(--breach)' }}>
              Needs a decision
            </span>
            <h2 className="display">
              {unplanned.length} stretch{unplanned.length === 1 ? '' : 'es'} with
              complaints and no planned work
            </h2>
          </div>
          {unplanned.map((c) => {
            const line = LINES.find(
              (l) => l.network === c.network && l.path.includes(c.nodeId),
            )
            return (
              <div key={c.id} className="stack stack-2">
                <p className="small">
                  <strong><Mock>{c.stretch}</Mock></strong> — {c.openComplaints}{' '}
                  open complaints, <strong>{c.reopened} reopened</strong>, oldest
                  is {c.oldestDays} days.
                  {line && (
                    <>
                      {' '}The line is <Mock>{line.spec}</Mock> laid in{' '}
                      <Mock>{String(line.laidYear)}</Mock> and rated{' '}
                      <strong>{line.condition}</strong>.
                    </>
                  )}{' '}
                  No current or tendered work touches it.
                </p>
              </div>
            )
          })}
          <p className="xs ink2">
            This is the one number on this screen a department cannot get today.
            The complaint system and the works programme are separate systems
            that have never been asked the same question, so a stretch can be
            the most-reopened in the ward and still be absent from the capex
            list without anyone doing anything wrong.
          </p>
        </section>
      )}

      {/* --- headline stats -------------------------------------------------- */}
      <section className="stat-row">
        <div className="stat">
          <span className="stat-num tnum"><Mock>{String(openTotal)}</Mock></span>
          <span className="xs muted">open complaints in ward</span>
        </div>
        <div className="stat">
          <span className="stat-num tnum" style={{ color: 'var(--breach)' }}>
            <Mock>{String(reopenTotal)}</Mock>
          </span>
          <span className="xs muted">of those already reopened</span>
        </div>
        <div className="stat">
          <span className="stat-num tnum">
            <Mock>{String(WORKS.filter((w) => w.status !== 'completed').length)}</Mock>
          </span>
          <span className="xs muted">works running or tendered</span>
        </div>
      </section>

      {/* --- map -------------------------------------------------------------- */}
      <section className="stack stack-3">
        <div className="section-head">
          <h2 className="h2">Network map</h2>
          {selected && (
            <button className="btn btn-sm btn-ghost" onClick={() => setSelectedWorkId(null)}>
              Clear selection
            </button>
          )}
        </div>

        <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
          {(Object.keys(NETWORKS) as Network[]).map((n) => (
            <button
              key={n}
              type="button"
              className={`toggle toggle-${n}`}
              aria-pressed={active[n]}
              onClick={() => setActive({ ...active, [n]: !active[n] })}
            >
              <span className="toggle-swatch" />
              {NETWORKS[n].label}
            </button>
          ))}
        </div>

        <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
          <button type="button" className="toggle" aria-pressed={showWorks}
                  onClick={() => setShowWorks(!showWorks)}>
            Works
          </button>
          <button type="button" className="toggle" aria-pressed={showClusters}
                  onClick={() => setShowClusters(!showClusters)}>
            Complaint clusters
          </button>
          <button type="button" className="toggle" aria-pressed={showGaps}
                  onClick={() => setShowGaps(!showGaps)}>
            Assessment gaps
          </button>
        </div>

        <WardMap
          active={active}
          showWorks={showWorks}
          showClusters={showClusters}
          showGaps={showGaps}
          selectedWorkId={selectedWorkId}
          onSelectWork={setSelectedWorkId}
        />

        {selected && (
          <div className="card card-pad stack stack-2">
            <div className="row-between">
              <h3 className="h3">{selected.title}</h3>
              <Pill tone={selected.status === 'completed' ? 'done'
                : selected.status === 'in_progress' ? 'run' : 'idle'}>
                {STATUS_LABEL[selected.status]}
              </Pill>
            </div>
            <p className="small ink2"><Mock>{selected.where}</Mock></p>
            {selected.note && <p className="small ink2">{selected.note}</p>}
            <div className="binding-meta">
              <span className="mono"><Mock>{selected.ref}</Mock></span>
              <span className="tnum">₹<Mock>{String(selected.costLakh)}</Mock> lakh</span>
            </div>
          </div>
        )}
      </section>

      {/* --- works ------------------------------------------------------------ */}
      <section className="stack stack-3">
        <div className="section-head">
          <h2 className="h2">Works</h2>
          <span className="xs muted">{works.length} shown</span>
        </div>

        <div className="seg" role="group" aria-label="Filter works by status">
          {(['all', 'completed', 'in_progress', 'upcoming'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        <div className="stack stack-2">
          {works.map((w) => {
            const clusters = CLUSTERS.filter((c) =>
              w.lineIds.some((id) => {
                const l = LINES.find((x) => x.id === id)
                return l && l.network === c.network && l.path.includes(c.nodeId)
              }),
            )
            const addressed = clusters.reduce((n, c) => n + c.openComplaints, 0)
            return (
              <article key={w.id} className={`work work-${w.status} stack stack-2`}>
                <div className="row-between">
                  <h3 className="h3">{w.title}</h3>
                  <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>
                    {NETWORKS[w.network].owner}
                  </span>
                </div>
                <p className="small ink2"><Mock>{w.where}</Mock></p>

                {/* The reason this list is on the same page as the map: a work
                    item that clears open complaints is a different thing from
                    one that does not, and today nobody can see which is which. */}
                {addressed > 0 && (
                  <p className="small" style={{ color: 'var(--run)' }}>
                    Would clear <strong>{addressed}</strong> open complaint
                    {addressed === 1 ? '' : 's'} on this stretch.
                  </p>
                )}

                <div className="binding-meta">
                  <span>{STATUS_LABEL[w.status]}</span>
                  <span>
                    {w.completedOn ? `completed ${fmt(w.completedOn)}`
                      : w.startedOn ? `started ${fmt(w.startedOn)}`
                        : `expected ${fmt(w.expectedStart!)}`}
                  </span>
                  <span className="tnum">₹<Mock>{String(w.costLakh)}</Mock> lakh</span>
                  <span className="mono"><Mock>{w.ref}</Mock></span>
                </div>
                {w.note && <p className="xs muted">{w.note}</p>}
              </article>
            )
          })}
        </div>
      </section>

      {/* --- the adoption argument -------------------------------------------- */}
      <section className="stack stack-3">
        <div className="section-head">
          <h2 className="h2">Assessment gaps</h2>
          <span className="xs muted">the revenue argument</span>
        </div>

        <p className="small ink2">
          A live utility connection at an address with no matching property tax
          assessment is, on the face of it, a missing assessment. Nobody built a
          system to find these, because finding them requires joining a BESCOM
          or BWSSB connection list to a BBMP assessment roll — and there is no
          shared key to join them on. Keying on the property produces this as a
          side effect.
        </p>

        <div className="stat-row">
          <div className="stat">
            <span className="stat-num tnum"><Mock>{String(gaps.connections)}</Mock></span>
            <span className="xs muted">connections, no matching assessment</span>
          </div>
          <div className="stat">
            <span className="stat-num tnum">
              ₹<Mock>{gaps.revenueLakh.toFixed(1)}</Mock> L
            </span>
            <span className="xs muted">est. annual tax foregone, this ward</span>
          </div>
        </div>

        <div className="stack stack-2">
          {COVERAGE_GAPS.map((g) => (
            <div key={g.id} className="card card-pad row-between">
              <div className="stack" style={{ gap: 2 }}>
                <span className="small"><Mock>{g.stretch}</Mock></span>
                <span className="xs muted">
                  <Mock>{String(g.unassessedConnections)}</Mock> connections
                </span>
              </div>
              <span className="small tnum" style={{ color: 'var(--block)' }}>
                ₹<Mock>{g.estAnnualRevenueLakh.toFixed(1)}</Mock> L
              </span>
            </div>
          ))}
        </div>

        <div className="notice">
          <strong className="small">Counts, and nothing finer.</strong>{' '}
          <span className="small">
            These rows do not expand. There is no drill-through to an address
            list, no export, and no API behind them that would return one.
            &ldquo;Show me who has power but has not paid tax&rdquo; is a
            name-and-shame query, and the structure that answers it is the same
            structure that answers far worse questions. A ward-and-stretch count
            is enough to send a surveyor. It is not enough to build a list of
            people.
          </span>
        </div>
      </section>

      <section className="stack stack-3">
        <Link className="btn btn-ghost btn-block" href="/">
          Back to the citizen view
        </Link>
      </section>
    </div>
  )
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}
