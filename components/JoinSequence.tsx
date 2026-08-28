'use client'

import { useEffect, useRef, useState } from 'react'
import { Mock } from '@/components/ui'

/* THE JOIN, FAILING.
   ---------------------------------------------------------------------------
   This band used to be a static row of four identifiers under the heading "No
   two of these can be derived from another". The row was correct and nobody
   read it: it sat two folds down, and the one fact the whole product rests on
   was being asserted in a caption.

   So it is staged instead. Five beats, scrubbed by scroll:

     0  one flat
     1  four registers, four different numbers for it
     2  the joins that do not exist — each attempt draws and snaps back
     3  so the citizen carries the same deed to all four counters
     4  key on the property instead, and the four collapse into one object

   Nothing here is new information. Beat 4 is the thesis and beats 0-3 are the
   reason it is not obvious. The band is dark because it is continuous with the
   hero photograph above it — one dark statement, then paper arrives with the
   first thing you can actually do.

   WHY NOT CSS SCROLL-DRIVEN ANIMATION. `animation-timeline: view()` would
   express this in stylesheet alone and run off the main thread, and the hero
   media comment already records that a scroll-timeline approach was tried here
   and pulled for being Chromium-only. A judge opening the link on Safari is
   the case that matters most, so this stays on a scroll listener.

   WHY DISCRETE BEATS AND NOT A CONTINUOUS SCRUB. Interpolating every property
   against scroll offset means recomputing styles on every frame and writing
   the easing by hand. Snapping to a beat and letting CSS transition between
   beats gives the motion one easing curve — the product's own --ease — for
   free, costs one class change per beat instead of work per frame, and means
   `prefers-reduced-motion`'s blanket duration override lands on it correctly
   without a second code path. */

type Key = {
  who: string
  val: string
  what: string
  /** Where the register sits on the stage, in percent of the stage box. */
  x: number
  y: number
  /**
   * And where it sits once the stage is too narrow for four corners. Carried
   * as data rather than as a run of :nth-of-type() rules in the media query,
   * because the keys are not the only divs in the stage box — :nth-of-type
   * counts siblings of the same element type, so the flat's div shifts every
   * key by one and the whole stack silently lands on the wrong rows.
   */
  narrowY: number
}

/* The same four values the static row carried, plus a position. Order is
   clockwise from top left so the deed's walk in beat 3 traces a ring rather
   than crossing itself. */
const KEYS: Key[] = [
  { who: 'Sub-registrar', val: 'JYN-1-04412-2024-25', what: 'Registration document', x: 18, y: 22, narrowY: 36 },
  { who: 'BBMP', val: '2024-25-MOCK-88412', what: 'Property tax ePID', x: 82, y: 22, narrowY: 54 },
  { who: 'BESCOM', val: 'M7-MOCK-441209', what: 'Electricity RR number', x: 82, y: 78, narrowY: 72 },
  { who: 'BWSSB', val: '0084-MOCK-11207', what: 'Water RR number', x: 18, y: 78, narrowY: 90 },
]

/* The joins nobody can make. Each pair is two registers that hold the same
   flat and cannot recognise one another; the line between them draws, stalls
   and retracts. Four attempts around the ring, so every register is shown
   failing against a neighbour rather than one being singled out. */
const ATTEMPTS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
]

const CAPTIONS = [
  { lead: 'One flat.', body: 'A two-bedroom in Banashankari. One address, one gate, one thing that exists.' },
  { lead: 'Four registers hold it.', body: 'Each one issued its own number, at its own counter, on its own day.' },
  { lead: 'No two can be derived from another.', body: 'There is no shared key. No register can look at its own number and work out any of the other three.' },
  { lead: 'So you are the shared key.', body: 'You carry the same deed to four counters and prove the same fact four times, because you are the only join that exists.' },
  { lead: 'Key on the property, not the person.', body: 'The four numbers stop being four records. They become bindings on one object — and the object is what moves when the flat changes hands.' },
]

const BEATS = CAPTIONS.length

export function JoinSequence() {
  const scrollerRef = useRef<HTMLElement>(null)
  const [beat, setBeat] = useState(0)
  /* Which counter the deed is standing at during beat 3. Held separately from
     the beat because it is the one thing inside a beat that has its own
     steps. */
  const [stop, setStop] = useState(0)
  /* Off until the effect runs. With no JavaScript, or with reduced motion
     asked for, the band renders every beat's content at rest instead of a
     pinned stage that will never be scrubbed. */
  const [scrub, setScrub] = useState(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setScrub(true)

    let frame = 0
    const read = () => {
      frame = 0
      const rect = scroller.getBoundingClientRect()
      /* The stage is pinned for exactly as long as the scroller is taller than
         the viewport, so that difference — not the scroller's height — is the
         travel the beats are spread across. */
      const travel = rect.height - window.innerHeight
      if (travel <= 0) return
      const p = Math.min(Math.max(-rect.top / travel, 0), 1)

      const b = Math.min(BEATS - 1, Math.floor(p * BEATS))
      /* Progress within the current beat, which only beat 3 has a use for. */
      const local = p * BEATS - b
      const s = Math.min(KEYS.length - 1, Math.floor(local * KEYS.length))

      setBeat((prev) => (prev === b ? prev : b))
      setStop((prev) => (prev === s ? prev : s))
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const caption = CAPTIONS[beat]

  return (
    <section
      className="joinseq bleed"
      ref={scrollerRef}
      data-scrub={scrub ? 'on' : 'off'}
      data-beat={beat}
      aria-labelledby="joinseq-title"
    >
      {/* The whole sequence is decoration over a claim that has to survive
          without it. Screen readers, and anyone whose browser never ran the
          effect, get the claim as prose. */}
      <h2 className="sr-only" id="joinseq-title">
        One flat, four registers, and no shared key between them
      </h2>
      {/* Only while scrubbing. Without it the caption rail is showing one beat
          at a time and the other four are unreachable by ear; with the rail in
          its fallback state every line is already on the page as prose, and
          this would read the whole argument through a second time. */}
      {scrub && (
        <p className="sr-only">
          {CAPTIONS.map((c) => `${c.lead} ${c.body}`).join(' ')}
        </p>
      )}

      {/* Hidden from assistive tech only while it is a scrubbed animation —
          there the sr-only prose above is the accessible copy of it. In the
          fallback the stage is not decoration over the content, it IS the
          content, and hiding it would leave nothing behind. */}
      <div className="joinseq-stage" aria-hidden={scrub}>
        <div className="bleed-inner joinseq-inner">
          <div className="joinseq-box">
            {/* The failing joins. viewBox is 0 0 100 100 with the aspect ratio
                unlocked, so a coordinate here is a percentage of the box and
                the endpoints below are the same numbers as the registers'
                CSS positions. non-scaling-stroke is what makes that safe:
                without it the stroke and its dashes stretch with the box. */}
            <svg
              className="joinseq-wires joinseq-wires-wide"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              focusable="false"
            >
              {ATTEMPTS.map(([a, b], i) => (
                <line
                  key={`${a}-${b}`}
                  className="joinseq-wire"
                  x1={KEYS[a].x}
                  y1={KEYS[a].y}
                  x2={KEYS[b].x}
                  y2={KEYS[b].y}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: `${i * 0.42}s` }}
                />
              ))}
            </svg>

            {/* The same four attempts, for the stacked layout. A ring has no
                meaning in one column, so these are the three gaps between
                consecutive registers: each tries to bridge to the next card
                down and retracts. The fourth attempt has nowhere to run in a
                column and is dropped rather than drawn somewhere arbitrary. */}
            <svg
              className="joinseq-wires joinseq-wires-narrow"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              focusable="false"
            >
              {KEYS.slice(0, -1).map((k, i) => (
                <line
                  key={k.who}
                  className="joinseq-wire"
                  x1="50"
                  y1={k.narrowY + 6}
                  x2="50"
                  y2={KEYS[i + 1].narrowY - 6}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: `${i * 0.42}s` }}
                />
              ))}
            </svg>

            {/* The flat. Centre of the stage in every beat — it is the one
                thing on screen that never had to change. */}
            <div className="joinseq-flat">
              <svg viewBox="0 0 64 52" focusable="false" aria-hidden="true">
                {/* A plan, not a house glyph: the outline of a two-bedroom,
                    drawn once and then left alone. */}
                <path
                  className="joinseq-plan"
                  d="M4 4 H60 V48 H4 Z M4 22 H34 M34 4 V48 M46 22 H60"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="joinseq-flat-label">
                <Mock what="Mock property">Flat 302, Sri Sai Residency</Mock>
              </span>
              <span className="joinseq-flat-sub">Banashankari 3rd Stage · Ward 160</span>
            </div>

            {/* The four registers. */}
            {KEYS.map((k, i) => (
              <div
                className="joinseq-key"
                key={k.who}
                data-held={beat === 3 && stop === i ? 'yes' : 'no'}
                style={
                  {
                    '--kx': `${k.x}%`,
                    '--ky': `${k.y}%`,
                    '--kx-narrow': '50%',
                    '--ky-narrow': `${k.narrowY}%`,
                    '--kd': `${i * 0.09}s`,
                  } as React.CSSProperties
                }
              >
                <span className="joinseq-key-who">{k.who}</span>
                <span className="joinseq-key-val">
                  <Mock what="Mock identifier">{k.val}</Mock>
                </span>
                <span className="joinseq-key-what">{k.what}</span>
              </div>
            ))}

            {/* The deed, and the person carrying it. It only exists in beat 3,
                where the answer to "what joins these four" is a human being
                with a photocopy. */}
            {/* Positioned through custom properties rather than left/top
                directly, so the narrow layout can move the counters without
                the deed being left behind at a corner that no longer has one
                in it. */}
            <div
              className="joinseq-deed"
              style={
                {
                  '--dx': `${KEYS[stop].x}%`,
                  '--dy': `${KEYS[stop].y}%`,
                  '--dx-narrow': '50%',
                  '--dy-narrow': `${KEYS[stop].narrowY}%`,
                } as React.CSSProperties
              }
            >
              <span className="joinseq-deed-paper">Sale deed</span>
              <span className="joinseq-deed-count">
                {stop + 1} of 4 · same document
              </span>
            </div>

            {/* Beat 4. The four numbers, still four numbers, now rows on one
                object — which is the only claim this product makes. */}
            <div className="joinseq-object">
              <div className="joinseq-object-head">
                <span className="joinseq-object-eyebrow">One object</span>
                <span className="joinseq-object-title">
                  <Mock what="Mock property">Flat 302, Sri Sai Residency</Mock>
                </span>
              </div>
              <ul className="joinseq-object-rows">
                {KEYS.map((k, i) => (
                  <li key={k.who} style={{ transitionDelay: `${0.18 + i * 0.07}s` }}>
                    <span>{k.who}</span>
                    <span className="mono">
                      <Mock what="Mock identifier">{k.val}</Mock>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The caption rail. One line of argument per beat, in the same place
              every time, so the eye is not hunting for where the words moved
              to. */}
          <div className="joinseq-caption">
            {scrub ? (
              <>
                <span className="joinseq-progress" aria-hidden="true">
                  {CAPTIONS.map((_, i) => (
                    <i key={i} data-on={i <= beat ? 'yes' : 'no'} />
                  ))}
                </span>
                <p className="joinseq-lead">{caption.lead}</p>
                <p className="joinseq-body">{caption.body}</p>
              </>
            ) : (
              /* Nothing is going to advance the rail, so every beat's line is
                 laid out at once. The argument is the point; the motion was
                 only ever the delivery. */
              CAPTIONS.map((c) => (
                <div className="joinseq-caption-step" key={c.lead}>
                  <p className="joinseq-lead">{c.lead}</p>
                  <p className="joinseq-body">{c.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
