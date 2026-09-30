import { Popup } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { reverseGeocode } from '../search/photon.ts'
import { categoryInfo, labelColor } from './categories.ts'
import CategoryBadge from './CategoryBadge.tsx'
import type { Place } from './place.ts'
import './PlaceCard.css'

type Props = {
  place: Place
  offset: number
  onDirections: () => void
  onClose: () => void
}

export default function PlaceCard({
  place,
  offset,
  onDirections,
  onClose,
}: Props) {
  const [lng, lat] = place.lngLat
  const needsLookup = place.address === undefined
  // undefined while the lookup runs, null when it finds nothing
  const [lookedUp, setLookedUp] = useState<string | null>()
  const address = needsLookup ? lookedUp : place.address
  const info = categoryInfo(place.categoryKey)

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
      className="place-card"
    >
      <div className="place-header">
        <CategoryBadge categoryKey={place.categoryKey} size={42} />
        <div className="place-title">
          <h2 className="place-name">{place.name}</h2>
          {place.category && place.category !== place.name && (
            <p
              className="place-category"
              style={info && { color: labelColor(info.color) }}
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
      {address !== null && (
        <p className="place-address">
          <Icon name="pin" size={16} />
          <span>{address ?? 'Adres aranıyor…'}</span>
        </p>
      )}
      <button type="button" className="place-directions" onClick={onDirections}>
        <Icon name="directions" size={18} />
        Yol tarifi
      </button>
    </Popup>
  )
}
