'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface ModalDialogProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  describedBy?: string
  overlayClassName?: string
  panelClassName?: string
  closeOnBackdrop?: boolean
  children: ReactNode
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

// Module-level state for managing the modal stacking order. During development
// HMR, the module is re-evaluated which resets these variables. The openModal
// and closeModal functions handle this gracefully because they check the stack
// contents before modifying DOM attributes. If HMR resets the stack while a
// modal is open, the worst case is that body scroll is not locked — a minor
// development-only inconvenience that is self-correcting on the next modal open.
const openModalStack: string[] = []
let lockedBodyOverflow: string | null = null

function getTopModalId() {
  return openModalStack[openModalStack.length - 1] ?? null
}

function openModal(modalId: string, appRoot: HTMLElement | null) {
  if (!openModalStack.includes(modalId)) {
    openModalStack.push(modalId)
  }

  if (openModalStack.length === 1) {
    lockedBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (appRoot) {
      appRoot.setAttribute('inert', '')
      appRoot.setAttribute('aria-hidden', 'true')
    }
  }
}

function closeModal(modalId: string, appRoot: HTMLElement | null) {
  const index = openModalStack.lastIndexOf(modalId)
  if (index !== -1) {
    openModalStack.splice(index, 1)
  }

  if (openModalStack.length === 0) {
    document.body.style.overflow = lockedBodyOverflow ?? ''
    lockedBodyOverflow = null
    if (appRoot) {
      appRoot.removeAttribute('inert')
      appRoot.removeAttribute('aria-hidden')
    }
  }
}

export default function ModalDialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  overlayClassName = '',
  panelClassName = '',
  closeOnBackdrop = true,
  children,
}: ModalDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const instanceId = useId()
  const modalIdRef = useRef(`travelback-modal-${instanceId}`)
  const canRenderPortal = typeof document !== 'undefined'

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!canRenderPortal || !open) return

    const modalId = modalIdRef.current
    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const appRoot = document.querySelector<HTMLElement>('[data-travelback-app-root="true"]')

    openModal(modalId, appRoot)

    const focusFirst = () => {
      if (getTopModalId() !== modalId) return
      const panel = panelRef.current
      if (!panel) return

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .find((element) => isVisible(element))

      ;(focusable ?? panel).focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (getTopModalId() !== modalId) return
      const panel = panelRef.current
      if (!panel) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => isVisible(element))

      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (activeElement === first || activeElement === panel) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const frame = requestAnimationFrame(focusFirst)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      closeModal(modalId, appRoot)
      if (previousActiveElement && document.body.contains(previousActiveElement)) {
        previousActiveElement.focus()
      }
    }
  }, [canRenderPortal, open])

  if (!canRenderPortal || !open) return null

  return createPortal(
    <div
      className={`fixed inset-0 ${overlayClassName}`.trim()}
      onMouseDown={(event) => {
        if (!closeOnBackdrop) return
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={panelClassName}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
