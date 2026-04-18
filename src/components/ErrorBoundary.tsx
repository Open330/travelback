'use client'

import React from 'react'
import { useLocale, t as translate, type Locale } from '@/lib/i18n'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  resetKey: number
}

class ErrorBoundaryInner extends React.Component<
  { children: React.ReactNode; locale: Locale },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; locale: Locale }) {
    super(props)
    this.state = { hasError: false, error: null, resetKey: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleReset = () => {
    this.setState((prev) => ({ hasError: false, error: null, resetKey: prev.resetKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      const t = (key: Parameters<typeof translate>[0]) => translate(key, this.props.locale)
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
          <div className="gc text-center max-w-md p-8" style={{ borderRadius: 'var(--r-glass)' }}>
            <p className="text-5xl mb-4" aria-hidden="true">😵</p>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
              {t('error.title')}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--t3)' }}>
              {t('error.fallback')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="gi px-4 py-2 text-sm font-medium cursor-pointer"
                style={{ color: 'var(--t1)' }}
              >
                {t('error.tryAgain')}
              </button>
              <button
                onClick={this.handleReload}
                className="vitro-btn-primary px-4 py-2 text-sm font-medium cursor-pointer"
              >
                {t('error.reloadPage')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>
  }
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()

  return (
    <ErrorBoundaryInner locale={locale}>
      {children}
    </ErrorBoundaryInner>
  )
}
