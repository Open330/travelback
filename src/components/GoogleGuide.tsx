'use client'

import { useState } from 'react'
import { X, ExternalLink, Circle } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

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

        {/* Method tabs — wrapping for many platforms */}
        <div className="px-5 flex flex-wrap gap-1.5 mb-3">
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
