'use client'

import { useLocale } from '@/lib/i18n'

interface KeyboardHelpProps {
  isOpen: boolean
  hasTrack: boolean
  onToggle: () => void
  onClose: () => void
}

export default function KeyboardHelp({ isOpen, hasTrack, onToggle, onClose }: KeyboardHelpProps) {
  const { t } = useLocale()

  return (
    <>
      {hasTrack && (
        <button
          onClick={onToggle}
          aria-label={t('shortcuts.title')}
          className="absolute bottom-4 right-4 z-10 gi w-8 h-8 text-sm font-bold cursor-pointer hidden sm:flex items-center justify-center"
          style={{ color: 'var(--t4)', borderRadius: '50%' }}
        >?</button>
      )}

      {isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" onClick={onClose}>
          <div className="go p-6 max-w-xs w-full mx-4" style={{ borderRadius: 'var(--r-glass)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--t1)' }}>{t('shortcuts.title')}</h3>
            <div className="space-y-2 text-xs" style={{ color: 'var(--t3)' }}>
              {([
                ['Space', t('shortcuts.playPause')],
                ['← →', t('shortcuts.seek')],
                ['F', t('shortcuts.follow')],
                ['E', t('shortcuts.export')],
                ['Esc', t('shortcuts.close')],
                ['?', t('shortcuts.help')],
              ] as const).map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="gi px-2 py-0.5 text-[10px] font-mono font-bold shrink-0" style={{ color: 'var(--t2)', minWidth: '2.5rem', textAlign: 'center' }}>
                    {key}
                  </kbd>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
