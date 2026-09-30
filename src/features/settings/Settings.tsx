import { useControl, useMap } from '@vis.gl/react-maplibre'
import type { ControlPosition, IControl } from 'maplibre-gl'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons/Icon.tsx'
import type { StrokeName } from '../../icons/strokes.ts'
import {
  setTerrainEnabled,
  useTerrainEnabled,
} from '../../map/terrainSetting.ts'
import {
  setThemePreference,
  useTheme,
  useThemePreference,
  type ThemePreference,
} from '../../theme/theme.ts'
import {
  clearRecentSearches,
  useRecentSearches,
} from '../search/useRecentSearches.ts'
import './Settings.css'

/** An empty map control, for React to render the settings into. */
class Slot implements IControl {
  readonly container = document.createElement('div')

  onAdd() {
    this.container.className = 'maplibregl-ctrl mv-settings'
    return this.container
  }

  onRemove() {
    this.container.remove()
  }
}

const THEMES: { value: ThemePreference; label: string; icon: StrokeName }[] = [
  { value: 'light', label: 'Açık', icon: 'sun' },
  { value: 'dark', label: 'Koyu', icon: 'moon' },
  { value: 'system', label: 'Sistem', icon: 'monitor' },
]

/** A map button that opens the settings: theme, 3D terrain, recent searches. */
export default function Settings({ position }: { position: ControlPosition }) {
  const slot = useControl(() => new Slot(), { position })
  const { current: map } = useMap()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const preference = useThemePreference()
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const recent = useRecentSearches()
  const panelId = useId()
  const themeLabelId = useId()
  const terrainLabelId = useId()
  const terrainNoteId = useId()

  function toggleTerrain() {
    setTerrainEnabled(!terrain)
    // Relief only shows on a tilted map, so tilt a flat one
    if (!terrain && map && map.getPitch() < 10) {
      map.easeTo({ pitch: 55, duration: 1000 })
    }
  }

  // Close on Escape or on a click anywhere else
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!slot.container.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, slot])

  return createPortal(
    <>
      <button
        ref={toggleRef}
        type="button"
        className="mv-settings-toggle"
        title="Ayarlar"
        aria-label="Ayarlar"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="settings" size={20} />
      </button>
      {open && (
        <section
          id={panelId}
          className="mv-settings-panel"
          aria-label="Ayarlar"
        >
          <h2 className="mv-settings-title">Ayarlar</h2>

          <div className="mv-settings-section">
            <span id={themeLabelId} className="mv-settings-label">
              Tema
            </span>
            <div
              className="mv-settings-themes"
              role="group"
              aria-labelledby={themeLabelId}
            >
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={preference === option.value}
                  onClick={() => setThemePreference(option.value)}
                >
                  <Icon name={option.icon} size={20} />
                  {option.label}
                </button>
              ))}
            </div>
            {preference === 'system' && (
              <p className="mv-settings-hint">
                Cihazının ayarına uyar, şu an{' '}
                {theme === 'dark' ? 'koyu' : 'açık'}.
              </p>
            )}
          </div>

          <div className="mv-settings-section">
            <span className="mv-settings-label">Harita</span>
            <button
              type="button"
              role="switch"
              className="mv-settings-switch"
              aria-checked={terrain}
              aria-labelledby={terrainLabelId}
              aria-describedby={terrainNoteId}
              onClick={toggleTerrain}
            >
              <Icon name="mountain" size={20} />
              <span className="mv-settings-switch-text">
                <span id={terrainLabelId}>3B arazi</span>
                <span id={terrainNoteId} className="mv-settings-note">
                  Dağlar ve tepeler kabartmalı görünür
                </span>
              </span>
              <span className="mv-settings-switch-track" aria-hidden="true" />
            </button>
          </div>

          <div className="mv-settings-section">
            <span className="mv-settings-label">Son aramalar</span>
            <button
              type="button"
              className="mv-settings-clear"
              disabled={recent.length === 0}
              onClick={clearRecentSearches}
            >
              <Icon name="trash" size={18} />
              {recent.length > 0
                ? 'Son aramaları temizle'
                : 'Kayıtlı arama yok'}
            </button>
          </div>
        </section>
      )}
    </>,
    slot.container,
  )
}
