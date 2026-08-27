// BBMP — SOLID WASTE MANAGEMENT. The fourth binding, and deliberately the odd
// one out.
//
// The other three bindings are transfer problems: a name has to move from one
// person to another, once, and the question is how long that takes and who is
// sitting on it. Garbage is not that. There is nothing to transfer. The
// question is whether a tipper came down your street this morning, and it will
// be the same question tomorrow.
//
// Two things follow, and both are the reason this file exists.
//
// 1. THE KEY IS ALREADY SHARED. BBMP collects the SWM user fee along with
//    property tax, on the same SAS number. So the moment the khata moves, this
//    moves — no application, no indemnity bond, no counter. One leg of the
//    handover is already solved, and it is solved for exactly the reason this
//    whole project argues: it shares a key with a system that already knows
//    about the transfer. We did not build that. We are pointing at it.
//
// 2. A RECURRING SERVICE NEEDS A DIFFERENT INSTRUMENT. A Sakala clock measures
//    one application against one deadline. It has nothing to say about a
//    street where dry waste has not been picked up since June. What does have
//    something to say is the user fee: it is charged monthly, it is charged
//    whether or not the tipper came, and nobody anywhere holds the two numbers
//    next to each other. This file holds them next to each other.
//
// HONESTY, UP FRONT. We cannot verify a collection happened. BBMP's own
// tippers carry GPS and its transfer stations weigh loads, so the department
// can; this app cannot, and it says so on screen rather than dressing a
// citizen's tap as a measurement. What the citizen marks here is an
// assertion — logged as theirs, labelled as theirs, and never presented as a
// departmental record.

export type WasteStream = 'wet' | 'dry' | 'sanitary'

export const STREAMS: Record<
  WasteStream,
  { label: string; kn: string; note: string }
> = {
  wet: {
    label: 'Wet waste',
    kn: 'ಹಸಿ ಕಸ',
    note: 'Kitchen and food waste. Collected daily except Sunday.',
  },
  dry: {
    label: 'Dry waste',
    kn: 'ಒಣ ಕಸ',
    note: 'Paper, plastic, metal, glass. Collected once a week.',
  },
  sanitary: {
    label: 'Sanitary & hazardous',
    kn: 'ನೈರ್ಮಲ್ಯ ಕಸ',
    note: 'Nappies, sanitary napkins, medical waste, batteries. Twice a week.',
  },
}

export const STREAM_ORDER: WasteStream[] = ['wet', 'dry', 'sanitary']

/**
 * A collection beat: the round a pourakarmika and an auto-tipper actually
 * walk. Note what it is keyed on — a stretch of street, not a household. The
 * property joins it by address, the same way it joins a water main.
 */
export type Beat = {
  beatCode: string
  routeCode: string
  /** Marshal or contractor holding the round. Shown, not buried in a log. */
  responsible: string
  /** IST day numbers, 0 = Sunday. */
  scheduledDays: Record<WasteStream, number[]>
  /** SWM user fee, billed monthly on the property tax demand. */
  monthlyUserFeePaise: number
  /**
   * Households on this beat. A property of the ROUND, not a list of anyone —
   * the same rule the ward view holds to: a count on a stretch is enough to
   * send someone down that road, and a list is not ours to assemble.
   */
  households: number
  /**
   * Non-collections the department's own records already show, expressed as
   * days before today rather than as calendar dates.
   *
   * This is a deliberate break from how the rest of the fixtures work, and it
   * needs defending: a collection log pinned to fixed dates in August is an
   * empty screen by October, and an empty screen teaches a reviewer nothing.
   * The PATTERN is fixed and invented; the dates float so it stays legible.
   * /transparency says exactly this.
   */
  seededMisses: Array<{ daysAgo: number; stream: WasteStream }>
  /**
   * A stream that has simply stopped being collected here. Different in kind
   * from a scatter of missed days, and the difference is the finding: this is
   * a route that no longer reaches, not a tipper that ran late.
   */
  chronic?: { stream: WasteStream; sinceDaysAgo: number; reason: string }
}

/** What the citizen asserts. Their claim, marked as theirs. */
export type CitizenReport = {
  dateKey: string
  stream: WasteStream
  at: string
}

export type EntryState = 'collected' | 'missed' | 'due'

export type Entry = {
  dateKey: string
  daysAgo: number
  stream: WasteStream
  state: EntryState
  /** Who says so. A citizen tap is never laundered into a department record. */
  source: 'department' | 'you'
}

/* --- dates ---------------------------------------------------------------- */
// Collection happens on IST mornings, so the day boundary has to be IST or a
// 7am pickup lands on the wrong row for anyone east of Greenwich.

export function istKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function istWeekday(d: Date): number {
  return WEEKDAYS.indexOf(
    d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
  )
}

export function istWeekdayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'Asia/Kolkata' })
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime())
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

export function weekdayName(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })
}

export function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

/* --- the log -------------------------------------------------------------- */

/**
 * When the next round is due.
 *
 * The single most useful thing this screen can tell someone who has no
 * complaint to make, and the app already knows it. Making a person remember
 * which day is dry-waste day is a recall task; showing it is a recognition
 * task, and recognition wins every time.
 */
export function nextDue(
  beat: Beat,
  now: Date,
  stream: WasteStream,
): { date: Date; inDays: number } | null {
  for (let i = 1; i <= 8; i++) {
    const d = addDays(now, i)
    if (dueOn(beat, d).includes(stream)) return { date: d, inDays: i }
  }
  return null
}

/**
 * The streams worth telling someone about in advance.
 *
 * Wet waste is collected six days a week, so "next wet waste: tomorrow" is
 * noise dressed as help. The rounds people actually have to remember are the
 * weekly ones — which day to put the dry waste out — and those are exactly the
 * ones a schedule that lives on a ward-office noticeboard cannot tell them.
 */
export function upcoming(
  beat: Beat,
  now: Date,
): Array<{ stream: WasteStream; date: Date; inDays: number }> {
  return STREAM_ORDER.filter((s) => beat.scheduledDays[s].length <= 3)
    .map((s) => {
      const n = nextDue(beat, now, s)
      return n ? { stream: s, date: n.date, inDays: n.inDays } : null
    })
    .filter((x): x is { stream: WasteStream; date: Date; inDays: number } => x !== null)
    .sort((a, b) => a.inDays - b.inDays)
}

/** The window as a list of days, newest last. Drawn as columns. */
export function windowOf(now: Date, days: number): Array<{ dateKey: string; daysAgo: number }> {
  const out: Array<{ dateKey: string; daysAgo: number }> = []
  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    out.push({ dateKey: istKey(addDays(now, -daysAgo)), daysAgo })
  }
  return out
}

export function dueOn(beat: Beat, d: Date): WasteStream[] {
  const wd = istWeekday(d)
  return STREAM_ORDER.filter((s) => beat.scheduledDays[s].includes(wd))
}

/**
 * The window, rebuilt from the schedule every time rather than stored.
 *
 * A stored log would need a server, and a server would need a row saying this
 * device watches this address — the exact join the whole app refuses to make.
 * Deriving it means the department's seeded record and the citizen's own marks
 * can be merged at read time and kept visibly distinct.
 */
/**
 * Snap each seeded miss onto a day that stream is actually collected.
 *
 * The misses are stored as "N days ago" so the demo does not rot, which means
 * the weekday they land on moves with the calendar. Left alone, a wet-waste
 * miss written as 4 days ago silently vanishes on any Thursday, because four
 * days earlier was a Sunday and nothing was scheduled. The reviewer then sees
 * a different fixture on Tuesday than on Thursday, which is worse than a stale
 * date. So each miss walks backwards to the most recent scheduled round at or
 * before its offset, skipping slots already taken so two misses never collapse
 * into one and quietly change the count.
 */
function resolveSeeded(beat: Beat, windowDays: number, now: Date): Set<string> {
  const taken = new Set<string>()
  const ordered = [...beat.seededMisses].sort((a, b) => a.daysAgo - b.daysAgo)

  for (const m of ordered) {
    for (let d = m.daysAgo; d < windowDays; d++) {
      const key = `${d}:${m.stream}`
      if (taken.has(key)) continue
      if (!dueOn(beat, addDays(now, -d)).includes(m.stream)) continue
      taken.add(key)
      break
    }
  }
  return taken
}

export function buildLog(
  beat: Beat,
  now: Date,
  windowDays: number,
  reports: CitizenReport[],
): Entry[] {
  const reported = new Set(reports.map((r) => `${r.dateKey}:${r.stream}`))
  const seeded = resolveSeeded(beat, windowDays, now)
  const out: Entry[] = []

  for (let daysAgo = windowDays - 1; daysAgo >= 0; daysAgo--) {
    const d = addDays(now, -daysAgo)
    const dateKey = istKey(d)
    for (const stream of dueOn(beat, d)) {
      const chronicHit =
        beat.chronic?.stream === stream && daysAgo <= beat.chronic.sinceDaysAgo
      const seededHit = seeded.has(`${daysAgo}:${stream}`)
      const citizenHit = reported.has(`${dateKey}:${stream}`)

      const state: EntryState = citizenHit
        ? 'missed'
        : chronicHit || seededHit
          ? 'missed'
          : daysAgo === 0
            ? 'due'
            : 'collected'

      out.push({
        dateKey,
        daysAgo,
        stream,
        state,
        source: citizenHit && !chronicHit && !seededHit ? 'you' : 'department',
      })
    }
  }
  return out
}

export type StreamSummary = {
  stream: WasteStream
  scheduled: number
  collected: number
  missed: number
  /** Consecutive scheduled collections missed, counting back from the latest. */
  streak: number
  lastCollectedDaysAgo: number | null
  dueToday: boolean
  todayMarked: boolean
}

export function summarise(entries: Entry[], stream: WasteStream): StreamSummary {
  const mine = entries.filter((e) => e.stream === stream)
  const settled = mine.filter((e) => e.state !== 'due')
  const missed = settled.filter((e) => e.state === 'missed')

  let streak = 0
  for (let i = settled.length - 1; i >= 0; i--) {
    if (settled[i].state === 'missed') streak++
    else break
  }

  const lastCollected = [...settled].reverse().find((e) => e.state === 'collected')
  const today = mine.find((e) => e.daysAgo === 0)

  return {
    stream,
    scheduled: settled.length,
    collected: settled.length - missed.length,
    missed: missed.length,
    streak,
    lastCollectedDaysAgo: lastCollected ? lastCollected.daysAgo : null,
    dueToday: Boolean(today),
    todayMarked: today?.state === 'missed',
  }
}

/* --- the fee, against the service ----------------------------------------- */

/** Scheduled collections in a 30-day month, across every stream. */
export function collectionsPerMonth(beat: Beat): number {
  const perWeek = STREAM_ORDER.reduce(
    (n, s) => n + beat.scheduledDays[s].length,
    0,
  )
  return Math.round((perWeek * 30) / 7)
}

export function perCollectionPaise(beat: Beat): number {
  const n = collectionsPerMonth(beat)
  return n === 0 ? 0 : Math.round(beat.monthlyUserFeePaise / n)
}

/**
 * The number nobody currently holds: user fee charged, against service not
 * delivered, over the same window.
 *
 * READ THE NEXT SENTENCE BEFORE USING THIS. It is NOT a refund entitlement.
 * The SWM user fee carries no statutory rebate for non-collection — unlike a
 * Sakala default, where s.5 gives the citizen a real claim. Inventing one here
 * would be exactly the kind of confident nonsense this app exists to avoid.
 * What it is: the complaint, in rupees, so that "they keep skipping our
 * street" arrives at the ward office as a figure instead of a mood.
 */
export function feeAtStakePaise(beat: Beat, missed: number): number {
  return perCollectionPaise(beat) * missed
}

/**
 * The same arithmetic at the scale the ward office works at.
 *
 * One household's share of a few missed rounds is a couple of rupees, and a
 * couple of rupees is dismissible — correctly so. The round is not collected
 * per household, though; it either comes down the street or it does not, and
 * when it does not, everyone on the beat paid for it. That figure is not
 * dismissible, and it is the one an engineer can act on. Still a count on a
 * beat, still nobody named.
 */
export function beatFeeAtStakePaise(beat: Beat, missed: number): number {
  return feeAtStakePaise(beat, missed) * beat.households
}

/**
 * How long a stream has been out, when the outage is older than the window.
 *
 * The log shows three weeks, because three weeks is what a person can read at
 * a glance. An eleven-week outage inside it renders as three missed rounds,
 * which is technically true and badly understates it. This is the number the
 * finding actually needs.
 */
export function outageDays(beat: Beat, stream: WasteStream): number | null {
  return beat.chronic?.stream === stream ? beat.chronic.sinceDaysAgo : null
}

/**
 * The window, chunked into weeks of seven.
 *
 * Twenty-one undifferentiated squares is a counting task. Three groups of
 * seven is a reading task — the eye takes the chunk as one unit, which is the
 * whole of why a calendar has weeks in it. Every stream is chunked on the same
 * boundaries so the columns still line up vertically.
 */
export function chunkWeeks<T>(days: T[], size = 7): T[][] {
  const out: T[][] = []
  for (let i = 0; i < days.length; i += size) out.push(days.slice(i, i + size))
  return out
}

export function inWeeks(days: number): string {
  const w = Math.round(days / 7)
  return `${w} week${w === 1 ? '' : 's'}`
}

/** Misses on one stream before the app offers to escalate for you. */
export const ESCALATION_STREAK = 3

export function escalating(summaries: StreamSummary[]): StreamSummary[] {
  return summaries.filter((s) => s.streak >= ESCALATION_STREAK)
}
