'use client'

/**
 * COLLECTION. The recurring-service screen.
 *
 * Everything else in this app measures a one-off: an application was filed on
 * Tuesday, a statute says seven working days, here is the countdown. Garbage
 * has no application and no deadline. It has a round that either arrives or
 * does not, twice a week, forever.
 *
 * So the instrument is different — a log rather than a clock — and so is the
 * shape of the screen. It is ordered the way the question actually arrives in
 * someone's head:
 *
 *   1. Is something wrong?          one line, before any scrolling
 *   2. What about today?            the only thing they can act on now
 *   3. Show me.                     three weeks of evidence
 *   4. So what?                     the fee, against the service
 *   5. Do something about it.       one button, when the pattern earns it
 *
 * The beat roster, the route code and the contractor are reference material.
 * They open the file on a department screen; on a citizen screen they are the
 * last thing, behind a disclosure, because nobody has ever wanted to know
 * their beat code before knowing whether the bin was emptied.
 *
 * THE LINE WE DO NOT CROSS: this app cannot observe a tipper. Every mark the
 * citizen makes is stored and displayed as their assertion, never merged into
 * the department's record. A civic tool that quietly promotes a tap into
 * evidence is worse than no tool.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { GrievanceThread, PropertyObject } from '@/lib/types'
import { rupees } from '@/lib/format'
import {
  addDays,
  beatFeeAtStakePaise,
  buildLog,
  chunkWeeks,
  dayLabel,
  ESCALATION_STREAK,
  escalating,
  feeAtStakePaise,
  inWeeks,
  istKey,
  upcoming,
  outageDays,
  perCollectionPaise,
  STREAMS,
  STREAM_ORDER,
  summarise,
  weekdayName,
  windowOf,
  type Beat,
  type Entry,
  type StreamSummary,
  type WasteStream,
} from '@/lib/swm'
import {
  collectionReports,
  EMPTY_LEDGER,
  forProperty,
  nowWithOffset,
  readLedger,
  withProperty,
  writeLedger,
  type Ledger,
} from '@/lib/ledger'
import { Mock, Pill } from './ui'

const WINDOW_DAYS = 21

type Tone = 'run' | 'block' | 'breach' | 'done' | 'idle'

export function GarbageTracker({
  property,
  beat,
  seeded,
}: {
  property: PropertyObject
  beat: Beat
  seeded: GrievanceThread[]
}) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  const [hydrated, setHydrated] = useState(false)
  const [justFiled, setJustFiled] = useState<string | null>(null)

  useEffect(() => {
    setLedger(readLedger())
    setHydrated(true)
  }, [])

  const mine = forProperty(ledger, property.ePID)
  const reports = collectionReports(mine)
  const now = nowWithOffset(ledger)

  const entries = useMemo(
    () => buildLog(beat, now, WINDOW_DAYS, reports),
    // now is a fresh Date on every render; key on the offset instead so this
    // recomputes when something actually changed and not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beat, ledger.demoClockOffsetDays, reports.length],
  )
  const days = useMemo(
    () => windowOf(now, WINDOW_DAYS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger.demoClockOffsetDays],
  )

  const summaries = STREAM_ORDER.map((s) => summarise(entries, s))
  const needsEscalation = escalating(summaries)
  const totalMissed = summaries.reduce((n, s) => n + s.missed, 0)
  const totalScheduled = summaries.reduce((n, s) => n + s.scheduled, 0)

  function update(next: Ledger) {
    setLedger(next)
    writeLedger(next)
  }

  function toggleReport(dateKey: string, stream: WasteStream) {
    const existing = reports.find(
      (r) => r.dateKey === dateKey && r.stream === stream,
    )
    const next = existing
      ? reports.filter((r) => !(r.dateKey === dateKey && r.stream === stream))
      : [...reports, { dateKey, stream, at: new Date().toISOString() }]
    update(
      withProperty(ledger, property.ePID, { ...mine, collectionReports: next }),
    )
  }

  /**
   * Escalation. The whole reason for counting.
   *
   * It appends to the thread that already exists on this property rather than
   * opening a fresh one — including a thread the PREVIOUS owner opened. That
   * is the append-only rule from the grievance tab holding under pressure: a
   * complaint running since May does not become a new complaint because a
   * different person is now typing.
   */
  function escalate(s: StreamSummary) {
    const openThread =
      mine.grievances.find(
        (g) =>
          g.propertyEPID === property.ePID && g.raisedAgainst.includes('bbmp-swm'),
      ) ??
      seeded.find(
        (g) =>
          g.propertyEPID === property.ePID && g.raisedAgainst.includes('bbmp-swm'),
      )

    const byMe = entries.filter(
      (e) => e.stream === s.stream && e.state === 'missed' && e.source === 'you',
    ).length
    const outage = outageDays(beat, s.stream)
    const stake = feeAtStakePaise(beat, s.missed)
    const swmRef =
      property.bindings.find((b) => b.serviceId === 'bbmp-swm')?.accountRef ?? '—'

    const text = [
      `${STREAMS[s.stream].label} has not been collected at this address for ${s.streak} scheduled rounds in a row.`,
      outage !== null
        ? `The round has not arrived here for ${outage} days — ${inWeeks(outage)}.`
        : s.lastCollectedDaysAgo === null
          ? `There is no collection on record in the last ${WINDOW_DAYS} days.`
          : `Last collection was ${s.lastCollectedDaysAgo} days ago.`,
      `Beat ${beat.beatCode}, route ${beat.routeCode}, ${beat.households} households.`,
      `The SWM user fee of ${rupees(beat.monthlyUserFeePaise)} a month is being billed on SAS ${swmRef}. Against the schedule, ${rupees(stake)} of collections were charged for and not delivered in this window.`,
      byMe > 0
        ? `${byMe} of these ${s.missed} non-collections are my own observations; the rest are already in the department's record.`
        : `All of these are already in the department's own record.`,
      'This is a round that is not arriving. It is not a household failing to hand over waste.',
    ].join(' ')

    const at = new Date().toISOString()
    const event = {
      at,
      kind: openThread ? ('refiled' as const) : ('filed' as const),
      text,
      by: 'You · from the collection log',
    }

    const thread: GrievanceThread = openThread
      ? { ...openThread, events: [...openThread.events, event] }
      : {
          id: `GRV-${Date.now().toString().slice(-8)}`,
          propertyEPID: property.ePID,
          raisedAgainst: ['bbmp-swm'],
          category: `${STREAMS[s.stream].label} not collected`,
          openedAt: at,
          raisedByRole: 'current_owner',
          events: [
            event,
            {
              at,
              kind: 'routed' as const,
              text: `Routed to BBMP Solid Waste Management — ${beat.responsible}.`,
              by: 'Collection log',
            },
          ],
        }

    update(
      withProperty(ledger, property.ePID, {
        ...mine,
        grievances: mine.grievances.some((g) => g.id === thread.id)
          ? mine.grievances.map((g) => (g.id === thread.id ? thread : g))
          : [thread, ...mine.grievances],
      }),
    )
    setJustFiled(thread.id)
  }

  if (!hydrated) return <p className="muted small">Reading your device…</p>

  return (
    <div className="stack stack-5">
      <div className="stack stack-2">
        <div className="eyebrow">Garbage collection</div>
        <h1 className="display">Did the tipper come?</h1>
        <p className="ink2 small">
          The other three departments on this property are a one-off problem: a
          name has to move, once. This one is not. There is nothing to transfer
          and nothing to file — only a round that arrives or does not, every
          week, and a fee that is charged either way.
        </p>
      </div>

      {/* 1. THE ANSWER. Before any scrolling, on any screen. Every other page
             in this app opens with its state in one line and this one should
             not be the exception. */}
      <Status
        summaries={summaries}
        beat={beat}
        totalMissed={totalMissed}
        totalScheduled={totalScheduled}
      />

      {/* 2. WHAT YOU CAN ACT ON NOW. */}
      <Today entries={entries} beat={beat} now={now} onToggle={toggleReport} />

      {/* 3. THE EVIDENCE. */}
      <section className="stack stack-3">
        <div className="section-head">
          <h2 className="h2">The last three weeks</h2>
          <span className="xs muted tnum">
            {totalScheduled - totalMissed} of {totalScheduled} collected
          </span>
        </div>

        {STREAM_ORDER.map((stream) => (
          <StreamRow
            key={stream}
            stream={stream}
            days={days}
            entries={entries.filter((e) => e.stream === stream)}
            summary={summaries.find((s) => s.stream === stream)!}
          />
        ))}

        <Legend hasMine={entries.some((e) => e.source === 'you')} />
      </section>

      {/* 4. THE CONSEQUENCE, when there is one. A streak has earned a louder
             treatment than a scatter; a scatter has earned none. */}
      {needsEscalation.map((s) => (
        <Finding
          key={s.stream}
          summary={s}
          beat={beat}
          filed={Boolean(justFiled)}
          epid={property.ePID}
          onEscalate={() => escalate(s)}
        />
      ))}

      {totalMissed > 0 && (
        <Money beat={beat} missed={totalMissed} scheduled={totalScheduled} />
      )}

      {/* 5. REFERENCE. Last, because it is reference. */}
      <details className="card card-pad">
        <summary className="h3" style={{ cursor: 'pointer' }}>
          Who collects here, and what you pay
        </summary>
        <div className="stack stack-3" style={{ marginTop: 'var(--sp-3)' }}>
          <dl className="respons">
            <dt>Beat</dt>
            <dd className="mono">
              <Mock>{beat.beatCode}</Mock>
            </dd>
            <dt>Route</dt>
            <dd className="mono">
              <Mock>{beat.routeCode}</Mock>
            </dd>
            <dt>With</dt>
            <dd>
              <Mock>{beat.responsible}</Mock>
            </dd>
            <dt>Covers</dt>
            <dd className="tnum">
              <Mock what="Mock household count">{beat.households}</Mock>{' '}
              households
            </dd>
            <dt>Fee</dt>
            <dd className="tnum">
              <Mock what="Mock amount">{rupees(beat.monthlyUserFeePaise)}</Mock>{' '}
              a month
            </dd>
          </dl>
          <p className="xs muted">
            The fee is raised on the property tax demand, against the same SAS
            number BBMP&rsquo;s revenue wing uses. That shared key is the whole
            reason this leg of a handover needs no application, no bond and no
            counter — and the reason it is the one leg nobody had to build
            anything to fix.
          </p>
        </div>
      </details>

      <section className="notice stack stack-2">
        <strong className="small">Who says a collection happened</strong>
        <p className="small">
          This app cannot watch a tipper. Every collected mark above is the
          department&rsquo;s own seeded record; every mark you add is stored as
          your observation, on your device, and stays labelled as yours
          wherever it appears — including in anything filed from this screen.
          BBMP&rsquo;s tippers already carry GPS and its transfer stations
          already weigh loads, so the department can verify this properly and we
          can point at the gap. Dressing a tap up as a measurement would be
          worse than not measuring.
        </p>
      </section>

      <Link
        className="btn btn-ghost btn-block"
        href={`/property/${encodeURIComponent(property.ePID)}/grievance`}
      >
        Raise something else on this property
      </Link>
    </div>
  )
}

/* --- 1. the answer -------------------------------------------------------- */

function Status({
  summaries,
  beat,
  totalMissed,
  totalScheduled,
}: {
  summaries: StreamSummary[]
  beat: Beat
  totalMissed: number
  totalScheduled: number
}) {
  const worst = escalating(summaries)[0]
  const outage = worst ? outageDays(beat, worst.stream) : null

  if (worst) {
    return (
      <section className="card card-pad stack stack-2">
        <span className="eyebrow">Right now</span>
        <span className="headline headline-breach">
          {STREAMS[worst.stream].label} is not being collected
        </span>
        <span className="small ink2">
          {outage !== null
            ? `The round has not arrived on this street for ${inWeeks(outage)}.`
            : `${worst.streak} scheduled rounds missed in a row.`}{' '}
          The other two streams are running.
        </span>
      </section>
    )
  }

  if (totalMissed > 0) {
    return (
      <section className="card card-pad stack stack-2">
        <span className="eyebrow">Right now</span>
        <span className="headline headline-warn tnum">
          {totalMissed} missed in three weeks
        </span>
        <span className="small ink2">
          Out of {totalScheduled} scheduled collections. Days get missed;
          nothing here has become a pattern, and we are not going to call it one
          to look useful.
        </span>
      </section>
    )
  }

  return (
    <section className="card card-pad stack stack-2">
      <span className="eyebrow">Right now</span>
      <span className="headline">Everything collected</span>
      <span className="small ink2">
        All {totalScheduled} scheduled collections in the last three weeks
        happened. This is what it looks like when it works.
      </span>
    </section>
  )
}

/* --- 2. today ------------------------------------------------------------- */

function Today({
  entries,
  beat,
  now,
  onToggle,
}: {
  entries: Entry[]
  beat: Beat
  now: Date
  onToggle: (dateKey: string, stream: WasteStream) => void
}) {
  const todayKey = istKey(now)
  const yesterdayKey = istKey(addDays(now, -1))
  // Today first. The list is built oldest-to-newest and reading it back in that
  // order would put yesterday above today, which is the wrong end of the
  // question.
  const rows = [
    ...entries.filter((e) => e.dateKey === todayKey),
    ...entries.filter((e) => e.dateKey === yesterdayKey),
  ]
  const next = upcoming(beat, now)

  return (
    <section className="card card-pad stack stack-3">
      <div className="row-between">
        <span className="eyebrow">Today &amp; yesterday</span>
        <span className="xs muted">{dayLabel(now)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="small ink2">
          Nothing was scheduled for collection today or yesterday.
        </p>
      ) : (
        <div className="stack">
          {rows.map((e) => (
            <AssertRow
              key={`${e.dateKey}-${e.stream}`}
              entry={e}
              when={e.dateKey === todayKey ? 'today' : 'yesterday'}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {next.length > 0 && (
        <p className="xs muted">
          Coming up:{' '}
          {next.map((n, i) => (
            <span key={n.stream}>
              {i > 0 ? ', ' : ''}
              {STREAMS[n.stream].label.toLowerCase()}{' '}
              <Mock what="Mock schedule">
                {n.inDays === 1 ? 'tomorrow' : `on ${weekdayName(n.date)}`}
              </Mock>
            </span>
          ))}
          . Wet waste is every day but Sunday.
        </p>
      )}

      <p className="xs muted">
        You can mark today and yesterday. Further back is not offered because it
        is not reliable — nobody remembers whether the tipper came eleven days
        ago, and a log full of half-remembered days is worse than a short one.
      </p>
    </section>
  )
}

/**
 * One assertable row.
 *
 * The department's record is shown as a pill; the thing you can do about it is
 * shown as a button. Making those two look alike is how an interface ends up
 * telling somebody they did something they only read.
 */
function AssertRow({
  entry,
  when,
  onToggle,
}: {
  entry: Entry
  when: 'today' | 'yesterday'
  onToggle: (dateKey: string, stream: WasteStream) => void
}) {
  const mine = entry.source === 'you' && entry.state === 'missed'
  const deptMissed = entry.state === 'missed' && entry.source === 'department'

  return (
    <div className={`assert${mine ? ' assert-mine' : ''}`}>
      <div className="stack grow" style={{ gap: 2 }}>
        <span className="small" style={{ fontWeight: 500 }}>
          {STREAMS[entry.stream].label}
          <span className="xs muted"> · {when}</span>
        </span>
        <span className="xs muted">
          {mine
            ? 'Marked by you. Held on this device only.'
            : deptMissed
              ? 'Recorded as not collected'
              : entry.state === 'due'
                ? 'Scheduled. Not yet known.'
                : 'Recorded as collected'}
        </span>
      </div>

      {deptMissed ? (
        <Pill tone="breach">Missed</Pill>
      ) : (
        <button
          className={`btn btn-sm ${mine ? 'btn-ghost' : 'btn-ghost'}`}
          type="button"
          onClick={() => onToggle(entry.dateKey, entry.stream)}
        >
          {mine ? 'Undo' : 'Didn’t come'}
        </button>
      )}
    </div>
  )
}

/* --- 3. the evidence ------------------------------------------------------ */

function StreamRow({
  stream,
  days,
  entries,
  summary,
}: {
  stream: WasteStream
  days: Array<{ dateKey: string; daysAgo: number }>
  entries: Entry[]
  summary: StreamSummary
}) {
  const byDate = new Map(entries.map((e) => [e.dateKey, e]))
  const bad = summary.streak >= ESCALATION_STREAK
  // Same rail the handover tracks use. A stream in trouble should look like a
  // track in trouble, because to the person reading it, it is one.
  const tone: Tone = bad ? 'breach' : summary.missed > 0 ? 'block' : 'idle'
  const weeks = chunkWeeks(days)

  return (
    <article
      className={`track${tone === 'idle' ? '' : ` track-${tone}`} stack stack-3`}
    >
      <div className="row-between">
        <div className="stack grow" style={{ gap: 2 }}>
          <h3 className="h3">{STREAMS[stream].label}</h3>
          <span className="xs muted">{STREAMS[stream].note}</span>
        </div>
        {summary.missed === 0 ? (
          <Pill tone="done">All collected</Pill>
        ) : bad ? (
          <Pill tone="breach">{summary.streak} in a row</Pill>
        ) : (
          <Pill tone="block">{summary.missed} missed</Pill>
        )}
      </div>

      <div
        className="cal"
        role="img"
        aria-label={`${STREAMS[stream].label}, last ${WINDOW_DAYS} days: ${summary.collected} collected, ${summary.missed} missed.`}
      >
        {weeks.map((week, wi) => (
          <div className="cal-week" key={wi}>
            {week.map((d, di) => {
              // Stagger left-to-right across the whole three weeks, not per
              // group, so the log reads as one timeline arriving.
              const idx = wi * 7 + di
              const e = byDate.get(d.dateKey)
              if (!e) {
                return (
                  <span
                    key={d.dateKey}
                    className="cal-cell cal-off"
                    style={{ ['--i' as string]: idx }}
                    title={`${d.dateKey} — not scheduled`}
                  />
                )
              }
              return (
                <span
                  key={d.dateKey}
                  className={`cal-cell cal-${e.state}${e.source === 'you' && e.state === 'missed' ? ' cal-mine' : ''}`}
                  style={{ ['--i' as string]: idx }}
                  title={`${d.dateKey} — ${
                    e.state === 'due'
                      ? 'scheduled, not yet known'
                      : e.state === 'missed'
                        ? e.source === 'you'
                          ? 'not collected (your mark)'
                          : 'not collected'
                        : 'collected'
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <p className="xs muted">
        {summary.lastCollectedDaysAgo === null
          ? `Nothing collected in ${WINDOW_DAYS} days.`
          : summary.lastCollectedDaysAgo === 0
            ? 'Collected today.'
            : `Last collected ${summary.lastCollectedDaysAgo} day${summary.lastCollectedDaysAgo === 1 ? '' : 's'} ago.`}{' '}
        {summary.scheduled} scheduled in this window.
      </p>
    </article>
  )
}

function Legend({ hasMine }: { hasMine: boolean }) {
  return (
    <div className="stack stack-2">
      <div className="cal-legend" aria-hidden="true">
        <span>
          <i className="cal-key cal-collected" /> collected
        </span>
        <span>
          <i className="cal-key cal-missed" /> not collected
        </span>
        {hasMine && (
          <span>
            <i className="cal-key cal-mine" /> your mark
          </span>
        )}
        <span>
          <i className="cal-key cal-due" /> due today
        </span>
        <span>
          <i className="cal-key cal-off" style={{ background: '#f0f3f0' }} /> not
          scheduled
        </span>
      </div>
      <p className="xs muted">
        One square per day, oldest on the left, in weeks of seven. Every stream
        is drawn against the same days, so a column reads straight down.
      </p>
    </div>
  )
}

/* --- 4. the consequence --------------------------------------------------- */

function Finding({
  summary,
  beat,
  filed,
  epid,
  onEscalate,
}: {
  summary: StreamSummary
  beat: Beat
  filed: boolean
  epid: string
  onEscalate: () => void
}) {
  const outage = outageDays(beat, summary.stream)

  return (
    <section className="finding stack stack-3">
      <div className="stack stack-2">
        <span className="xs" style={{ fontWeight: 600, color: 'var(--breach)' }}>
          This is not a late tipper
        </span>
        <h2 className="h2">
          {STREAMS[summary.stream].label}: {summary.streak} rounds missed in a
          row
        </h2>
        <p className="small">
          {outage !== null
            ? `The round has not arrived on this street for ${inWeeks(outage)}.`
            : summary.lastCollectedDaysAgo === null
              ? `Nothing collected in the last ${WINDOW_DAYS} days.`
              : `Last collected ${summary.lastCollectedDaysAgo} days ago.`}{' '}
          {beat.chronic?.stream === summary.stream && (
            <>
              The department&rsquo;s own record gives a reason:{' '}
              <Mock what="Mock departmental note">{beat.chronic.reason}</Mock>
            </>
          )}
        </p>
        <p className="small">
          The waste did not stop being generated. It went somewhere, and
          wherever it went is now a black spot that reads as indiscipline —
          which is what the complaint on this property has been answered as
          three times.
        </p>
      </div>

      {filed ? (
        <div className="stack stack-2">
          <p className="small">
            <strong>Added to the thread.</strong> It kept its original date, so
            nothing about how long this has been running was reset.
          </p>
          <Link
            className="btn btn-sm btn-ghost"
            href={`/property/${encodeURIComponent(epid)}/grievance`}
          >
            See the thread
          </Link>
        </div>
      ) : (
        <button className="btn btn-sm btn-breach" type="button" onClick={onEscalate}>
          Raise this with the ward office
        </button>
      )}
    </section>
  )
}

function Money({
  beat,
  missed,
  scheduled,
}: {
  beat: Beat
  missed: number
  scheduled: number
}) {
  return (
    <section className="stack stack-3">
      <div className="section-head">
        <h2 className="h2">Charged against delivered</h2>
      </div>

      {/* The dept view's stat pattern, because this is the same kind of claim:
          three numbers that only mean something standing next to each other. */}
      <div className="stat-row">
        <div className="stat">
          <span className="xs muted">User fee</span>
          <span className="stat-num tnum">
            <Mock what="Mock amount">{rupees(beat.monthlyUserFeePaise)}</Mock>
          </span>
          <span className="xs muted">a month, on the tax demand</span>
        </div>
        <div className="stat">
          <span className="xs muted">Not delivered</span>
          <span className="stat-num tnum">
            {missed}/{scheduled}
          </span>
          <span className="xs muted">scheduled collections, 21 days</span>
        </div>
        <div className="stat">
          <span className="xs muted">Your share</span>
          <span className="stat-num tnum" style={{ color: 'var(--block)' }}>
            <Mock what="Mock amount">{rupees(feeAtStakePaise(beat, missed))}</Mock>
          </span>
          <span className="xs muted">
            at {rupees(perCollectionPaise(beat))} a collection
          </span>
        </div>
      </div>

      <p className="small ink2">
        Your share of a missed round is small enough to shrug at, and that is
        why nobody has ever added it up. The round is not collected household by
        household, though — it either comes down the street or it does not.
        Across the{' '}
        <Mock what="Mock household count">{beat.households}</Mock> households on
        this beat, the same {missed} missed collections are{' '}
        <strong className="tnum">
          <Mock what="Mock amount">
            {rupees(beatFeeAtStakePaise(beat, missed))}
          </Mock>
        </strong>{' '}
        of user fee charged for a service that did not arrive. That is a count
        on a beat, not a list of anyone.
      </p>

      <details>
        <summary className="xs muted" style={{ cursor: 'pointer' }}>
          Is this money I can claim back?
        </summary>
        <p className="xs muted" style={{ marginTop: 'var(--sp-2)' }}>
          No, and we are not going to imply otherwise. There is no rebate
          provision for non-collection the way s.5 of the Sakala Act gives you a
          real entitlement for a missed guarantee — that is why the handover
          tracks carry a claim button and this screen does not. What this figure
          is: your complaint expressed as arithmetic, so that &ldquo;they keep
          skipping our street&rdquo; reaches the ward office as a number
          somebody has to answer rather than as a mood.
        </p>
      </details>
    </section>
  )
}
