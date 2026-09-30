import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Point } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useEffect } from 'react'
import { poiImageId } from '../../map/poiStyle.ts'
import { labelHalo } from '../../map/style.ts'
import { useTheme } from '../../theme/theme.ts'
import {
  FALLBACK_CATEGORY,
  categoryInfo,
  labelColor,
} from '../place/categories.ts'
import type { SearchResult } from './photon.ts'

export const SEARCH_RESULTS_LAYER = 'search-results'

type Props = {
  results: SearchResult[]
  /** The result whose card is open, drawn larger */
  selectedKey?: string
}

/** Marks nearby search results on the map with filled category badges. */
export default function SearchResults({ results, selectedKey }: Props) {
  const { current: map } = useMap()
  const theme = useTheme()

  // Bring results into view, unless they all are already
  useEffect(() => {
    if (!map || results.length === 0) return
    const view = map.getBounds()
    if (results.every((r) => view.contains(r.lngLat))) return
    const lngs = results.map((r) => r.lngLat[0])
    const lats = results.map((r) => r.lngLat[1])
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        // Clear of the result list on wide screens
        padding:
          window.innerWidth > 640
            ? { top: 80, right: 70, bottom: 40, left: 430 }
            : { top: 90, right: 70, bottom: 40, left: 40 },
        maxZoom: 16,
      },
    )
  }, [map, results])

  const data: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: results.map((result) => {
      const info = categoryInfo(result.categoryKey) ?? FALLBACK_CATEGORY
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: result.lngLat },
        properties: {
          key: result.key,
          name: result.name,
          icon: poiImageId(theme, info.key, true),
          color: labelColor(info.color, theme),
        },
      }
    }),
  }
  const isSelected: ExpressionSpecification = [
    '==',
    ['get', 'key'],
    selectedKey ?? '',
  ]

  return (
    <Source id="search-results" type="geojson" data={data}>
      <Layer
        id={SEARCH_RESULTS_LAYER}
        type="symbol"
        layout={{
          'icon-image': ['get', 'icon'],
          'icon-size': ['case', isSelected, 1.35, 1],
          // Results stay visible; the map's own labels make way for them
          'icon-allow-overlap': true,
          'symbol-sort-key': ['case', isSelected, 0, 1],
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-anchor': 'top',
          'text-offset': [0, 1.3],
          'text-max-width': 8,
          'text-optional': true,
        }}
        paint={{
          'text-color': ['get', 'color'],
          'text-halo-color': labelHalo(theme),
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  )
}
