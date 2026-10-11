import { useMap } from '@vis.gl/react-maplibre'
import { useId } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import type { StrokeName } from '../../icons/strokes.ts'
import {
  MAP_DESIGNS,
  setMapDesign,
  useMapDesign,
  type MapDesign,
} from '../../map/designSetting.ts'
import { designSwatch } from '../../map/style.ts'
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

const DESIGN_LABELS: Record<MapDesign, string> = {
  standard: 'Standart',
  vintage: 'Eski harita',
  'san-andreas': 'San Andreas',
}

/** A tiny map in a design's colours: ground, a park, water and two roads. */
function DesignPreview({ design }: { design: MapDesign }) {
  const theme = useTheme()
  const c = designSwatch(design, theme)
  return (
    <svg
      className="mv-settings-design-preview"
      viewBox="0 0 64 40"
      aria-hidden="true"
    >
      <rect width="64" height="40" fill={c.land} />
      <rect x="4" y="4" width="18" height="13" rx="2" fill={c.green} />
      <path d="M40 40 C44 28 54 24 64 22 V40 Z" fill={c.water} />
      <path d="M0 26 H64" stroke={c.casing} strokeWidth="5" />
      <path d="M0 26 H64" stroke={c.road} strokeWidth="3" />
      <path d="M30 0 V40" stroke={c.casing} strokeWidth="6" />
      <path d="M30 0 V40" stroke={c.motorway} strokeWidth="4" />
    </svg>
  )
}

/** Theme, map design, 3D terrain and recent searches, shown in the account menu. */
export default function SettingsSections() {
  const { current: map } = useMap()
  const preference = useThemePreference()
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const design = useMapDesign()
  const recent = useRecentSearches()
  const themeLabelId = useId()
  const designLabelId = useId()
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
        <span id={designLabelId} className="mv-settings-label">
          Harita tasarımı
        </span>
        <div
          className="mv-settings-designs"
          role="group"
          aria-labelledby={designLabelId}
        >
          {MAP_DESIGNS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={design === option}
              onClick={() => setMapDesign(option)}
            >
              <DesignPreview design={option} />
              {DESIGN_LABELS[option]}
            </button>
          ))}
        </div>
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
