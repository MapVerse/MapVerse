import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import {
  CATEGORY_KEYS,
  FALLBACK_CATEGORY,
  categoryInfo,
  labelColor,
} from '../features/place/categories.ts'
import { drawBadge } from '../icons/badge.ts'

export const POI_IMAGE_PREFIX = 'mv-poi-'
export const SELECTED_POI_IMAGE_PREFIX = 'mv-poi-sel-'

// POIs name their category in `subclass` (more specific) or `class`
const subclass = ['coalesce', ['get', 'subclass'], '']
const klass = ['coalesce', ['get', 'class'], '']

/** Picks each POI's badge image by category. */
export function poiIconImage(): ExpressionSpecification {
  return [
    'match',
    subclass,
    CATEGORY_KEYS,
    ['concat', POI_IMAGE_PREFIX, subclass],
    [
      'match',
      klass,
      CATEGORY_KEYS,
      ['concat', POI_IMAGE_PREFIX, klass],
      POI_IMAGE_PREFIX + FALLBACK_CATEGORY.key,
    ],
  ] as unknown as ExpressionSpecification
}

/** Colours each POI's label with a darker shade of its category colour. */
export function poiLabelColor(): ExpressionSpecification {
  const keysByColor = new Map<string, string[]>()
  for (const key of CATEGORY_KEYS) {
    const color = labelColor(categoryInfo(key)!.color)
    keysByColor.set(color, [...(keysByColor.get(color) ?? []), key])
  }
  const branches = [...keysByColor].flatMap(([color, keys]) => [keys, color])
  return [
    'match',
    subclass,
    ...branches,
    ['match', klass, ...branches, labelColor(FALLBACK_CATEGORY.color)],
  ] as unknown as ExpressionSpecification
}

/** Draws POI badges on demand, the first time the map asks for one. */
export function resolvePoiImage(map: MapLibreMap, id: string) {
  const selected = id.startsWith(SELECTED_POI_IMAGE_PREFIX)
  const prefix = selected ? SELECTED_POI_IMAGE_PREFIX : POI_IMAGE_PREFIX
  if (!id.startsWith(prefix)) return
  const info = categoryInfo(id.slice(prefix.length)) ?? FALLBACK_CATEGORY
  map.addImage(id, drawBadge(info.glyph, info.color, selected), {
    pixelRatio: 2,
  })
}
