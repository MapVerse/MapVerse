import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import {
  CATEGORY_KEYS,
  FALLBACK_CATEGORY,
  categoryInfo,
  labelColor,
} from '../features/place/categories.ts'
import { drawBadge } from '../icons/badge.ts'
import type { Theme } from '../theme/theme.ts'

// Badge images are named `mv-poi:{theme}:{normal|selected}:{category}`
const IMAGE_PREFIX = 'mv-poi'

function poiImagePrefix(theme: Theme, selected: boolean) {
  return `${IMAGE_PREFIX}:${theme}:${selected ? 'selected' : 'normal'}:`
}

function parsePoiImageId(id: string) {
  const [prefix, theme, state, key] = id.split(':')
  if (prefix !== IMAGE_PREFIX || !key) return undefined
  if (theme !== 'light' && theme !== 'dark') return undefined
  return { theme: theme as Theme, selected: state === 'selected', key }
}

/** The selected version of a POI's badge image, in the given theme. */
export function selectedPoiImage(icon: string, theme: Theme): string {
  const parsed = parsePoiImageId(icon)
  return parsed ? poiImagePrefix(theme, true) + parsed.key : icon
}

// POIs name their category in `subclass` (more specific) or `class`
const subclass = ['coalesce', ['get', 'subclass'], '']
const klass = ['coalesce', ['get', 'class'], '']

/** Picks each POI's badge image by category. */
export function poiIconImage(theme: Theme): ExpressionSpecification {
  const prefix = poiImagePrefix(theme, false)
  return [
    'match',
    subclass,
    CATEGORY_KEYS,
    ['concat', prefix, subclass],
    [
      'match',
      klass,
      CATEGORY_KEYS,
      ['concat', prefix, klass],
      prefix + FALLBACK_CATEGORY.key,
    ],
  ] as unknown as ExpressionSpecification
}

/** Colours each POI's label with a shade of its category colour. */
export function poiLabelColor(theme: Theme): ExpressionSpecification {
  const keysByColor = new Map<string, string[]>()
  for (const key of CATEGORY_KEYS) {
    const color = labelColor(categoryInfo(key)!.color, theme)
    keysByColor.set(color, [...(keysByColor.get(color) ?? []), key])
  }
  const branches = [...keysByColor].flatMap(([color, keys]) => [keys, color])
  return [
    'match',
    subclass,
    ...branches,
    ['match', klass, ...branches, labelColor(FALLBACK_CATEGORY.color, theme)],
  ] as unknown as ExpressionSpecification
}

/** Draws POI badges on demand, the first time the map asks for one. */
export function resolvePoiImage(map: MapLibreMap, id: string) {
  const parsed = parsePoiImageId(id)
  if (!parsed) return
  const info = categoryInfo(parsed.key) ?? FALLBACK_CATEGORY
  map.addImage(
    id,
    drawBadge(info.glyph, info.color, {
      selected: parsed.selected,
      dark: parsed.theme === 'dark',
    }),
    { pixelRatio: 2 },
  )
}
