import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { basePath } from '@/lib/env'
const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.NODE_ENV === 'production' ? 'https://open330.github.io' : 'http://localhost:3000')
const appUrl = new URL(`${siteOrigin}${basePath || ''}/`)
const placeholderScriptSrc = process.env.NODE_ENV === 'production'
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'"
const placeholderStyleSrc = process.env.NODE_ENV === 'production'
  ? "'self'"
  : "'self' 'unsafe-inline'"

export const metadata: Metadata = {
  title: {
    default: 'Travelback - Animate Your Journeys',
    template: '%s | Travelback',
  },
  description: 'Turn GPX, KML, and Google Location History into animated travel videos. Visualize your journeys on an interactive map and export as video.',
  keywords: ['GPX', 'KML', 'Google Location History', 'travel animation', 'GPS visualization', 'route video', 'MapLibre', 'travel video maker'],
  authors: [{ name: 'Open330' }],
  creator: 'Open330',
  metadataBase: appUrl,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl.toString(),
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
      { url: `${basePath}/favicon.svg`, type: 'image/svg+xml' },
      { url: `${basePath}/icon.svg`, type: 'image/svg+xml', sizes: '32x32' },
    ],
    apple: `${basePath}/favicon.svg`,
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
  const bootstrapScript = `(function(){try{if(window.top!==window.self){try{window.top.location=window.self.location.href;return}catch{document.documentElement.style.display='none';window.location.replace('about:blank');return}}}catch{}try{var d=document.documentElement;var s=null;var te=null;try{s=localStorage.getItem('travelback-theme');te=localStorage.getItem('travelback-theme-explicit')}catch{};var m;if((te==='1'||te==null)&&(s==='dark'||s==='light')){m=s}else{m=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'};d.setAttribute('data-mode',m);try{if(te!=='1'){localStorage.setItem('travelback-theme',m);localStorage.setItem('travelback-theme-explicit','0')}}catch{};var ms=null;var mse=null;try{ms=localStorage.getItem('travelback-mapstyle');mse=localStorage.getItem('travelback-mapstyle-explicit')}catch{};var style=(mse==='1'&&(ms==='dark'||ms==='voyager'||ms==='liberty'||ms==='positron'||ms==='bright'))?ms:m==='dark'?'dark':'voyager';d.setAttribute('data-mapstyle',style);try{if(mse!=='1'){localStorage.setItem('travelback-mapstyle',style);localStorage.setItem('travelback-mapstyle-explicit','0')}}catch{}}catch{}try{var l=null;try{l=localStorage.getItem('travelback-locale')}catch{};if(l==='en'||l==='ko'||l==='ja'||l==='zh'||l==='es'){d.lang=l}}catch{}})()`

  return (
    <html lang="en" data-svc="travelback" data-mesh="on" data-mode="light" data-mapstyle="voyager" suppressHydrationWarning>
      <head>
        <Script id="travelback-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
        {/* Dev keeps a conservative inline/eval-compatible CSP so Next can bootstrap normally.
            `npm run build` then runs `scripts/harden-static-export.mjs`, which replaces this
            placeholder with a hash-based static CSP and removes the production `unsafe-inline`
            script allowance from the emitted HTML. */}
        <meta
          httpEquiv="Content-Security-Policy"
          data-travelback-csp="placeholder"
          content={`default-src 'self'; script-src ${placeholderScriptSrc}; script-src-attr 'none'; style-src ${placeholderStyleSrc}; style-src-elem ${placeholderStyleSrc}; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests;`}
        />
        <link
          rel="stylesheet"
          as="style"
          href={`${basePath}/fonts/pretendard.css`}
        />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body
        className="antialiased"
        style={{ background: 'var(--bg,#EBEEF4)', color: 'var(--t1,#050810)' }}
        suppressHydrationWarning
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
