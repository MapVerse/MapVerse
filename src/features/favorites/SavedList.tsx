import { useMap } from '@vis.gl/react-maplibre'
import { useId, useRef, useState, type Ref } from 'react'
import { t, useLocale } from '../../i18n/index.ts'
import { Icon } from '../../icons/Icon.tsx'
import type { Place } from '../place/place.ts'
import {
  KIND_ICONS,
  favoriteDetail,
  favoritePlace,
  favoriteTitle,
  type Favorite,
} from './favorites.ts'
import { MAX_FILE_BYTES, fromGeoJSON, toGeoJSON } from './geojson.ts'
import {
  importFavorites,
  removeFavorite,
  useFavorites,
} from './useFavorites.ts'
import './SavedList.css'

type Props = {
  /** Opens a saved place, as a place or as a bare point */
  onOpen: (place: Place, point: boolean) => void
  ref?: Ref<HTMLDivElement>
}

/**
 * The saved places, in the profile menu: each opens with a click and goes
 * with its bin button; all of them go out to a GeoJSON file, and places
 * come in from one, those saved already left out.
 */
export default function SavedList({ onOpen, ref }: Props) {
  const { current: map } = useMap()
  useLocale()
  const favorites = useFavorites()
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<string | null>(null)
  const labelId = useId()

  function open(f: Favorite) {
    map?.flyTo({ center: f.lngLat, zoom: Math.max(map.getZoom(), 16) })
    onOpen(favoritePlace(f), !!f.point)
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(toGeoJSON(favorites), null, 2)], {
      type: 'application/geo+json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = t('saved.fileName')
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote(null)
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setNote(t('saved.fileTooBig'))
      return
    }
    let found: Favorite[] | null = null
    try {
      found = fromGeoJSON(await file.text())
    } catch {
      found = null
    }
    if (!found) setNote(t('saved.fileUnreadable'))
    else if (!found.length) setNote(t('saved.fileEmpty'))
    else {
      const added = importFavorites(found)
      setNote(added ? t('saved.added', { count: added }) : t('saved.allSaved'))
    }
  }

  return (
    <div
      ref={ref}
      className="mv-settings-section mv-saved"
      role="group"
      aria-labelledby={labelId}
    >
      <span id={labelId} className="mv-settings-label">
        {t('saved.title')}
      </span>
      {favorites.length > 0 ? (
        <ul className="mv-saved-list">
          {favorites.map((f) => {
            const detail = favoriteDetail(f)
            return (
              <li key={f.key}>
                <button
                  type="button"
                  className="mv-saved-open"
                  onClick={() => open(f)}
                >
                  <span className={`mv-saved-icon is-${f.kind}`}>
                    <Icon name={KIND_ICONS[f.kind]} size={17} />
                  </span>
                  <span className="mv-saved-text">
                    <span className="mv-saved-name">{favoriteTitle(f)}</span>
                    {detail && (
                      <span className="mv-saved-detail">{detail}</span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className="mv-saved-remove"
                  aria-label={t('saved.removeOf', { name: favoriteTitle(f) })}
                  title={t('common.remove')}
                  onClick={() => removeFavorite(f.key)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mv-settings-hint">{t('saved.empty')}</p>
      )}
      <div className="mv-saved-files">
        <button
          type="button"
          disabled={favorites.length === 0}
          onClick={exportFile}
        >
          <Icon name="download" size={17} />
          {t('saved.export')}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={17} />
          {t('saved.import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          hidden
          onChange={(event) => {
            void importFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>
      <p className="mv-settings-hint mv-saved-note" aria-live="polite">
        {note ?? t('saved.fileNote')}
      </p>
    </div>
  )
}
