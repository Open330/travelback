'use client'

import { useState } from 'react'
import { X, ExternalLink, Circle } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

/** Compact SVG illustrations for each guide tab */
function GuideIllustration({ tabIndex }: { tabIndex: number }) {
  const common = { fill: 'none', stroke: 'rgb(var(--gl))', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const text = { fill: 'var(--t3)', fontSize: 9, fontFamily: 'inherit' }
  const box = { fill: 'var(--bg-gi)', stroke: 'var(--t5, var(--t4))', strokeWidth: 1, rx: 4 }
  const arrow = { ...common, strokeWidth: 1.2, markerEnd: 'url(#arrowG)' }
  const arrowDef = (
    <defs>
      <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M1,1 L5,3 L1,5" fill="none" stroke="rgb(var(--gl))" strokeWidth="1" />
      </marker>
    </defs>
  )

  // Google Maps Phone — phone screen with profile → timeline → export flow
  if (tabIndex === 0) return (
    <svg viewBox="0 0 280 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="56" height="48" {...box} rx={8} />
      <circle cx="32" cy="18" r="6" {...common} strokeWidth={1} />
      <text x="32" y="40" textAnchor="middle" {...text} fontSize={7}>Profile</text>
      <line x1="66" y1="30" x2="88" y2="30" {...arrow} />
      <rect x="94" y="6" width="72" height="48" {...box} />
      <text x="130" y="26" textAnchor="middle" {...text}>Your Timeline</text>
      <text x="130" y="40" textAnchor="middle" {...text} fontSize={7}>⋮ → Settings</text>
      <line x1="172" y1="30" x2="194" y2="30" {...arrow} />
      <rect x="200" y="6" width="72" height="48" {...box} />
      <text x="236" y="26" textAnchor="middle" {...text}>Export</text>
      <text x="236" y="40" textAnchor="middle" {...text} fontSize={7}>→ .json</text>
    </svg>
  )

  // Google Takeout — web page flow
  if (tabIndex === 1) return (
    <svg viewBox="0 0 280 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="72" height="48" {...box} />
      <text x="40" y="24" textAnchor="middle" {...text}>Takeout</text>
      <text x="40" y="38" textAnchor="middle" {...text} fontSize={7}>☑ Location</text>
      <line x1="82" y1="30" x2="104" y2="30" {...arrow} />
      <rect x="110" y="6" width="60" height="48" {...box} />
      <text x="140" y="24" textAnchor="middle" {...text}>Export</text>
      <text x="140" y="38" textAnchor="middle" {...text} fontSize={7}>📧 Wait</text>
      <line x1="176" y1="30" x2="198" y2="30" {...arrow} />
      <rect x="204" y="6" width="72" height="48" {...box} />
      <text x="240" y="24" textAnchor="middle" {...text}>Upload</text>
      <text x="240" y="38" textAnchor="middle" {...text} fontSize={7}>Records.json</text>
    </svg>
  )

  // Strava — profile → settings → archive
  if (tabIndex === 2) return (
    <svg viewBox="0 0 280 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="72" height="48" {...box} />
      <text x="40" y="24" textAnchor="middle" {...text}>Profile</text>
      <text x="40" y="38" textAnchor="middle" {...text} fontSize={7}>Settings</text>
      <line x1="82" y1="30" x2="104" y2="30" {...arrow} />
      <rect x="110" y="6" width="72" height="48" {...box} />
      <text x="146" y="24" textAnchor="middle" {...text}>Download</text>
      <text x="146" y="38" textAnchor="middle" {...text} fontSize={7}>Archive</text>
      <line x1="188" y1="30" x2="210" y2="30" {...arrow} />
      <rect x="216" y="6" width="56" height="48" {...box} />
      <text x="244" y="28" textAnchor="middle" {...text}>.gpx</text>
    </svg>
  )

  // Garmin — activity → export
  if (tabIndex === 3) return (
    <svg viewBox="0 0 220 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>Activity</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>⚙ Options</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>Export</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>→ .gpx</text>
    </svg>
  )

  // AllTrails — trail → export
  if (tabIndex === 4) return (
    <svg viewBox="0 0 220 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>Trail Page</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>⋯ Menu</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>Export</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>→ .gpx</text>
    </svg>
  )

  // Komoot — tour → download
  if (tabIndex === 5) return (
    <svg viewBox="0 0 220 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>Tour Page</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>⋯ Menu</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>Download</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>→ .gpx</text>
    </svg>
  )

  // Other — generic export
  if (tabIndex === 6) return (
    <svg viewBox="0 0 220 60" className="w-full mb-2" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>Any App</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>Export / Share</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>Upload</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>.gpx / .kml</text>
    </svg>
  )

  return null
}

interface GoogleGuideProps {
  isOpen: boolean
  onClose: () => void
}

export default function GoogleGuide({ isOpen, onClose }: GoogleGuideProps) {
  const { t } = useLocale()
  const [tab, setTab] = useState(0)

  const methods = [
    {
      label: t('google.phoneTab'),
      steps: [
        {
          number: 1,
          title: t('google.step1Phone'),
          items: [t('google.step1PhoneItem1'), t('google.step1PhoneItem2')],
        },
        {
          number: 2,
          title: t('google.step2Phone'),
          items: [t('google.step2PhoneItem1'), t('google.step2PhoneItem2')],
        },
        {
          number: 3,
          title: t('google.step3Phone'),
          items: [t('google.step3PhoneItem1'), t('google.step3PhoneItem2')],
        },
      ],
    },
    {
      label: t('google.takeoutTab'),
      steps: [
        {
          number: 1,
          title: t('google.step1Takeout'),
          items: [t('google.step1TakeoutItem1'), t('google.step1TakeoutItem2')],
          action: {
            label: t('google.openTakeout'),
            href: 'https://takeout.google.com',
          },
        },
        {
          number: 2,
          title: t('google.step2Takeout'),
          items: [t('google.step2TakeoutItem1'), t('google.step2TakeoutItem2')],
        },
        {
          number: 3,
          title: t('google.step3Takeout'),
          items: [t('google.step3TakeoutItem1'), t('google.step3TakeoutItem2')],
        },
      ],
    },
    {
      label: t('google.stravaTab'),
      steps: [
        {
          number: 1,
          title: t('google.strava1'),
          items: [t('google.strava1Item1'), t('google.strava1Item2')],
        },
        {
          number: 2,
          title: t('google.strava2'),
          items: [t('google.strava2Item1'), t('google.strava2Item2')],
        },
      ],
    },
    {
      label: t('google.garminTab'),
      steps: [
        {
          number: 1,
          title: t('google.garmin1'),
          items: [t('google.garmin1Item1'), t('google.garmin1Item2')],
        },
      ],
    },
    {
      label: t('google.allTrailsTab'),
      steps: [
        {
          number: 1,
          title: t('google.alltrails1'),
          items: [t('google.alltrails1Item1'), t('google.alltrails1Item2')],
        },
      ],
    },
    {
      label: t('google.komootTab'),
      steps: [
        {
          number: 1,
          title: t('google.komoot1'),
          items: [t('google.komoot1Item1'), t('google.komoot1Item2')],
        },
      ],
    },
    {
      label: t('google.otherTab'),
      steps: [
        {
          number: 1,
          title: t('google.other1'),
          items: [t('google.other1Item1'), t('google.other1Item2')],
        },
      ],
    },
  ]

  const tips = [t('google.tip1'), t('google.tip2'), t('google.tip3')]

  if (!isOpen) return null

  const active = methods[tab]

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="go w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" style={{ borderRadius: 'var(--r-glass)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 pb-3 sticky top-0 z-10"
          style={{ background: 'inherit', borderRadius: 'var(--r-glass) var(--r-glass) 0 0' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--t1)' }}>
            {t('google.title')}
          </h3>
          <button
            onClick={onClose}
            className="transition-colors cursor-pointer flex-shrink-0"
            style={{ color: 'var(--t4)' }}
            aria-label={t('google.close')}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Method tabs — grid wrapping (4+3 on desktop, fluid on mobile) */}
        <div className="px-5 grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-3">
          {methods.map((m, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-full cursor-pointer transition-colors"
              style={{
                background: tab === i ? 'rgb(var(--gl))' : 'var(--bg-gi)',
                color: tab === i ? '#fff' : 'var(--t3)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Illustration for active tab */}
        <div className="px-5">
          <GuideIllustration tabIndex={tab} />
        </div>

        {/* Steps for active tab */}
        <div className="px-5 pb-3 space-y-2">
          {active.steps.map((step) => (
            <div
              key={step.number}
              className="gi flex gap-3 px-3 py-2.5" style={{ borderRadius: '10px' }}
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgb(var(--gl))' }}>
                <span className="text-white text-sm font-bold">{step.number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-1" style={{ color: 'var(--t1)' }}>
                  {step.title}
                </p>
                <ul className="space-y-0.5">
                  {step.items.map((item, i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--t3)' }}>
                      {item}
                    </li>
                  ))}
                </ul>
                {'action' in step && step.action && (
                  <a
                    href={step.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vitro-btn-primary inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-sm font-medium"
                  >
                    {step.action.label}
                    <ExternalLink size={14} strokeWidth={2} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mx-5 mb-5 p-4 gi" style={{ borderRadius: '10px', borderLeft: '3px solid var(--warn)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--warn)' }}>
            {t('google.tips')}
          </p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--t3)' }}>
                <Circle size={6} fill="currentColor" strokeWidth={0} className="flex-shrink-0 mt-1.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
