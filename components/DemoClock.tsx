'use client'

import { nowWithOffset, type Ledger } from '@/lib/ledger'

/**
 * A reviewer has two minutes and cannot wait seven working days to see what
 * happens when a department misses its guarantee. So we let them move the
 * clock instead of faking a breached state and hoping nobody asks.
 *
 * It shifts the *reading* of now. Stored timestamps are never rewritten, so
 * the countdown arithmetic on screen is the same arithmetic that would run in
 * production — which is the part worth demonstrating.
 */
export function DemoClock({
  ledger,
  update,
}: {
  ledger: Ledger
  update: (l: Ledger) => void
}) {
  const offset = ledger.demoClockOffsetDays
  const now = nowWithOffset(ledger)

  return (
    <section className="card card-pad stack stack-3" style={{ background: '#f3f2ef' }}>
      <div className="stack stack-2">
        <div className="eyebrow">Reviewer control — move the clock</div>
        <p className="xs muted">
          Sakala counts working days, so the countdowns above only move on
          weekdays. Push the date forward to watch a guarantee lapse and the
          compensation claim appear.
        </p>
      </div>

      <div className="row wrap" style={{ gap: 'var(--sp-2)' }}>
        {[1, 3, 7, 14].map((d) => (
          <button
            key={d}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => update({ ...ledger, demoClockOffsetDays: offset + d })}
          >
            +{d}d
          </button>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => update({ ...ledger, demoClockOffsetDays: 0 })}
          disabled={offset === 0}
        >
          Reset
        </button>
      </div>

      <p className="xs muted tnum">
        Showing{' '}
        <strong>
          {now.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
          })}
        </strong>
        {offset > 0 && ` — ${offset} day${offset === 1 ? '' : 's'} ahead of today`}
      </p>
    </section>
  )
}
