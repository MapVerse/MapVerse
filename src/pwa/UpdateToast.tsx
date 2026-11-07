import { useState } from 'react'
import { applyUpdate, useWaitingWorker } from './register.ts'
import './UpdateToast.css'

/** A small note that a new version is ready, and a button to switch to it. */
export default function UpdateToast() {
  const waiting = useWaitingWorker()
  const [reloading, setReloading] = useState(false)
  if (!waiting) return null
  return (
    <div className="mv-update mv-glass" role="status">
      <span>Yeni sürüm hazır</span>
      <button
        type="button"
        disabled={reloading}
        onClick={() => {
          setReloading(true)
          applyUpdate()
        }}
      >
        Yenile
      </button>
    </div>
  )
}
