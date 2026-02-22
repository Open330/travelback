import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: 'Travelback - Animate Your Journeys',
    template: '%s | Travelback',
  },
  description: 'Turn GPX, KML, and Google Location History into animated travel videos. Visualize your journeys on an interactive map and export as video.',
  keywords: ['GPX', 'KML', 'Google Location History', 'travel animation', 'GPS visualization', 'route video', 'MapLibre', 'travel video maker'],
  authors: [{ name: 'Open330' }],
  creator: 'Open330',
  metadataBase: new URL('https://open330.github.io/travelback'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://open330.github.io/travelback/',
    title: 'Travelback - Animate Your Journeys',
    description: 'Turn GPX, KML, and Google Location History into animated travel videos. Visualize your journeys on an interactive map and export as video.',
    siteName: 'Travelback',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Travelback - Animate Your Journeys',
    description: 'Turn GPX, KML, and Google Location History into animated travel videos.',
  },
  icons: {
    icon: [
      { url: '/travelback/favicon.svg', type: 'image/svg+xml' },
      { url: '/travelback/icon.svg', type: 'image/svg+xml', sizes: '32x32' },
    ],
    apple: '/travelback/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-svc="travelback" data-mode="dark" data-mesh="on">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' blob: data: https://*.cartocdn.com https://*.openfreemap.org https://*.openstreetmap.org; connect-src 'self' https://*.cartocdn.com https://*.openfreemap.org https://*.openstreetmap.org; worker-src 'self' blob:; child-src 'self' blob:; media-src 'self' blob:;"
        />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          integrity="sha384-GIdEBaqGN9mNkDkMkzMHW8EKUqtpPIe/sLj1X7DIrnc9uPtLROJgmuDlh+3rBw0j"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className="antialiased"
        style={{ background: 'var(--bg)', color: 'var(--t1)' }}
      >
        <div className="vitro-mesh fixed inset-0 z-0" />
        <div className="vitro-noise" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}
