import {
  Map,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapRef,
} from '@vis.gl/react-maplibre'
import { Fragment, useRef, useState } from 'react'
import AccountMenu from '../features/account/AccountMenu.tsx'
import AreaNames from '../features/areas/AreaNames.tsx'
import LandmarkExtrusions from '../features/landmarks/LandmarkExtrusions.tsx'
import LandmarkSearchlights from '../features/landmarks/LandmarkSearchlights.tsx'
import Directions from '../features/directions/Directions.tsx'
import { resolveSignalImage } from '../features/traffic/signalImage.ts'
import TrafficSignals from '../features/traffic/TrafficSignals.tsx'
import Boundary from '../features/place/Boundary.tsx'
import { categoryInfo } from '../features/place/categories.ts'
import PlaceCard from '../features/place/PlaceCard.tsx'
import type { Place } from '../features/place/place.ts'
import { findPoiLayerIds, toPoi } from '../features/place/poi.ts'
import SelectedPoi, { type PoiMatch } from '../features/place/SelectedPoi.tsx'
import SearchBox from '../features/search/SearchBox.tsx'
import SearchResults, {
  SEARCH_RESULTS_LAYER,
} from '../features/search/SearchResults.tsx'
import {
  useCategorySearch,
  type CategorySearch,
} from '../features/search/useCategorySearch.ts'
import { usePresence } from '../lib/presence.ts'
import { useTheme } from '../theme/theme.ts'
import SanAndreasHud from './SanAndreasHud.tsx'
import './controls.css'
import { useMapDesign } from './designSetting.ts'
import MapControls from './MapControls.tsx'
import { maplibre } from './maplibre.ts'
import { resolvePoiImage } from './poiStyle.ts'
import { mapStyle } from './style.ts'
import { useTerrainEnabled } from './terrainSetting.ts'

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

/** POI badges and traffic lights are drawn the first time the map needs each one. */
function installImageResolver(ref: MapRef | null) {
  const map = ref?.getMap()
  map?.setMissingStyleImageResolver((id) => {
    if (!resolveSignalImage(map, id)) resolvePoiImage(map, id)
  })
}

/** `poi` is set when the place was picked from the map's own POIs. */
type Selection = { place: Place; poi?: PoiMatch }

/** How long a place's card and badge take to go, once let go, in ms. */
const LEAVING_MS = 200

export default function MapView() {
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const design = useMapDesign()
  const [poiLayerIds, setPoiLayerIds] = useState<string[]>([])
  const [hoveringPoi, setHoveringPoi] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  // Open directions, to a place or (when null) to a point picked on the
  // map, counted so each opening starts afresh
  const [directions, setDirections] = useState<{
    to: Place | null
    opening: number
  } | null>(null)
  const openings = useRef(0)
  const openDirections = (to: Place | null) =>
    setDirections({ to, opening: ++openings.current })
  const [labelLayerId, setLabelLayerId] = useState<string>()
  // Places of a category near where the map was, picked from the search box
  const [categorySearch, setCategorySearch] = useState<CategorySearch | null>(
    null,
  )
  const nearby = useCategorySearch(categorySearch)
  const place = selection?.place
  const onResultMarker = (key: string) =>
    nearby.results.some((r) => r.key === key)
  // Directions on screen, and a moment longer once closed, on their way
  // out; opened again, they start afresh
  const directionsShown = usePresence(
    directions,
    directions ? `directions:${directions.opening}` : null,
    LEAVING_MS,
  )
  // The selection on screen, and any let go of a moment ago on its way out
  const shown = usePresence(
    directions ? null : selection,
    directions ? null : (selection?.place.key ?? null),
    LEAVING_MS,
  )

  function onMapClick(event: MapLayerMouseEvent) {
    // Directions handle their own clicks (picking either end of a route)
    if (directions) return
    const feature = event.features?.[0]
    if (feature?.layer.id === SEARCH_RESULTS_LAYER) {
      const result = nearby.results.find(
        (r) => r.key === feature.properties.key,
      )
      if (result) setSelection({ place: result })
      return
    }
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
      mapStyle={mapStyle(theme, terrain, design)}
      locale={LOCALE}
      hash
      // Drops the default MapLibre link but keeps the data attribution the
      // licenses require; it collapses to an ⓘ button once the map is moved.
      attributionControl={{ compact: true }}
      interactiveLayerIds={
        directions ? [] : [SEARCH_RESULTS_LAYER, ...poiLayerIds]
      }
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
      <AccountMenu position="top-right" />
      <MapControls />
      <ScaleControl position="bottom-left" />
      {design === 'san-andreas' && <SanAndreasHud />}
      {poiLayerIds.length > 0 && <AreaNames beforeId={poiLayerIds[0]} />}
      {poiLayerIds.length > 0 && <TrafficSignals beforeId={poiLayerIds[0]} />}
      {labelLayerId && <LandmarkExtrusions beforeId={labelLayerId} />}
      {labelLayerId && <LandmarkSearchlights beforeId={labelLayerId} />}
      <SearchBox
        hidden={!!directions}
        onSelect={(result) => setSelection({ place: result })}
        onClear={() => setSelection(null)}
        onDirections={() => openDirections(selection?.place ?? null)}
        nearby={categorySearch && { ...categorySearch, ...nearby }}
        onCategory={setCategorySearch}
      />
      {categorySearch && !directions && (
        <SearchResults results={nearby.results} selectedKey={place?.key} />
      )}
      {place?.outline && place.osm && (
        <Boundary key={`outline:${place.key}`} osm={place.osm} />
      )}
      {shown.map(({ key, item, leaving }) => (
        <Fragment key={key}>
          {item.poi && (
            <SelectedPoi
              lngLat={item.place.lngLat}
              icon={item.place.icon}
              color={categoryInfo(item.place.categoryKey)?.color}
              match={item.poi}
              leaving={leaving}
            />
          )}
          <PlaceCard
            place={item.place}
            // Clear of the badge it points at
            offset={item.poi ? 26 : onResultMarker(key) ? 20 : 8}
            leaving={leaving}
            onDirections={() => openDirections(item.place)}
            onClose={() => setSelection(null)}
          />
        </Fragment>
      ))}
      {directionsShown.map(({ key, item, leaving }) => (
        <Directions
          key={key}
          to={item.to}
          beforeId={labelLayerId}
          leaving={leaving}
          onClose={() => setDirections(null)}
        />
      ))}
    </Map>
  )
}
