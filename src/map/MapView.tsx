import {
  GeolocateControl,
  Map,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapRef,
} from '@vis.gl/react-maplibre'
import { useState } from 'react'
import Directions from '../features/directions/Directions.tsx'
import Boundary from '../features/place/Boundary.tsx'
import PlaceCard from '../features/place/PlaceCard.tsx'
import type { Place } from '../features/place/place.ts'
import { findPoiLayerIds, toPoi } from '../features/place/poi.ts'
import SelectedPoi, { type PoiMatch } from '../features/place/SelectedPoi.tsx'
import SearchBox from '../features/search/SearchBox.tsx'
import './controls.css'
import { maplibre } from './maplibre.ts'
import { resolvePoiImage } from './poiStyle.ts'
import { MAP_STYLE } from './style.ts'
import TiltControl from './TiltControl.tsx'

// Istanbul; the URL hash (#zoom/lat/lng) takes precedence when present.
const INITIAL_VIEW = { longitude: 28.9784, latitude: 41.0082, zoom: 11 }

/** Turkish text for MapLibre's own buttons and labels. */
const LOCALE = {
  'AttributionControl.ToggleAttribution': 'Atıfları göster',
  'AttributionControl.MapFeedback': 'Harita hatası bildir',
  'GeolocateControl.FindMyLocation': 'Konumumu bul',
  'GeolocateControl.LocationNotAvailable': 'Konum kullanılamıyor',
  'Map.Title': 'Harita',
  'Marker.Title': 'İşaret',
  'NavigationControl.ResetBearing': 'Kuzeyi yukarı çevir',
  'NavigationControl.ZoomIn': 'Yakınlaştır',
  'NavigationControl.ZoomOut': 'Uzaklaştır',
  'Popup.Close': 'Kapat',
  'ScaleControl.Kilometers': 'km',
  'ScaleControl.Meters': 'm',
}

/** POI badges are drawn the first time the map needs each one. */
function installImageResolver(ref: MapRef | null) {
  const map = ref?.getMap()
  map?.setMissingStyleImageResolver((id) => resolvePoiImage(map, id))
}

/** `poi` is set when the place was picked from the map's own POIs. */
type Selection = { place: Place; poi?: PoiMatch }

export default function MapView() {
  const [poiLayerIds, setPoiLayerIds] = useState<string[]>([])
  const [hoveringPoi, setHoveringPoi] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [directionsTo, setDirectionsTo] = useState<Place | null>(null)
  const [labelLayerId, setLabelLayerId] = useState<string>()
  const place = selection?.place

  function onMapClick(event: MapLayerMouseEvent) {
    // Directions handle their own clicks (picking a starting point)
    if (directionsTo) return
    const feature = event.features?.[0]
    setSelection(
      feature
        ? {
            place: toPoi(feature, event.lngLat.toArray()),
            poi: {
              id: feature.id,
              name: feature.properties.name,
              class: feature.properties.class,
            },
          }
        : null,
    )
  }

  return (
    <Map
      mapLib={maplibre}
      initialViewState={INITIAL_VIEW}
      ref={installImageResolver}
      mapStyle={MAP_STYLE}
      locale={LOCALE}
      hash
      // Drops the default MapLibre link but keeps the data attribution the
      // licenses require; it collapses to an ⓘ button once the map is moved.
      attributionControl={{ compact: true }}
      interactiveLayerIds={directionsTo ? [] : poiLayerIds}
      cursor={hoveringPoi ? 'pointer' : undefined}
      onLoad={(event) => {
        const style = event.target.getStyle()
        setPoiLayerIds(findPoiLayerIds(style))
        setLabelLayerId(style.layers.find((l) => l.type === 'symbol')?.id)
      }}
      onMouseEnter={() => setHoveringPoi(true)}
      onMouseLeave={() => setHoveringPoi(false)}
      onClick={onMapClick}
    >
      <NavigationControl position="top-right" visualizePitch />
      <GeolocateControl position="top-right" trackUserLocation />
      <TiltControl position="top-right" />
      <ScaleControl position="bottom-left" />
      <SearchBox
        hidden={!!directionsTo}
        onSelect={(result) => setSelection({ place: result })}
        onClear={() => setSelection(null)}
      />
      {place?.outline && place.osm && (
        <Boundary key={`outline:${place.key}`} osm={place.osm} />
      )}
      {selection?.poi && !directionsTo && (
        <SelectedPoi
          lngLat={selection.place.lngLat}
          icon={selection.place.icon}
          iconColor={selection.place.iconColor}
          layerIds={poiLayerIds}
          match={selection.poi}
        />
      )}
      {selection && !directionsTo && (
        <PlaceCard
          key={`card:${selection.place.key}`}
          place={selection.place}
          offset={selection.poi ? 26 : 8}
          onDirections={() => setDirectionsTo(selection.place)}
          onClose={() => setSelection(null)}
        />
      )}
      {directionsTo && (
        <Directions
          to={directionsTo}
          beforeId={labelLayerId}
          onClose={() => setDirectionsTo(null)}
        />
      )}
    </Map>
  )
}
