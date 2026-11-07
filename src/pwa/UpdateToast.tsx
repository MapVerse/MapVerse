import { useState } from 'react'
import { t, useLocale } from '../i18n/index.ts'
import { applyUpdate, useWaitingWorker } from './register.ts'
import './UpdateToast.css'

/** A small note that a new version is ready, and a button to switch to it. */
export default function UpdateToast() {
  const waiting = useWaitingWorker()
  useLocale()
  const [reloading, setReloading] = useState(false)
  if (!waiting) return null
  return (
    <div className="mv-update mv-glass" role="status">
      <span>{t('update.ready')}</span>
      <button
        type="button"
        disabled={reloading}
        onClick={() => {
          setReloading(true)
          applyUpdate()
        }}
      >
        {t('update.reload')}
      </button>
    </div>
  )
}
