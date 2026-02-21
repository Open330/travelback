import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
