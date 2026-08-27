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
  const ref = (id: string) =>
    property.bindings.find((b) => b.serviceId === id)?.accountRef ?? '—'

  const rows = [
    {
      who: 'Sub-registrar',
      calls: 'Document number',
      value: property.registrationDocNo,
      same: false,
    },
    {
      who: 'BBMP Revenue',
      calls: 'SAS Application Number',
      value: ref('bbmp-tax'),
      same: false,
    },
    {
      who: 'BESCOM',
      calls: 'RR Number',
      value: ref('bescom'),
      same: false,
    },
    {
      who: 'BWSSB',
      calls: 'RR Number',
      value: ref('bwssb'),
      same: false,
    },
    {
      // The exception, and it is worth the extra row. Four of these five
      // cannot be derived from each other; the fifth is simply the second one
      // again, because BBMP's waste wing bills on its revenue wing's number.
      // Seeing the same string twice is the argument: where a key is already
      // shared, the transfer problem does not exist.
      who: 'BBMP Solid Waste',
      calls: 'the same SAS number',
      value: ref('bbmp-swm'),
      same: true,
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
          <span className="key-val" style={r.same ? { opacity: 0.65 } : undefined}>
            <Mock what="Mock identifier">{r.value}</Mock>
          </span>
          {r.same && (
            <span className="xs muted">
              Not a fifth key. The second one again.
            </span>
          )}
        </div>
      ))}

      <p className="keys-foot">
        No two of the first four can be derived from another. There is no shared
        key — so today, you are the shared key: you carry the document from
        counter to counter and prove the same fact four times.
        <br />
        <br />
        The fifth row is the control. BBMP&rsquo;s waste wing bills the SWM user
        fee on its revenue wing&rsquo;s number, so it is not a separate key at
        all — and that leg of a handover needs no application, no bond and no
        counter. Nobody built an integration to achieve that. They just used
        the same number.
      </p>
    </section>
  )
}
