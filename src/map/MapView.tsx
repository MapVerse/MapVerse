import {
  Map,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapRef,
} from '@vis.gl/react-maplibre'
import type { LngLat, MapGeoJSONFeature } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import AccountMenu from '../features/account/AccountMenu.tsx'
import AreaNames from '../features/areas/AreaNames.tsx'
import LandmarkExtrusions from '../features/landmarks/LandmarkExtrusions.tsx'
import LandmarkSearchlights from '../features/landmarks/LandmarkSearchlights.tsx'
import Directions from '../features/directions/Directions.tsx'
import { resolveSignalImage } from '../features/traffic/signalImage.ts'
import TrafficSignals from '../features/traffic/TrafficSignals.tsx'
import Boundary from '../features/place/Boundary.tsx'
import {
  FALLBACK_CATEGORY,
  categoryInfo,
} from '../features/place/categories.ts'
import PlaceCard from '../features/place/PlaceCard.tsx'
import PlaceDetails from '../features/place/PlaceDetails.tsx'
import PointCard from '../features/place/PointCard.tsx'
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
import { usePresence, usePresences, type Wanted } from '../lib/presence.ts'
import { PHONE_QUERY, useMediaQuery } from '../lib/useMediaQuery.ts'
import { useTheme } from '../theme/theme.ts'
import SanAndreasHud from './SanAndreasHud.tsx'
import './controls.css'
import { useMapDesign } from './designSetting.ts'
import MapControls from './MapControls.tsx'
import { maplibre } from './maplibre.ts'
import { badgeSkin, poiImageId, resolvePoiImage } from './poiStyle.ts'
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

/**
 * How an open place shows: in full, in the panel beside the map (on a
 * phone, a sheet), or on a phone in brief, its sheet pulled down to its
 * top. A point clicked where there is no place shows as a card at the
 * bottom.
 */
type View = 'brief' | 'full' | 'point'

/**
 * A place shown: `poi` is set when it was picked from the map's own POIs,
 * `view` once it is opened rather than glanced at.
 */
type Selection = { place: Place; poi?: PoiMatch; view?: View }

/** How long a place's card and badge take to go, once let go, in ms. */
const LEAVING_MS = 200

/**
 * How long a click on an empty spot waits before showing what is there,
 * in ms: a second click meanwhile makes it a double click, to zoom.
 */
const DOUBLE_CLICK_MS = 260

/** A point clicked on the map, as a place. */
const pointAt = (lngLat: [number, number]): Place => ({
  key: `point:${lngLat.join()}`,
  name: 'Seçilen nokta',
  lngLat,
})

/**
 * How long the pointer rests on a place before a glance at it shows, and
 * how long it may stray off it before the glance goes, in ms.
 */
const GLANCE_MS = 380
const GLANCE_LEAVE_MS = 140

/** A pointer that can rest on things, as a mouse can and a finger can't. */
const CAN_HOVER = window.matchMedia(
  '(hover: hover) and (pointer: fine)',
).matches

export default function MapView() {
  const phone = useMediaQuery(PHONE_QUERY)
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const design = useMapDesign()
  const [poiLayerIds, setPoiLayerIds] = useState<string[]>([])
  const [hoveringPoi, setHoveringPoi] = useState(false)
  // The place picked, shown in full; and one the pointer rests on, glanced at
  const [selection, setSelection] = useState<Selection | null>(null)
  const [hover, setHover] = useState<Selection | null>(null)
  const hoverKey = useRef<string | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // A click on an empty spot, waiting to see if it is a double click
  const pointTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
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
  // Each on screen, and a moment longer once let go of, on its way out:
  // the open place's details (on a phone, a sheet, in brief only its top),
  const open = directions ? null : selection
  const opened = open && open.view !== 'point' ? open : null
  const details = usePresence(opened, opened?.place.key ?? null, LEAVING_MS)
  // a point clicked where there is no place, in a card at the bottom,
  const point = open?.view === 'point' ? open : null
  const points = usePresence(point, point?.place.key ?? null, LEAVING_MS)
  // a glance at the one the pointer rests on, while none is open,
  const glance = !directions && !selection && hover ? hover : null
  const glances = usePresence(glance, glance?.place.key ?? null, LEAVING_MS)
  // and the badge standing out for either, standing up as a pin for the
  // open one; a result marker stands out enough by itself
  const wanted: Wanted<Selection>[] = []
  const shown = directions ? null : (selection ?? hover)
  if (
    shown &&
    shown.view !== 'point' &&
    (shown.poi || (shown !== hover && !onResultMarker(shown.place.key)))
  ) {
    wanted.push({ key: shown.place.key, item: shown })
  }
  const badges = usePresences(wanted, LEAVING_MS)

  useEffect(
    () => () => {
      clearTimeout(hoverTimer.current)
      clearTimeout(pointTimer.current)
    },
    [],
  )

  /** What a feature under the pointer is, as a place to show. */
  function selectionOf(
    feature: MapGeoJSONFeature | undefined,
    lngLat: LngLat,
  ): Selection | null {
    if (!feature) return null
    if (feature.layer.id === SEARCH_RESULTS_LAYER) {
      const result = nearby.results.find(
        (r) => r.key === feature.properties.key,
      )
      return result ? { place: result } : null
    }
    return {
      place: toPoi(feature, lngLat.toArray()),
      poi: {
        id: feature.id,
        name: feature.properties.name,
        class: feature.properties.class,
      },
    }
  }

  /** Lets go of the glance, at once. */
  function stopGlance() {
    clearTimeout(hoverTimer.current)
    hoverKey.current = null
    setHover(null)
  }

  // As on Yandex Maps, one click at a time: a click on a place opens it,
  // and on an empty spot shows what is there; while either is open, a
  // click anywhere else on the map only closes it, and is spent on that,
  // even on another place; the next click picks anew. Dragging the map is
  // no click, and leaves it open.
  function onMapClick(event: MapLayerMouseEvent) {
    // Directions handle their own clicks (picking either end of a route)
    if (directions) return
    stopGlance()
    // The second click of a double click, which zooms: nothing to show
    if (pointTimer.current) {
      clearTimeout(pointTimer.current)
      pointTimer.current = undefined
      return
    }
    if (selection) {
      setSelection(null)
      return
    }
    const feature = event.features?.[0]
    const picked = selectionOf(feature, event.lngLat)
    if (picked) {
      setSelection({ ...picked, view: 'full' })
      return
    }
    // A result marker whose place is gone leaves things as they are
    if (feature) return
    const lngLat = event.lngLat.toArray()
    pointTimer.current = setTimeout(() => {
      pointTimer.current = undefined
      setSelection({ place: pointAt(lngLat), view: 'point' })
    }, DOUBLE_CLICK_MS)
  }

  /** Opens the open place in full, or back to brief. */
  function viewAs(key: string, view: View) {
    setSelection((s) => (s?.place.key === key ? { ...s, view } : s))
  }

  // Rest the pointer on a place a moment for a glance at it; move off it,
  // and the glance goes. Not while the map is dragged or a place is open,
  // nor on a phone, where a tap opens a place at once.
  function onMapMouseMove(event: MapLayerMouseEvent) {
    if (!CAN_HOVER || directions || selection) return
    const candidate = event.originalEvent.buttons
      ? null
      : selectionOf(event.features?.[0], event.lngLat)
    const key = candidate?.place.key ?? null
    if (key === hoverKey.current) return
    hoverKey.current = key
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(
      () => setHover(candidate),
      candidate ? GLANCE_MS : GLANCE_LEAVE_MS,
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
      // A pointer over a place only while a click would open it
      cursor={hoveringPoi && !selection ? 'pointer' : undefined}
      onLoad={(event) => {
        const style = event.target.getStyle()
        setPoiLayerIds(findPoiLayerIds(style))
        setLabelLayerId(style.layers.find((l) => l.type === 'symbol')?.id)
      }}
      onMouseEnter={() => setHoveringPoi(true)}
      onMouseLeave={() => setHoveringPoi(false)}
      onMouseMove={onMapMouseMove}
      // A closed hand while the map is dragged (see controls.css)
      onDragStart={(event) =>
        event.target.getContainer().classList.add('is-dragging')
      }
      onDragEnd={(event) =>
        event.target.getContainer().classList.remove('is-dragging')
      }
      onMouseOut={stopGlance}
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
        onSelect={(result) => setSelection({ place: result, view: 'full' })}
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
      {badges.map(({ key, item, leaving }) => (
        <SelectedPoi
          key={key}
          lngLat={item.place.lngLat}
          icon={
            item.place.icon ??
            poiImageId(
              badgeSkin(theme, design),
              item.place.categoryKey ?? FALLBACK_CATEGORY.key,
            )
          }
          color={categoryInfo(item.place.categoryKey)?.color}
          match={item.poi}
          leaving={leaving}
          pin={!!item.view}
          categoryKey={item.place.categoryKey}
        />
      ))}
      {glances.map(({ key, item, leaving }) =>
        // A glance at a place just opened makes way for it at once
        leaving && key === selection?.place.key ? null : (
          <PlaceCard
            key={key}
            place={item.place}
            // Clear of the badge it points at
            offset={item.poi ? 26 : onResultMarker(key) ? 20 : 8}
            leaving={leaving}
          />
        ),
      )}
      {points.map(({ key, item, leaving }) => (
        <PointCard
          key={key}
          place={item.place}
          leaving={leaving}
          onDirections={(to) => openDirections(to)}
          onClose={() => setSelection(null)}
        />
      ))}
      {details.map(({ key, item, leaving }) => (
        <PlaceDetails
          key={key}
          place={item.place}
          leaving={leaving}
          peek={phone && item.view === 'brief'}
          onPeek={(peek) => viewAs(key, peek ? 'brief' : 'full')}
          onDirections={() => openDirections(item.place)}
          onClose={() => setSelection(null)}
        />
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
