import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useEffect } from 'react'
import { PIN_HEAD_OFFSET, SELECTED_PIN } from './selectedPin.ts'

/** Largest icon side that fits the white circle in the pin's head, in px. */
const HEAD_ICON_PX = 18

/** Identifies the picked feature within the style's POI layers. */
export type PoiMatch = { id?: string | number; name?: string; class?: string }

type Props = {
  lngLat: [number, number]
  icon?: string
  layerIds: string[]
  match: PoiMatch
}

/** A pin over the selected map POI, with the POI's icon enlarged in its head. */
export default function SelectedPoi({ lngLat, icon, layerIds, match }: Props) {
  const { current: map } = useMap()
  // Sprite icons come in different sizes; scale this one to fit the head
  const image = icon && map?.hasImage(icon) ? map.getImage(icon) : undefined
  const side = image
    ? Math.max(image.data.width, image.data.height) / image.pixelRatio
    : 0
  const iconSize = side > 0 ? Math.min(1.6, HEAD_ICON_PX / side) : 1.2

  // Fade out the POI's own small icon while the pin stands in for it
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
  }, [map, layerIds, match.id, match.name, match.class])

  return (
    <Source
      id="selected-poi"
      type="geojson"
      data={{ type: 'Point', coordinates: lngLat }}
    >
      <Layer
        id="selected-poi-pin"
        type="symbol"
        layout={{
          'icon-image': SELECTED_PIN,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        }}
      />
      {icon && (
        <Layer
          id="selected-poi-icon"
          type="symbol"
          layout={{
            'icon-image': icon,
            'icon-size': iconSize,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          }}
          paint={{
            'icon-translate': [0, -PIN_HEAD_OFFSET],
            'icon-translate-anchor': 'viewport',
            // Only affects single-colour (SDF) icons
            'icon-color': '#e5484d',
          }}
        />
      )}
    </Source>
  )
}
