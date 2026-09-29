import type { MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl'
import { categoryLabel } from './categories.ts'
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
  // Layout values come back evaluated for this feature; images stringify to their name
  const icon = (
    feature.layer.layout as { 'icon-image'?: unknown } | undefined
  )?.['icon-image']
  return {
    key: `poi:${lngLat.join(',')}`,
    name: p['name:tr'] || p.name || category || 'Yer',
    category,
    lngLat,
    icon: icon ? String(icon) : undefined,
  }
}
