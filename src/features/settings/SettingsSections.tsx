import { useMap } from '@vis.gl/react-maplibre'
import { useId } from 'react'
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

const THEMES: { value: ThemePreference; label: string; icon: StrokeName }[] = [
  { value: 'light', label: 'Açık', icon: 'sun' },
  { value: 'dark', label: 'Koyu', icon: 'moon' },
  { value: 'system', label: 'Sistem', icon: 'monitor' },
]

/** Theme, 3D terrain and recent searches, shown in the account menu. */
export default function SettingsSections() {
  const { current: map } = useMap()
  const preference = useThemePreference()
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const recent = useRecentSearches()
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

  return (
    <>
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
            Cihazının ayarına uyar, şu an {theme === 'dark' ? 'koyu' : 'açık'}.
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
          {recent.length > 0 ? 'Son aramaları temizle' : 'Kayıtlı arama yok'}
        </button>
      </div>
    </>
  )
}
