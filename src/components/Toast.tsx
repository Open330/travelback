'use client'

import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

export interface ToastMessage {
  id: string
  text: string
  type: 'error' | 'success' | 'info'
}

interface ToastProps {
  messages: ToastMessage[]
  onDismiss: (id: string) => void
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const { t } = useLocale()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const statusColor = message.type === 'error'
    ? 'var(--err)'
    : message.type === 'success'
    ? 'var(--ok)'
    : 'rgb(var(--gl))'

  return (
    <div
      className={`go px-4 py-3 text-sm max-w-sm
        transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ borderLeft: `3px solid ${statusColor}`, color: 'var(--t1)' }}
    >
      <div className="flex items-start gap-2">
        <span className="flex-1">{message.text}</span>
        <button onClick={onDismiss} className="cursor-pointer flex-shrink-0"
          style={{ color: 'var(--t4)' }}
          aria-label={t('toast.dismiss')}>
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

export default function Toast({ messages, onDismiss }: ToastProps) {
  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
      {messages.map(msg => (
        <ToastItem key={msg.id} message={msg} onDismiss={() => onDismiss(msg.id)} />
      ))}
    </div>
  )
}

/** Hook to manage toast state */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setMessages(prev => [...prev, { id, text, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  return { messages, addToast, dismissToast }
}

