import { useMap } from '@vis.gl/react-maplibre'
import { useId, useRef, useState, type Ref } from 'react'
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

const FILE_NAME = 'mapverse-kayitli-yerler.geojson'

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
    link.download = FILE_NAME
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote(null)
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setNote('Dosya çok büyük.')
      return
    }
    let found: Favorite[] | null = null
    try {
      found = fromGeoJSON(await file.text())
    } catch {
      found = null
    }
    if (!found) setNote('Bu dosya okunamadı; GeoJSON olmalı.')
    else if (!found.length) setNote('Dosyada kaydedilecek nokta yok.')
    else {
      const added = importFavorites(found)
      setNote(
        added
          ? `${added} yer eklendi.`
          : 'Dosyadaki yerlerin hepsi zaten kayıtlı.',
      )
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
        Kayıtlı yerler
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
                  aria-label={`${favoriteTitle(f)}: kaldır`}
                  title="Kaldır"
                  onClick={() => removeFavorite(f.key)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mv-settings-hint">
          Bir yerin panelindeki Kaydet düğmesiyle onu ev, iş ya da yıldızlı yer
          olarak kaydedebilirsin.
        </p>
      )}
      <div className="mv-saved-files">
        <button
          type="button"
          disabled={favorites.length === 0}
          onClick={exportFile}
        >
          <Icon name="download" size={17} />
          Dışa aktar
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={17} />
          İçe aktar
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
        {note ?? 'GeoJSON dosyası olarak; yalnızca bu cihazda saklanır.'}
      </p>
    </div>
  )
}
