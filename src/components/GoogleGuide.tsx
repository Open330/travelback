'use client'

interface GoogleGuideProps {
  isOpen: boolean
  onClose: () => void
}

const steps = [
  {
    number: 1,
    title: 'Go to Google Takeout',
    items: [
      'Visit takeout.google.com',
      'Deselect all, then select only "Location History"',
    ],
    action: {
      label: 'Open Google Takeout',
      href: 'https://takeout.google.com',
    },
  },
  {
    number: 2,
    title: 'Choose export settings',
    items: [
      'Select JSON format',
      'Choose "Export once"',
      'Click "Create export"',
    ],
  },
  {
    number: 3,
    title: 'Download & extract',
    items: [
      'Wait for the email from Google',
      'Download the zip file',
      'Extract and find "Records.json" or "Location History.json"',
    ],
  },
  {
    number: 4,
    title: 'Upload to Travelback',
    items: [
      'Drop the JSON file into Travelback',
      'Use the timeline slider to select a date range',
      'Play and export your journey!',
    ],
  },
]

const tips = [
  'Large files (100MB+) may take a moment to parse',
  'Use the timeline selector to zoom into specific trips',
  'Google Location History updates may be delayed',
]

export default function GoogleGuide({ isOpen, onClose }: GoogleGuideProps) {
  if (!isOpen) return null

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 pb-3 sticky top-0 bg-white dark:bg-zinc-800 rounded-t-2xl z-10">
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
            Export Google Location History
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 pb-3 space-y-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-3 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-700/50"
            >
              {/* Number circle */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">{step.number}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100 mb-1">
                  {step.title}
                </p>
                <ul className="space-y-0.5">
                  {step.items.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-500 dark:text-zinc-400">
                      {item}
                    </li>
                  ))}
                </ul>
                {step.action && (
                  <a
                    href={step.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-cyan-500
                      hover:bg-cyan-600 text-white text-sm font-medium rounded-lg
                      transition-colors"
                  >
                    {step.action.label}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mx-5 mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
            Tips
          </p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-amber-600 dark:text-amber-500 flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
