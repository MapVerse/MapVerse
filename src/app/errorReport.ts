// Opt-in error reports: only when the app is built with
// VITE_ERROR_REPORT_URL set; otherwise nothing is ever sent.

export type ErrorReport = {
  message: string
  stack?: string
  /** The page, without its query or hash, which may hold where you are */
  url: string
  userAgent: string
  version: string
  commit: string
}

/** How much of a message and a stack go in a report, in characters. */
export const MAX_MESSAGE = 500
export const MAX_STACK = 2000
/** How many reports one visit to the app may send. */
export const MAX_REPORTS = 5

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

/** What a report says about an error, whatever was thrown. */
export function buildReport(
  error: unknown,
  page: { href: string; userAgent: string },
  build: { version: string; commit: string },
): ErrorReport {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : safeString(error)
  const stack = error instanceof Error ? error.stack : undefined
  return {
    message: clip(message, MAX_MESSAGE),
    ...(stack ? { stack: clip(stack, MAX_STACK) } : {}),
    url: pageUrl(page.href),
    userAgent: page.userAgent,
    ...build,
  }
}

function safeString(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/** A page's address without its query and hash. */
export function pageUrl(href: string): string {
  try {
    const url = new URL(href)
    return `${url.origin}${url.pathname}`
  } catch {
    return href.split(/[?#]/)[0]
  }
}

/**
 * Lets a report through at most once per message, and only so many in
 * all: one failure repeating, frame after frame, sends one report.
 */
export function createLimiter(max = MAX_REPORTS) {
  const seen = new Set<string>()
  return (report: ErrorReport): boolean => {
    if (seen.size >= max || seen.has(report.message)) return false
    seen.add(report.message)
    return true
  }
}

/** Sends a report so it goes even as the page unloads. */
export function send(endpoint: string, report: ErrorReport): void {
  // As text/plain it needs no CORS preflight; the body is JSON all the same
  const body = JSON.stringify(report)
  const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' })
  try {
    if (navigator.sendBeacon?.(endpoint, blob)) return
  } catch {
    // Some browsers refuse beacons outright; fall through to fetch
  }
  fetch(endpoint, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    keepalive: true,
    mode: 'no-cors',
    credentials: 'omit',
  }).catch(() => {
    // A report that can't be sent is let go of
  })
}

const ENDPOINT = import.meta.env.VITE_ERROR_REPORT_URL?.trim() || undefined
const allow = createLimiter()

/** Reports an error, if the app was built to; else does nothing. */
export function reportError(error: unknown): void {
  if (!ENDPOINT) return
  const report = buildReport(
    error,
    { href: location.href, userAgent: navigator.userAgent },
    { version: __APP_VERSION__, commit: __APP_COMMIT__ },
  )
  if (allow(report)) send(ENDPOINT, report)
}

/** Reports what goes uncaught anywhere in the page, if the app was built to. */
export function installErrorReporting(): void {
  if (!ENDPOINT) return
  window.addEventListener('error', (event) => {
    // A script from elsewhere fails as a bare "Script error.", which says nothing
    if (!event.error && /^script error\.?$/i.test(event.message)) return
    reportError(event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    // A request let go of, as the map moves on, is no failure
    const reason: unknown = event.reason
    if (reason instanceof Error && reason.name === 'AbortError') return
    reportError(reason)
  })
}
