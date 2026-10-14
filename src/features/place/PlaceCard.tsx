import { Popup } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { useTheme } from '../../theme/theme.ts'
import { reverseGeocode } from '../search/photon.ts'
import { categoryInfo, labelColor } from './categories.ts'
import CategoryBadge from './CategoryBadge.tsx'
import type { Place } from './place.ts'
import './PlaceCard.css'

type Props = {
  place: Place
  offset: number
  /** On its way out, shrinking back into its place */
  leaving?: boolean
  onDirections: () => void
  onClose: () => void
}

export default function PlaceCard({
  place,
  offset,
  leaving = false,
  onDirections,
  onClose,
}: Props) {
  const [lng, lat] = place.lngLat
  const needsLookup = place.address === undefined
  // undefined while the lookup runs, null when it finds nothing
  const [lookedUp, setLookedUp] = useState<string | null>()
  const address = needsLookup ? lookedUp : place.address
  const info = categoryInfo(place.categoryKey)
  const theme = useTheme()

  useEffect(() => {
    if (!needsLookup) return
    const controller = new AbortController()
    reverseGeocode(place.lngLat, controller.signal)
      .then(setLookedUp)
      .catch(() => {
        if (!controller.signal.aborted) setLookedUp(null)
      })
    return () => controller.abort()
  }, [needsLookup, place.lngLat])

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      offset={offset}
      maxWidth="320px"
      closeButton={false}
      closeOnClick={false}
      // Keep focus where it was (e.g. the search box): moving it onto the card's
      // button let the Enter that picked a result press that button as well
      focusAfterOpen={false}
      onClose={onClose}
      className={`place-card${leaving ? ' is-leaving' : ''}`}
    >
      <div className="place-header">
        <CategoryBadge categoryKey={place.categoryKey} size={42} />
        <div className="place-title">
          <h2 className="place-name">{place.name}</h2>
          {place.category && place.category !== place.name && (
            <p
              className="place-category"
              style={info && { color: labelColor(info.color, theme) }}
            >
              {place.category}
            </p>
          )}
        </div>
        <button
          type="button"
          className="place-close"
          aria-label="Kartı kapat"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      {/* While the address is looked up, a shimmering outline of it; if there
          turns out to be none, the row folds away */}
      <div
        className={`place-address-row${address === null ? ' is-empty' : ''}`}
      >
        <div>
          <p className="place-address" aria-busy={!address}>
            <Icon name="pin" size={16} />
            {address ? (
              <span className="place-address-text">{address}</span>
            ) : (
              <span className="place-skeleton" role="status">
                <span className="place-skeleton-hint">Adres aranıyor…</span>
                <span />
                <span />
              </span>
            )}
          </p>
        </div>
      </div>
      <button type="button" className="place-directions" onClick={onDirections}>
        <Icon name="directions" size={18} />
        Yol tarifi
      </button>
    </Popup>
  )
}
