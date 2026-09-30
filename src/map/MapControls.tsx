import { useControl } from '@vis.gl/react-maplibre'
import { ControlGroup } from './ControlGroup.ts'
import { TiltControl } from './tilt.ts'

const position = { position: 'top-right' } as const

/** The map's buttons, in glass capsules grouped by what they do. */
export default function MapControls() {
  useControl(
    ({ mapLib }) =>
      new ControlGroup('Yakınlaştırma', [
        new mapLib.NavigationControl({ showCompass: false }),
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
  useControl(
    ({ mapLib }) =>
      new ControlGroup('Konum', [
        new mapLib.GeolocateControl({ trackUserLocation: true }),
      ]),
    position,
  )
  return null
}
