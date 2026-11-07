import { useMap } from '@vis.gl/react-maplibre'
import { useId } from 'react'
import {
  setLocalePreference,
  t,
  useLocale,
  useLocalePreference,
  type LocalePreference,
  type MessageKey,
} from '../../i18n/index.ts'
import { Icon } from '../../icons/Icon.tsx'
import type { StrokeName } from '../../icons/strokes.ts'
import {
  MAP_DESIGNS,
  setMapDesign,
  useMapDesign,
  type MapDesign,
} from '../../map/designSetting.ts'
import {
  setSatelliteEnabled,
  useSatelliteEnabled,
} from '../../map/satelliteSetting.ts'
import { setShortcutHelpOpen } from '../../map/shortcuts.ts'
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
import { HOVER_QUERY, useMediaQuery } from '../../lib/useMediaQuery.ts'
import {
  clearRecentSearches,
  useRecentSearches,
} from '../search/useRecentSearches.ts'
import './Settings.css'

const THEMES: {
  value: ThemePreference
  label: MessageKey
  icon: StrokeName
}[] = [
  { value: 'light', label: 'settings.light', icon: 'sun' },
  { value: 'dark', label: 'settings.dark', icon: 'moon' },
  { value: 'system', label: 'settings.system', icon: 'monitor' },
]

/**
 * The languages, each named in itself so it can be found whatever the
 * interface speaks; and the browser's own.
 */
const LANGUAGES: { value: LocalePreference; name?: string; lang?: string }[] = [
  { value: 'tr', name: 'Türkçe', lang: 'tr' },
  { value: 'en', name: 'English', lang: 'en' },
  { value: 'system' },
]

const DESIGN_LABELS: Record<MapDesign, MessageKey> = {
  standard: 'settings.designStandard',
  vintage: 'settings.designVintage',
  'san-andreas': 'settings.designSanAndreas',
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

/** An on/off row of the settings: icon, label with a note, and a switch. */
function Switch({
  icon,
  label,
  note,
  checked,
  onToggle,
}: {
  icon: StrokeName
  label: string
  note: string
  checked: boolean
  onToggle: () => void
}) {
  const labelId = useId()
  const noteId = useId()
  return (
    <button
      type="button"
      role="switch"
      className="mv-settings-switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={noteId}
      onClick={onToggle}
    >
      <Icon name={icon} size={20} />
      <span className="mv-settings-switch-text">
        <span id={labelId}>{label}</span>
        <span id={noteId} className="mv-settings-note">
          {note}
        </span>
      </span>
      <span className="mv-settings-switch-track" aria-hidden="true" />
    </button>
  )
}

/**
 * Theme, language, map design, 3D terrain, satellite imagery, recent searches and,
 * with a keyboard, its shortcuts, shown in the account menu.
 */
export default function SettingsSections() {
  const { current: map } = useMap()
  const preference = useThemePreference()
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const satellite = useSatelliteEnabled()
  const design = useMapDesign()
  const language = useLocalePreference()
  useLocale()
  const recent = useRecentSearches()
  // A keyboard, most likely, where there is a mouse
  const keyboard = useMediaQuery(HOVER_QUERY)
  const themeLabelId = useId()
  const designLabelId = useId()
  const languageLabelId = useId()

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
          {t('settings.theme')}
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
              {t(option.label)}
            </button>
          ))}
        </div>
        {preference === 'system' && (
          <p className="mv-settings-hint">
            {t(
              theme === 'dark'
                ? 'settings.themeFollowsDark'
                : 'settings.themeFollowsLight',
            )}
          </p>
        )}
      </div>

      <div className="mv-settings-section">
        <span id={languageLabelId} className="mv-settings-label">
          {t('settings.language')}
        </span>
        <div
          className="mv-settings-themes"
          role="group"
          aria-labelledby={languageLabelId}
        >
          {LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              lang={option.lang}
              aria-pressed={language === option.value}
              onClick={() => setLocalePreference(option.value)}
            >
              {option.name ?? t('settings.system')}
            </button>
          ))}
        </div>
        {language === 'system' && (
          <p className="mv-settings-hint">{t('settings.languageFollows')}</p>
        )}
      </div>

      <div className="mv-settings-section">
        <span id={designLabelId} className="mv-settings-label">
          {t('settings.design')}
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
              {t(DESIGN_LABELS[option])}
            </button>
          ))}
        </div>
      </div>

      <div className="mv-settings-section">
        <span className="mv-settings-label">{t('settings.map')}</span>
        <Switch
          icon="mountain"
          label={t('settings.terrain')}
          note={t('settings.terrainNote')}
          checked={terrain}
          onToggle={toggleTerrain}
        />
        <Switch
          icon="satellite"
          label={t('settings.satellite')}
          note={t('settings.satelliteNote')}
          checked={satellite}
          onToggle={() => setSatelliteEnabled(!satellite)}
        />
      </div>

      <div className="mv-settings-section">
        <span className="mv-settings-label">{t('settings.recent')}</span>
        <button
          type="button"
          className="mv-settings-clear"
          disabled={recent.length === 0}
          onClick={clearRecentSearches}
        >
          <Icon name="trash" size={18} />
          {t(recent.length > 0 ? 'settings.clearRecent' : 'settings.noRecent')}
        </button>
      </div>

      {keyboard && (
        <div className="mv-settings-section">
          <button
            type="button"
            className="mv-settings-link"
            aria-haspopup="dialog"
            onClick={() => setShortcutHelpOpen(true)}
          >
            <Icon name="keyboard" size={18} />
            {t('settings.shortcuts')}
            <kbd>?</kbd>
          </button>
        </div>
      )}
    </>
  )
}
