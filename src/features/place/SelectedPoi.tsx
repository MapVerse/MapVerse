import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useEffect } from 'react'
import { selectedPoiImage } from '../../map/poiStyle.ts'
import { useTheme } from '../../theme/theme.ts'

/** Identifies the picked feature within the style's POI layers. */
export type PoiMatch = { id?: string | number; name?: string; class?: string }

type Props = {
  lngLat: [number, number]
  icon?: string
  iconColor?: string
  layerIds: string[]
  match: PoiMatch
}

/** Aim for about this size, in px, without growing an icon by more than 1.8×. */
const TARGET_ICON_PX = 30

/** Shows the selected map POI's badge enlarged in place, filled with its colour. */
export default function SelectedPoi({
  lngLat,
  icon,
  iconColor,
  layerIds,
  match,
}: Props) {
  const { current: map } = useMap()
  const theme = useTheme()
  const image = icon && map?.hasImage(icon) ? map.getImage(icon) : undefined
  const side = image
    ? Math.max(image.data.width, image.data.height) / image.pixelRatio
    : 0
  const scale =
    side > 0 ? Math.min(1.8, Math.max(1.3, TARGET_ICON_PX / side)) : 1.6

  // Fade out the POI's own small icon while the enlarged copy stands in for it.
  // A theme change restyles the POI layers, so it's done again after one.
  useEffect(() => {
    if (!map) return
    const style = map.getMap()
    const picked: ExpressionSpecification =
      match.id !== undefined
        ? ['==', ['id'], match.id]
        : [
            'all',
            ['==', ['get', 'name'], match.name ?? ''],
            ['==', ['get', 'class'], match.class ?? ''],
          ]
    const touched = layerIds.flatMap((id) => {
      const previous = style.getPaintProperty(id, 'icon-opacity')
      // Zoom-based values can't be nested in a case expression; leave those be
      if (previous !== undefined && typeof previous !== 'number') return []
      style.setPaintProperty(id, 'icon-opacity', [
        'case',
        picked,
        0,
        previous ?? 1,
      ])
      return [{ id, previous }]
    })
    return () => {
      for (const { id, previous } of touched) {
        if (style.getLayer(id)) {
          style.setPaintProperty(id, 'icon-opacity', previous)
        }
      }
    }
  }, [map, theme, layerIds, match.id, match.name, match.class])

  if (!icon) return null
  const selectedIcon = selectedPoiImage(icon, theme)
  return (
    <Source
      id="selected-poi"
      type="geojson"
      data={{ type: 'Point', coordinates: lngLat }}
    >
      <Layer
        id="selected-poi-icon"
        type="symbol"
        layout={{
          'icon-image': selectedIcon,
          'icon-size': scale,
          // Grow upwards from the icon's bottom edge, clear of its label
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        }}
        paint={{
          'icon-translate': [0, side / 2],
          'icon-translate-anchor': 'viewport',
          ...(iconColor ? { 'icon-color': iconColor } : {}),
        }}
      />
    </Source>
  )
}
