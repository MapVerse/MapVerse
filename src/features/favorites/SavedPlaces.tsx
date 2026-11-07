import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Point } from 'geojson'
import { useMemo } from 'react'
import { useMapDesign } from '../../map/designSetting.ts'
import { labelHalo } from '../../map/style.ts'
import { useTheme } from '../../theme/theme.ts'
import { labelColor } from '../place/categories.ts'
import { favoriteTitle } from './favorites.ts'
import { SAVED_COLORS, savedPlaceImage } from './savedBadge.ts'
import { useFavorites } from './useFavorites.ts'

export const SAVED_PLACES_LAYER = 'saved-places'

/** Saved places show from this zoom, a city's worth of them at a time. */
const MIN_ZOOM = 10

/**
 * Saved places on the map, from zoom 10: a small badge each, the starred
 * gold, home and work blue, named from closer in. A click opens them.
 */
export default function SavedPlaces() {
  const theme = useTheme()
  const design = useMapDesign()
  const favorites = useFavorites()

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: favorites.map((f) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: f.lngLat },
        properties: {
          key: f.key,
          name: favoriteTitle(f),
          icon: savedPlaceImage(f.kind, theme),
          color: labelColor(SAVED_COLORS[f.kind], theme),
          // Home and work over the starred, where they crowd
          rank: f.kind === 'star' ? 1 : 0,
        },
      })),
    }),
    [favorites, theme],
  )

  return (
    <Source id="saved-places" type="geojson" data={data}>
      <Layer
        id={SAVED_PLACES_LAYER}
        type="symbol"
        minzoom={MIN_ZOOM}
        layout={{
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 15, 1],
          // Always shown; the map's own labels make way for them
          'icon-allow-overlap': true,
          'symbol-sort-key': ['get', 'rank'],
          'text-field': ['step', ['zoom'], '', 14, ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11.5,
          'text-anchor': 'top',
          'text-offset': [0, 0.95],
          'text-max-width': 8,
          'text-optional': true,
        }}
        paint={{
          'text-color': ['get', 'color'],
          'text-halo-color': labelHalo(theme, design),
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  )
}
