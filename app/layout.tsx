import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Handover — one property, every department',
  description:
    'You bought a flat. Four systems need to know, and none of them talk to each other. Handover keys the record on the property instead of the person. Independent hackathon prototype, mock data only.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf9f7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Fonts are progressive enhancement. The type scale, the layout and
            every state in the product survive these not loading — which on a
            patchy 4G connection in Bengaluru is a real Tuesday, not a
            hypothetical. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Noto+Sans+Kannada:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div className="shell">
          <header className="topbar">
            <a className="wordmark" href="/">
              Handover<span>Prototype</span>
            </a>
            <nav className="row" style={{ gap: 'var(--sp-3)' }}>
              <a className="xs muted" href="/dept" style={{ textDecoration: 'none' }}>
                Department view
              </a>
              <a className="xs muted" href="/transparency" style={{ textDecoration: 'none' }}>
                What&rsquo;s mocked
              </a>
            </nav>
          </header>
          <main id="main">{children}</main>
        </div>
      </body>
    </html>
  )
}
