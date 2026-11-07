import { Component, type ErrorInfo, type ReactNode } from 'react'
import { errorKind, type AppErrorKind } from './appError.ts'
import { reportError } from './errorReport.ts'
import './ErrorBoundary.css'

const MESSAGES: Record<AppErrorKind, { title: string; body: string }> = {
  webgl: {
    title: 'Harita bu tarayıcıda gösterilemiyor',
    body: 'Haritayı çizmek için WebGL2 gerekiyor, ancak bu tarayıcıda ya da cihazda kullanılamıyor. Tarayıcı ayarlarından donanım hızlandırmayı açmayı ya da güncel bir tarayıcı kullanmayı deneyin.',
  },
  load: {
    title: 'Harita yüklenemedi',
    body: 'Haritanın dosyaları indirilemedi. İnternet bağlantınız kesilmiş ya da uygulama güncellenmiş olabilir. Bağlantınızı kontrol edip sayfayı yeniden yükleyin.',
  },
  other: {
    title: 'Bir şeyler ters gitti',
    body: 'Beklenmeyen bir hata oluştu. Sayfayı yeniden yüklemek çoğu zaman sorunu çözer.',
  },
}

/** What shows in place of the app once something has stopped it. */
function AppError({ kind }: { kind: AppErrorKind }) {
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
        <h1>{title}</h1>
        <p>{body}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Yeniden yükle
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
