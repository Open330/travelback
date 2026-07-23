'use client'

import React from 'react'
import { useLocale, t as translate, type Locale } from '@/lib/i18n'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  componentStack: string | null
  resetKey: number
  isResetting: boolean
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  locale: Locale
  onError?: (error: Error, info: React.ErrorInfo) => void
  onReset?: () => void | Promise<void>
}

class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      resetKey: 0,
      isResetting: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
    console.error('ErrorBoundary caught:', error.message, info.componentStack)
    // Preserve the component stack for display in development mode
    this.setState({ componentStack: info.componentStack ?? null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = async () => {
    if (this.state.isResetting) return

    this.setState({ isResetting: true })
    try {
      await this.props.onReset?.()
      this.setState((prev) => ({
        hasError: false,
        error: null,
        componentStack: null,
        resetKey: prev.resetKey + 1,
        isResetting: false,
      }))
    } catch (error) {
      console.error(
        'ErrorBoundary reset failed:',
        error instanceof Error ? error.message : String(error),
      )
      this.setState({ isResetting: false })
    }
  }

  render() {
    if (this.state.hasError) {
      const t = (key: Parameters<typeof translate>[0]) => translate(key, this.props.locale)
      return (
        <main
          className="min-h-screen flex items-center justify-center p-8"
          style={{ background: 'var(--bg)' }}
          aria-busy={this.state.isResetting}
        >
          <div className="gc text-center max-w-md p-8" style={{ borderRadius: 'var(--r-glass)' }}>
            <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--err, #ef4444)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--t1)' }}>
              {t('error.title')}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--t3)' }}>
              {t('error.fallback')}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left text-xs" style={{ color: 'var(--t4)' }}>
                <summary className="cursor-pointer font-medium mb-2" style={{ color: 'var(--t5, var(--t4))' }}>
                  Error details (development only)
                </summary>
                <pre className="whitespace-pre-wrap break-all p-3 rounded opacity-70" style={{ background: 'rgba(var(--err-rgb, 239,68,68),.08)', maxHeight: '200px', overflow: 'auto' }}>
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      {'\n\n'}
                      {this.state.error.stack}
                    </>
                  )}
                  {this.state.componentStack && (
                    <>
                      {'\n\nComponent stack:'}
                      {this.state.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                disabled={this.state.isResetting}
                className="gi px-4 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'var(--t1)' }}
              >
                {t('error.tryAgain')}
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="vitro-btn-primary px-4 py-2 text-sm font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              >
                {t('error.reloadPage')}
              </button>
            </div>
          </div>
        </main>
      )
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>
  }
}

export default function ErrorBoundary({
  children,
  onError,
  onReset,
}: {
  children: React.ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
  onReset?: () => void | Promise<void>
}) {
  const { locale } = useLocale()

  return (
    <ErrorBoundaryInner locale={locale} onError={onError} onReset={onReset}>
      {children}
    </ErrorBoundaryInner>
  )
}
