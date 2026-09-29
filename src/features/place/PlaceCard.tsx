import { Popup } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import { reverseGeocode } from '../search/photon.ts'
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
      maxWidth="300px"
      closeOnClick={false}
      onClose={onClose}
      className="place-card"
    >
      <h2 className="place-name">{place.name}</h2>
      {place.category && place.category !== place.name && (
        <p className="place-category">{place.category}</p>
      )}
      {address !== null && (
        <p className="place-address">{address ?? 'Adres aranıyor…'}</p>
      )}
      <button type="button" className="place-directions" onClick={onDirections}>
        Yol tarifi
      </button>
    </Popup>
  )
}
