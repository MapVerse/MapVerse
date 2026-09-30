import type { MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl'
import { categoryInfo, categoryLabel } from './categories.ts'
import type { Place } from './place.ts'

/** Ids of the style layers drawn from the OpenMapTiles `poi` source layer. */
export function findPoiLayerIds(style: StyleSpecification): string[] {
  return style.layers
    .filter(
      (layer) => 'source-layer' in layer && layer['source-layer'] === 'poi',
    )
    .map((layer) => layer.id)
}

export function toPoi(
  feature: MapGeoJSONFeature,
  clicked: [number, number],
): Place {
  const p = feature.properties
  const lngLat =
    feature.geometry.type === 'Point'
      ? (feature.geometry.coordinates as [number, number])
      : clicked
  const category = categoryLabel(p.subclass, p.class)
  // Layout and paint values come back evaluated for this feature; images and
  // colours stringify to their name and CSS form
  const icon = (
    feature.layer.layout as { 'icon-image'?: unknown } | undefined
  )?.['icon-image']
  const iconColor = (
    feature.layer.paint as { 'icon-color'?: unknown } | undefined
  )?.['icon-color']
  return {
    key: `poi:${lngLat.join(',')}`,
    name: p['name:tr'] || p.name || category || 'Yer',
    category,
    categoryKey: categoryInfo(p.subclass, p.class)?.key,
    lngLat,
    icon: icon ? String(icon) : undefined,
    iconColor: iconColor ? String(iconColor) : undefined,
  }
}
