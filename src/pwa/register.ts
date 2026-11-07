import { useSyncExternalStore } from 'react'

// A new version of the app, installed and waiting for the page to let it
// take over; null while there is none.
let waiting: ServiceWorker | null = null
const listeners = new Set<() => void>()

function setWaiting(worker: ServiceWorker | null) {
  waiting = worker
  for (const listener of listeners) listener()
}

/** A new version, ready to take over, if there is one. */
export function useWaitingWorker(): ServiceWorker | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => waiting,
  )
}

/** Lets the new version take over, and loads the page again with it. */
export function applyUpdate(): void {
  const worker = waiting
  if (!worker) return
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true },
  )
  worker.postMessage({ type: 'SKIP_WAITING' })
}

/** How often an open app looks for a new version, in ms. */
const CHECK_EVERY_MS = 60 * 60_000

/**
 * Installs the service worker that keeps the app working offline, in
 * production builds only, and watches for new versions of it.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(watch)
      .catch(() => {
        // Without it the app works as before, only not offline
      })
  })
}

function watch(registration: ServiceWorkerRegistration) {
  // Only an update counts: the first install has no page to replace
  const isUpdate = () => !!navigator.serviceWorker.controller
  if (registration.waiting && isUpdate()) setWaiting(registration.waiting)
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && isUpdate()) setWaiting(worker)
    })
  })
  const check = () => void registration.update().catch(() => {})
  setInterval(check, CHECK_EVERY_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}
