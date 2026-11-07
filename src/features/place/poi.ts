import type { MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl'
import { currentLocale, t } from '../../i18n/index.ts'
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

/** A map feature's name, as its label on the map reads it. */
function ownName(p: Record<string, string | undefined>) {
  return currentLocale() === 'en'
    ? p['name:en'] || p.name_en || p['name:latin'] || p.name
    : p['name:tr'] || p.name
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
    name: ownName(p) || category || t('common.place'),
    category,
    categoryKey: categoryInfo(p.subclass, p.class)?.key,
    lngLat,
    icon: icon ? String(icon) : undefined,
    iconColor: iconColor ? String(iconColor) : undefined,
  }
}
