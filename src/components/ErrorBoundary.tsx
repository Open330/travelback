'use client'

import React from 'react'
import { t as translate, detectLocale } from '@/lib/i18n'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const locale = detectLocale()
      const t = (key: Parameters<typeof translate>[0]) => translate(key, locale)
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
          <div className="gc text-center max-w-md p-8" style={{ borderRadius: 'var(--r-glass)' }}>
            <p className="text-5xl mb-4">😵</p>
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

    return this.props.children
  }
}

