import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t, useLocale, type MessageKey } from '../i18n/index.ts'
import { errorKind, type AppErrorKind } from './appError.ts'
import { reportError } from './errorReport.ts'
import './ErrorBoundary.css'

const MESSAGES: Record<AppErrorKind, { title: MessageKey; body: MessageKey }> =
  {
    webgl: { title: 'error.webglTitle', body: 'error.webglBody' },
    load: { title: 'error.loadTitle', body: 'error.loadBody' },
    other: { title: 'error.otherTitle', body: 'error.otherBody' },
  }

/** What shows in place of the app once something has stopped it. */
function AppError({ kind }: { kind: AppErrorKind }) {
  useLocale()
  const { title, body } = MESSAGES[kind]
  return (
    <main className="mv-app-error" role="alert">
      <div className="mv-app-error-card">
        <svg
          className="mv-app-error-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
          <path d="M9 4v14M15 6v6" />
          <path d="M15 16v.01" strokeWidth="2.4" />
        </svg>
        <h1>{t(title)}</h1>
        <p>{t(body)}</p>
        <button type="button" onClick={() => window.location.reload()}>
          {t('error.reload')}
        </button>
      </div>
    </main>
  )
}

/**
 * Catches whatever stops the app as it draws, so the user is told what
 * happened and can try again, rather than left with a blank page.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown; failed: boolean }
> {
  state = { error: undefined as unknown, failed: false }

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack)
    reportError(error)
  }

  render() {
    if (this.state.failed)
      return <AppError kind={errorKind(this.state.error)} />
    return this.props.children
  }
}
