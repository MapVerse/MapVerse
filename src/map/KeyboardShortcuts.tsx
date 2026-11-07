import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toggleMeasuring } from '../features/measure/measureMode.ts'
import { t, useLocale } from '../i18n/index.ts'
import { Icon } from '../icons/Icon.tsx'
import './KeyboardShortcuts.css'
import {
  SHORTCUTS,
  setShortcutHelpOpen,
  shortcutFor,
  useShortcutHelpOpen,
} from './shortcuts.ts'
import { toggleTilt } from './tilt.ts'

/**
 * The map's keys, heard anywhere on the page but never while typing:
 * + and − zoom, 3 tilts the map to 3D and back, M measures a distance and
 * ? lists them all in a small dialog.
 */
export default function KeyboardShortcuts() {
  const { current: map } = useMap()
  const open = useShortcutHelpOpen()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      const action = shortcutFor(event)
      if (!action) return
      const m = map?.getMap()
      // On the map itself, MapLibre zooms on + and − already
      const onMap =
        event.target instanceof Element &&
        !!event.target.closest('.maplibregl-canvas-container')
      if (action === 'zoom-in' || action === 'zoom-out') {
        if (!m || onMap) return
        if (action === 'zoom-in') m.zoomIn()
        else m.zoomOut()
      } else if (event.repeat) {
        return
      } else if (action === 'tilt') {
        if (m) toggleTilt(m)
      } else if (action === 'measure') {
        toggleMeasuring()
      } else {
        setShortcutHelpOpen(true)
      }
      event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [map])

  return open ? <ShortcutHelp /> : null
}

/**
 * The list of keys, in a modal dialog: the page behind it is out of reach
 * while it is open, Escape or the button closes it, and the focus goes
 * back to where it was.
 */
function ShortcutHelp() {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLocale()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const before = document.activeElement
    element.showModal()
    // Escape closes the dialog and only that: heard before anything else
    // on the page, such as the profile menu it may have been opened from
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== '?') return
      event.stopPropagation()
      event.preventDefault()
      setShortcutHelpOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      element.close()
      if (before instanceof HTMLElement && before.isConnected) {
        before.focus({ preventScroll: true })
      }
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialog}
      className="mv-shortcuts mv-glass"
      aria-labelledby={titleId}
      // Closed some other way (the browser's own Escape), all the same
      onClose={() => setShortcutHelpOpen(false)}
      // A click on the backdrop, outside the box, closes it too
      onClick={(event) => {
        if (event.target === event.currentTarget) setShortcutHelpOpen(false)
      }}
    >
      <div className="mv-shortcuts-body">
        <div className="mv-shortcuts-head">
          <h2 id={titleId}>{t('shortcuts.title')}</h2>
          <button
            type="button"
            className="mv-shortcuts-close"
            aria-label={t('common.close')}
            onClick={() => setShortcutHelpOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <dl className="mv-shortcuts-list">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label}>
              <dt>
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{t(label)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>,
    document.body,
  )
}
