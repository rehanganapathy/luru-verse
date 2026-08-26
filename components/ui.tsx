import type { ReactNode } from 'react'

/**
 * The mocked-data marker. Applied to every invented value in the product.
 *
 * We chose an inline marker over a page-level banner deliberately: a banner
 * gets read once and forgotten, and by screen three the reviewer has stopped
 * distinguishing what is real from what we made up. A marker that travels with
 * the value cannot be forgotten.
 */
export function Mock({
  children,
  what = 'Mock data',
}: {
  children: ReactNode
  what?: string
}) {
  return (
    <span className="mock" title={`${what} — invented for this prototype. See "What's real and what's mocked".`}>
      {children}
    </span>
  )
}

type Tone = 'run' | 'block' | 'breach' | 'done' | 'idle'

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>
}

export function Footer() {
  return (
    <footer className="footer stack stack-2">
      <p>
        <strong>Handover</strong> is an independent hackathon prototype. Not
        affiliated with, endorsed by, or connected to BBMP, BESCOM, BWSSB, the
        Government of Karnataka or any of their systems. No government marks
        are used.
      </p>
      <p>
        All property, account, name and amount data shown is invented.{' '}
        <a href="/transparency">What&rsquo;s real and what&rsquo;s mocked →</a>
      </p>
    </footer>
  )
}
