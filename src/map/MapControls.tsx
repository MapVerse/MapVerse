import { useControl } from '@vis.gl/react-maplibre'
import { ControlGroup } from './ControlGroup.ts'
import { TiltControl } from './tilt.ts'

const position = { position: 'bottom-right' } as const

/** The map's buttons, in glass capsules grouped by what they do. */
export default function MapControls() {
  // A bottom corner stacks upwards, so the first added sits lowest: zoom
  // at the bottom, my location above it, and the view group on top
  useControl(
    ({ mapLib }) =>
      new ControlGroup('Yakınlaştırma', [
        new mapLib.NavigationControl({ showCompass: false }),
      ]),
    position,
  )
  useControl(
    ({ mapLib }) =>
      new ControlGroup('Konum', [
        new mapLib.GeolocateControl({ trackUserLocation: true }),
      ]),
    position,
  )
  useControl(
    ({ mapLib }) =>
      new ControlGroup('Görünüm', [
        new mapLib.NavigationControl({
          showZoom: false,
          visualizePitch: true,
        }),
        new TiltControl(),
      ]),
    position,
  )
  return null
}
