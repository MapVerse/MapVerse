import {
  GeolocateControl,
  Map,
  NavigationControl,
  ScaleControl,
} from '@vis.gl/react-maplibre'
import { maplibre } from './maplibre.ts'
import { LIBERTY_STYLE_URL } from './styles.ts'

// Istanbul; the URL hash (#zoom/lat/lng) takes precedence when present.
const INITIAL_VIEW = { longitude: 28.9784, latitude: 41.0082, zoom: 11 }

export default function MapView() {
  return (
    <Map
      mapLib={maplibre}
      initialViewState={INITIAL_VIEW}
      mapStyle={LIBERTY_STYLE_URL}
      hash
    >
      <NavigationControl position="top-right" visualizePitch />
      <GeolocateControl position="top-right" trackUserLocation />
      <ScaleControl position="bottom-left" />
    </Map>
  )
}
