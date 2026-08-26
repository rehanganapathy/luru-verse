'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function PropertyTabs({ epid }: { epid: string }) {
  const path = usePathname()
  const base = `/property/${encodeURIComponent(epid)}`
  const tabs = [
    { href: base, label: 'Property', exact: true },
    { href: `${base}/handover`, label: 'Handover', exact: false },
    { href: `${base}/grievance`, label: 'Grievances', exact: false },
  ]
  return (
    <nav
      aria-label="Property sections"
      className="row"
      style={{
        gap: 0,
        borderBottom: '1px solid var(--rule)',
        margin: '0 0 var(--sp-5)',
      }}
    >
      {tabs.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '10px 14px 10px 0',
              marginRight: 18,
              fontSize: 'var(--t-sm)',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              textDecoration: 'none',
              borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
