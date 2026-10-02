import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Point } from 'geojson'
import { useMemo } from 'react'
import { useTilesInView } from '../../lib/useTilesInView.ts'
import { useTheme } from '../../theme/theme.ts'
import { signalImage } from './signalImage.ts'
import { fetchTrafficSignals } from './trafficSignals.ts'

/** Traffic lights show from this zoom, close enough to tell junctions apart. */
const MIN_ZOOM = 16

type Props = {
  /** Style layer to draw beneath, so places keep priority */
  beforeId?: string
}

/**
 * Traffic lights at junctions, and smaller ones at crossings. Where a
 * junction has several close together, one stands for them.
 */
export default function TrafficSignals({ beforeId }: Props) {
  const theme = useTheme()
  const signals = useTilesInView(MIN_ZOOM, fetchTrafficSignals)

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: [...signals.values()].map((light) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: light.lngLat },
        properties: { crossing: light.crossing },
      })),
    }),
    [signals],
  )

  return (
    <Source id="traffic-signals" type="geojson" data={data}>
      <Layer
        id="traffic-signals"
        type="symbol"
        beforeId={beforeId}
        minzoom={MIN_ZOOM}
        layout={{
          'icon-image': signalImage(theme),
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            16,
            ['case', ['get', 'crossing'], 0.6, 0.75],
            19,
            ['case', ['get', 'crossing'], 0.85, 1.05],
          ],
          'icon-padding': 1,
          // Junction lights before crossing ones, where they crowd
          'symbol-sort-key': ['case', ['get', 'crossing'], 1, 0],
        }}
      />
    </Source>
  )
}
