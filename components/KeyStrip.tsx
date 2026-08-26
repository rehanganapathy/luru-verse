import type { PropertyObject } from '@/lib/types'
import { Mock } from './ui'

/**
 * Four systems, four identifiers, one flat.
 *
 * The object screen used to bury these as one row among four inside each
 * binding card, which meant the reviewer had to be *told* there was no shared
 * key. Stacked, it is self-evident: nothing here can be derived from anything
 * else here. This is the problem statement, and it should be readable in about
 * a second without narration.
 */
export function KeyStrip({ property }: { property: PropertyObject }) {
  const rows = [
    {
      who: 'Sub-registrar',
      calls: 'Document number',
      value: property.registrationDocNo,
    },
    {
      who: 'BBMP',
      calls: property.bindings[0]?.accountLabel ?? 'SAS Application Number',
      value: property.bindings[0]?.accountRef ?? '—',
    },
    {
      who: 'BESCOM',
      calls: 'RR Number',
      value: property.bindings[1]?.accountRef ?? '—',
    },
    {
      who: 'BWSSB',
      calls: 'RR Number',
      value: property.bindings[2]?.accountRef ?? '—',
    },
  ]

  return (
    <section className="keys" aria-labelledby="keys-head">
      <div className="keys-head">
        <h2 id="keys-head" className="eyebrow" style={{ marginBottom: 2 }}>
          The same flat, four names for it
        </h2>
        <p className="xs muted">Held by four systems that cannot see each other.</p>
      </div>

      {rows.map((r) => (
        <div key={r.who} className="key-row">
          <div className="key-who">
            <strong>{r.who}</strong> calls it {r.calls}
          </div>
          <span className="key-val">
            <Mock what="Mock identifier">{r.value}</Mock>
          </span>
        </div>
      ))}

      <p className="keys-foot">
        No two of these can be derived from another. There is no shared key — so
        today, you are the shared key. You carry the document from counter to
        counter and prove the same fact four times.
      </p>
    </section>
  )
}
