import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Luruverse — one property, every department',
  description:
    'You bought a flat. Four systems need to know, and none of them talk to each other. Luruverse keys the record on the property instead of the person. Independent hackathon prototype, mock data only.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f6f3',
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
            hypothetical. Two families, not three: Archivo carries display and
            body, JetBrains Mono carries every identifier and micro-label. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Kannada:wght@400;500;600&display=swap"
        />
        {/* The hero photograph is above the fold on the first screen anyone
            sees, and the fixed media layer it lives in is the first thing the
            page paints. Preloading pulls it forward without blocking
            anything. */}
        <link rel="preload" as="image" href="/vidhana-soudha-dither.jpg" />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {/* Outside the shell: the header spans the window and its rule is a
            structural line for the whole page, not a border on a column. */}
        <header className="topbar">
          <div className="topbar-inner">
            <a className="wordmark" href="/">
              Luruverse<span>Prototype</span>
            </a>
            <nav className="topbar-nav">
              <a className="nav-link" href="/dept">
                department&nbsp;view
              </a>
              <a className="nav-link" href="/transparency">
                <i aria-hidden="true" />
                what&rsquo;s&nbsp;mocked
              </a>
            </nav>
            <a className="topbar-cta" href="/#find">
              Find a property
            </a>
          </div>
        </header>
        <div className="shell">
          <main id="main">{children}</main>
        </div>
      </body>
    </html>
  )
}
