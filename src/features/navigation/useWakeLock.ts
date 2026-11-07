import { useEffect } from 'react'

/**
 * Keeps the screen on while `active`, where the browser can (the Screen
 * Wake Lock API). The lock goes whenever the page is hidden, so it is
 * taken again each time the page comes back.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let done = false
    const take = () => {
      if (document.visibilityState !== 'visible') return
      if (lock && !lock.released) return
      navigator.wakeLock
        .request('screen')
        .then((taken) => {
          if (done) void taken.release()
          else lock = taken
        })
        // Refused (low battery, or not allowed here): the screen may dim
        .catch(() => {})
    }
    take()
    document.addEventListener('visibilitychange', take)
    return () => {
      done = true
      document.removeEventListener('visibilitychange', take)
      lock?.release().catch(() => {})
    }
  }, [active])
}
