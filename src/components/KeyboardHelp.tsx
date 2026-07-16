'use client'

import { X } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'

interface KeyboardHelpProps {
  isOpen: boolean
  onClose: () => void
}

export default function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  const { t } = useLocale()

  return (
    <ModalDialog
      open={isOpen}
      onClose={onClose}
      labelledBy="keyboard-help-title"
      overlayClassName="z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
      panelClassName="go mx-4 w-full max-w-sm p-6"
    >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="keyboard-help-title" className="text-sm font-bold" style={{ color: 'var(--t1)' }}>
              {t('shortcuts.title')}
            </h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--t4)' }}>
              {t('app.helpPanelSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('app.closePanel')}
            className="flex h-11 w-11 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
            style={{ color: 'var(--t4)' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-xs" style={{ color: 'var(--t3)' }}>
          {([
            ['Space', t('shortcuts.playPause')],
            ['← →', t('shortcuts.seek')],
            ['F', t('shortcuts.follow')],
            ['E', t('shortcuts.export')],
            ['Esc', t('shortcuts.close')],
            ['?', t('shortcuts.help')],
          ] as const).map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <kbd
                className="gi inline-flex min-w-[3rem] items-center justify-center px-2 py-1 text-[10px] font-mono font-bold"
                style={{ color: 'var(--t2)', textAlign: 'center' }}
              >
                {key}
              </kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
    </ModalDialog>
  )
}
