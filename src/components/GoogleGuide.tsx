'use client'

import { useState, useEffect, useId } from 'react'
import { X, ExternalLink, Circle } from 'lucide-react'
import Image from 'next/image'
import { useLocale } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'
import { basePath } from '@/lib/env'

function GuideIllustration({ tabIndex }: { tabIndex: number }) {
  const { t } = useLocale()
  const markerId = useId()
  const common = { fill: 'none', stroke: 'rgb(var(--gl))', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const text = { fill: 'var(--t3)', fontSize: 9, fontFamily: 'inherit' }
  const box = { fill: 'var(--gi-bg)', stroke: 'var(--t5, var(--t4))', strokeWidth: 1, rx: 4 }
  const arrow = { ...common, strokeWidth: 1.2, markerEnd: `url(#${markerId})` }
  const arrowDef = (
    <defs>
      <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M1,1 L5,3 L1,5" fill="none" stroke="rgb(var(--gl))" strokeWidth="1" />
      </marker>
    </defs>
  )

  if (tabIndex === 0) return (
    <svg viewBox="0 0 280 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="56" height="48" {...box} rx={8} />
      <circle cx="32" cy="18" r="6" {...common} strokeWidth={1} />
      <text x="32" y="40" textAnchor="middle" {...text} fontSize={7}>{t('guide.profile')}</text>
      <line x1="66" y1="30" x2="88" y2="30" {...arrow} />
      <rect x="94" y="6" width="72" height="48" {...box} />
      <text x="130" y="26" textAnchor="middle" {...text}>{t('guide.yourTimeline')}</text>
      <text x="130" y="40" textAnchor="middle" {...text} fontSize={7}>{t('guide.menuSettings')}</text>
      <line x1="172" y1="30" x2="194" y2="30" {...arrow} />
      <rect x="200" y="6" width="72" height="48" {...box} />
      <text x="236" y="26" textAnchor="middle" {...text}>{t('guide.export')}</text>
      <text x="236" y="40" textAnchor="middle" {...text} fontSize={7}>{t('guide.toJson')}</text>
    </svg>
  )

  if (tabIndex === 1) return (
    <svg viewBox="0 0 280 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="72" height="48" {...box} />
      <text x="40" y="24" textAnchor="middle" {...text}>{t('guide.takeout')}</text>
      <text x="40" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.checkLocation')}</text>
      <line x1="82" y1="30" x2="104" y2="30" {...arrow} />
      <rect x="110" y="6" width="60" height="48" {...box} />
      <text x="140" y="24" textAnchor="middle" {...text}>{t('guide.export')}</text>
      <text x="140" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.emailWait')}</text>
      <line x1="176" y1="30" x2="198" y2="30" {...arrow} />
      <rect x="204" y="6" width="72" height="48" {...box} />
      <text x="240" y="24" textAnchor="middle" {...text}>{t('guide.upload')}</text>
      <text x="240" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.recordsJson')}</text>
    </svg>
  )

  if (tabIndex === 2) return (
    <svg viewBox="0 0 280 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="72" height="48" {...box} />
      <text x="40" y="24" textAnchor="middle" {...text}>{t('guide.profile')}</text>
      <text x="40" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.settings')}</text>
      <line x1="82" y1="30" x2="104" y2="30" {...arrow} />
      <rect x="110" y="6" width="72" height="48" {...box} />
      <text x="146" y="24" textAnchor="middle" {...text}>{t('guide.download')}</text>
      <text x="146" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.archive')}</text>
      <line x1="188" y1="30" x2="210" y2="30" {...arrow} />
      <rect x="216" y="6" width="56" height="48" {...box} />
      <text x="244" y="28" textAnchor="middle" {...text}>{t('guide.dotGpx')}</text>
    </svg>
  )

  if (tabIndex === 3) return (
    <svg viewBox="0 0 220 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>{t('guide.activity')}</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.gearOptions')}</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>{t('guide.export')}</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.toGpx')}</text>
    </svg>
  )

  if (tabIndex === 4) return (
    <svg viewBox="0 0 220 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>{t('guide.trailPage')}</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.dotsMenu')}</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>{t('guide.export')}</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.toGpx')}</text>
    </svg>
  )

  if (tabIndex === 5) return (
    <svg viewBox="0 0 220 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>{t('guide.tourPage')}</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.dotsMenu')}</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>{t('guide.download')}</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.toGpx')}</text>
    </svg>
  )

  if (tabIndex === 6) return (
    <svg viewBox="0 0 220 60" className="mb-2 w-full" style={{ maxHeight: 56 }}>
      {arrowDef}
      <rect x="4" y="6" width="80" height="48" {...box} />
      <text x="44" y="24" textAnchor="middle" {...text}>{t('guide.anyApp')}</text>
      <text x="44" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.exportShare')}</text>
      <line x1="90" y1="30" x2="118" y2="30" {...arrow} />
      <rect x="124" y="6" width="80" height="48" {...box} />
      <text x="164" y="24" textAnchor="middle" {...text}>{t('guide.upload')}</text>
      <text x="164" y="38" textAnchor="middle" {...text} fontSize={7}>{t('guide.gpxKml')}</text>
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
  const tabsId = useId()

  // Reset tab when modal reopens
  useEffect(() => { if (isOpen) setTab(0) }, [isOpen])

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
  const guidePreviewImage = tab === 0
    ? `${basePath}/guide/google-maps-phone-export.svg`
    : tab === 1
      ? `${basePath}/guide/google-takeout-export.svg`
      : null

  if (!isOpen) return null

  const active = methods[tab]
  const panelId = `${tabsId}-panel-${tab}`

  return (
    <ModalDialog
      open={isOpen}
      onClose={onClose}
      labelledBy="google-guide-title"
      overlayClassName="z-20 flex items-center justify-center bg-black/35 backdrop-blur-md"
      panelClassName="go mx-4 w-full max-w-md max-h-[90vh] overflow-y-auto"
    >
      <div data-disable-playback-hotkeys="true">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 pb-3" style={{ background: 'inherit', borderRadius: 'var(--r-glass) var(--r-glass) 0 0' }}>
          <div>
            <h3 id="google-guide-title" className="text-lg font-bold" style={{ color: 'var(--t1)' }}>
              {t('google.title')}
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--t4)' }}>
              {t('app.guideSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full cursor-pointer transition-colors"
            style={{ color: 'var(--t4)' }}
            aria-label={t('google.close')}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div role="tablist" aria-label={t('google.title')} className="mb-3 flex gap-1.5 overflow-x-auto px-5 scrollbar-none sm:flex-wrap">
          {methods.map((m, i) => (
            <button
              key={m.label}
              id={`${tabsId}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={tab === i}
              aria-controls={`${tabsId}-panel-${i}`}
              onClick={() => setTab(i)}
              className="min-h-11 flex-shrink-0 whitespace-nowrap rounded-2xl px-3 py-2 text-[11px] font-medium cursor-pointer transition-colors"
              style={{
                background: tab === i ? 'rgb(var(--gl))' : 'var(--gi-bg)',
                color: tab === i ? '#fff' : 'var(--t3)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div id={panelId} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`} className="px-5 pb-5">
          <div>
            {guidePreviewImage ? (
              <Image
                src={guidePreviewImage}
                alt={tab === 0 ? t('google.phoneTab') : t('google.takeoutTab')}
                width={720}
                height={420}
                className="mb-3 w-full rounded-2xl border border-white/10 shadow-sm"
              />
            ) : (
              <GuideIllustration tabIndex={tab} />
            )}
          </div>

          <div className="space-y-2 pb-3">
            {active.steps.map((step) => (
              <div key={step.number} className="gi flex gap-3 px-3 py-3" style={{ borderRadius: '10px' }}>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgb(var(--gl))' }}>
                  <span className="text-sm font-bold text-white">{step.number}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-semibold" style={{ color: 'var(--t1)' }}>
                    {step.title}
                  </p>
                  <ul className="space-y-1">
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
                      className="gi mt-3 inline-flex min-h-11 items-center gap-1.5 px-4 py-2 text-sm font-medium"
                    >
                      {step.action.label}
                      <ExternalLink size={14} strokeWidth={2} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="gi p-4" style={{ borderRadius: '10px', borderLeft: '3px solid var(--warn)' }}>
            <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--warn)' }}>
              {t('google.tips')}
            </p>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--t3)' }}>
                  <Circle size={6} fill="currentColor" strokeWidth={0} className="mt-1.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
