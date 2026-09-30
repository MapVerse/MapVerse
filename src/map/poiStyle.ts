import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import {
  CATEGORY_KEYS,
  FALLBACK_CATEGORY,
  categoryInfo,
  labelColor,
} from '../features/place/categories.ts'
import { drawBadge } from '../icons/badge.ts'

const PREFIX = 'mv-poi-'
const FALLBACK_IMAGE = PREFIX + FALLBACK_CATEGORY.key

/**
 * Swaps the style's POI icons for our category badges, and tints each POI's
 * label with a darker shade of its category colour.
 */
export function applyPoiStyle(map: MapLibreMap, layerIds: string[]) {
  const keysByLabelColor = new Map<string, string[]>()
  for (const info of [
    ...CATEGORY_KEYS.map((key) => categoryInfo(key)!),
    FALLBACK_CATEGORY,
  ]) {
    const id = PREFIX + info.key
    if (!map.hasImage(id)) {
      map.addImage(id, drawBadge(info.glyph, info.color), { pixelRatio: 2 })
    }
    if (info === FALLBACK_CATEGORY) continue
    const color = labelColor(info.color)
    keysByLabelColor.set(color, [
      ...(keysByLabelColor.get(color) ?? []),
      info.key,
    ])
  }

  // POIs name their category in `subclass` (more specific) or `class`
  const subclass = ['coalesce', ['get', 'subclass'], '']
  const klass = ['coalesce', ['get', 'class'], '']
  const icon = [
    'match',
    subclass,
    CATEGORY_KEYS,
    ['concat', PREFIX, subclass],
    ['match', klass, CATEGORY_KEYS, ['concat', PREFIX, klass], FALLBACK_IMAGE],
  ] as unknown as ExpressionSpecification
  const byColor = [...keysByLabelColor].flatMap(([color, keys]) => [
    keys,
    color,
  ])
  const text = [
    'match',
    subclass,
    ...byColor,
    ['match', klass, ...byColor, labelColor(FALLBACK_CATEGORY.color)],
  ] as unknown as ExpressionSpecification

  for (const id of layerIds) {
    map.setLayoutProperty(id, 'icon-image', icon)
    map.setLayoutProperty(id, 'icon-size', 1)
    map.setLayoutProperty(id, 'text-variable-anchor', undefined)
    map.setLayoutProperty(id, 'text-anchor', 'top')
    map.setLayoutProperty(id, 'text-offset', [0, 1.2])
    map.setPaintProperty(id, 'text-color', text)
    map.setPaintProperty(id, 'text-halo-color', '#ffffff')
    map.setPaintProperty(id, 'text-halo-width', 1.5)
  }
}
