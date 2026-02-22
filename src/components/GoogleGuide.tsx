'use client'

import { useState } from 'react'
import { X, ExternalLink, Circle } from 'lucide-react'

interface GoogleGuideProps {
  isOpen: boolean
  onClose: () => void
}

const methods = [
  {
    label: 'From your phone (recommended)',
    steps: [
      {
        number: 1,
        title: 'Open Google Maps',
        items: [
          'Tap your profile picture',
          'Go to "Your Timeline"',
        ],
      },
      {
        number: 2,
        title: 'Export your data',
        items: [
          'Tap ⋮ (more) → Settings → Export Timeline data',
          'This downloads a location-history.json file',
        ],
      },
      {
        number: 3,
        title: 'Upload to Travelback',
        items: [
          'Drop the JSON file here',
          'Use the timeline slider to select a date range',
        ],
      },
    ],
  },
  {
    label: 'From Google Takeout',
    steps: [
      {
        number: 1,
        title: 'Go to Google Takeout',
        items: [
          'Visit takeout.google.com',
          'Deselect all, then select "Location History"',
        ],
        action: {
          label: 'Open Google Takeout',
          href: 'https://takeout.google.com',
        },
      },
      {
        number: 2,
        title: 'Download & extract',
        items: [
          'Create export → wait for email → download zip',
          'Any of these files work: Records.json, Timeline Edits.json, or monthly Semantic Location History files (e.g. 2024_JANUARY.json)',
        ],
      },
      {
        number: 3,
        title: 'Upload to Travelback',
        items: [
          'Drop any of the JSON files here',
          'Use the timeline slider to select a date range',
        ],
      },
    ],
  },
]

const tips = [
  'Since 2024, Google stores Timeline data on-device — phone export usually has the most complete data',
  'Large files (100MB+) may take a moment to parse',
  'Use the timeline selector to zoom into specific trips',
]

export default function GoogleGuide({ isOpen, onClose }: GoogleGuideProps) {
  const [tab, setTab] = useState(0)

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
            Export Google Timeline
          </h3>
          <button
            onClick={onClose}
            className="transition-colors cursor-pointer flex-shrink-0"
            style={{ color: 'var(--t4)' }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Method tabs */}
        <div className="px-5 flex gap-2 mb-3">
          {methods.map((m, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className="px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors"
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
            Tips
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
