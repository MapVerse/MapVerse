import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Point } from 'geojson'
import { useMemo } from 'react'
import { useTilesInView } from '../../lib/useTilesInView.ts'
import { areaLabelColor, labelHalo } from '../../map/style.ts'
import { useTheme } from '../../theme/theme.ts'
import { fetchAreaNames } from './areaNames.ts'

/** Names show from this zoom, where estates are big enough to label. */
const MIN_ZOOM = 15

type Props = {
  /** Style layer to draw beneath, so places keep priority */
  beforeId?: string
}

/** Labels residential estates (sites) and industrial areas by name. */
export default function AreaNames({ beforeId }: Props) {
  const theme = useTheme()
  const areas = useTilesInView(MIN_ZOOM, fetchAreaNames)

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: [...areas.values()].map((area) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: area.lngLat },
        properties: { name: area.name },
      })),
    }),
    [areas],
  )

  return (
    <Source id="area-names" type="geojson" data={data}>
      <Layer
        id="area-names"
        type="symbol"
        beforeId={beforeId}
        minzoom={MIN_ZOOM}
        layout={{
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 15, 11, 18, 13],
          'text-max-width': 7,
          'text-letter-spacing': 0.02,
        }}
        paint={{
          'text-color': areaLabelColor(theme),
          'text-halo-color': labelHalo(theme),
          'text-halo-width': 1.4,
        }}
      />
    </Source>
  )
}
