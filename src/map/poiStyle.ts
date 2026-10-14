import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import {
  CATEGORY_KEYS,
  FALLBACK_CATEGORY,
  categoryInfo,
  labelColor,
} from '../features/place/categories.ts'
import { drawBadge } from '../icons/badge.ts'
import type { Theme } from '../theme/theme.ts'
import type { MapDesign } from './designSetting.ts'

/**
 * How badges are drawn: discs for the light or dark map, or San Andreas'
 * radar blips, the same by day and night as in the game.
 */
export type BadgeSkin = Theme | 'blip'
const SKINS: readonly BadgeSkin[] = ['light', 'dark', 'blip']

export function badgeSkin(theme: Theme, design: MapDesign): BadgeSkin {
  return design === 'san-andreas' ? 'blip' : theme
}

// Badge images are named `mv-poi:{skin}:{normal|selected}:{category}`
const IMAGE_PREFIX = 'mv-poi'

function poiImagePrefix(skin: BadgeSkin, selected: boolean) {
  return `${IMAGE_PREFIX}:${skin}:${selected ? 'selected' : 'normal'}:`
}

/** The badge image for a category, drawn on demand by `resolvePoiImage`. */
export function poiImageId(skin: BadgeSkin, key: string, selected = false) {
  return poiImagePrefix(skin, selected) + key
}

function parsePoiImageId(id: string) {
  const [prefix, skin, state, key] = id.split(':')
  if (prefix !== IMAGE_PREFIX || !key) return undefined
  const known = SKINS.find((s) => s === skin)
  if (!known) return undefined
  return { skin: known, selected: state === 'selected', key }
}

/** The selected version of a POI's badge image, in the given skin. */
export function selectedPoiImage(icon: string, skin: BadgeSkin): string {
  const parsed = parsePoiImageId(icon)
  return parsed ? poiImagePrefix(skin, true) + parsed.key : icon
}

// POIs name their category in `subclass` (more specific) or `class`
const subclass = ['coalesce', ['get', 'subclass'], '']
const klass = ['coalesce', ['get', 'class'], '']

/** Street furniture and small features that are never worth a badge. */
const HIDDEN = [
  'bbq',
  'bench',
  'bicycle_parking',
  'bollard',
  'cycle_barrier',
  'drinking_water',
  'entrance',
  'garden',
  'gate',
  'information',
  'lift_gate',
  'motorcycle_parking',
  'parcel_locker',
  'post_box',
  'recycling',
  'sally_port',
  'shelter',
  'stile',
  'subway_entrance',
  'telephone',
  'toilets',
  'train_station_entrance',
  'vending_machine',
  'waste_basket',
  'waste_disposal',
]

/** Places still useful without a name; any other POI needs one to show. */
const UNNAMED = ['atm', 'bus_stop', 'fuel', 'parking', 'pharmacy']

/** Leaves out clutter: small features, and POIs with no name to show. */
export function poiFilter(): ExpressionSpecification {
  return [
    'all',
    ['match', subclass, HIDDEN, false, true],
    ['match', klass, HIDDEN, false, true],
    [
      'any',
      ['!=', ['coalesce', ['get', 'name'], ''], ''],
      ['match', subclass, UNNAMED, true, false],
    ],
  ] as unknown as ExpressionSpecification
}

/** Picks each POI's badge image by category. */
export function poiIconImage(skin: BadgeSkin): ExpressionSpecification {
  const prefix = poiImagePrefix(skin, false)
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

/** A POI badge image, drawn at twice its size in CSS px. */
export function poiBadge(id: string): ImageData | undefined {
  const parsed = parsePoiImageId(id)
  if (!parsed) return undefined
  const info = categoryInfo(parsed.key) ?? FALLBACK_CATEGORY
  return drawBadge(info.glyph, info.color, {
    selected: parsed.selected,
    dark: parsed.skin === 'dark',
    blip: parsed.skin === 'blip',
  })
}

/** Draws POI badges on demand, the first time the map asks for one. */
export function resolvePoiImage(map: MapLibreMap, id: string) {
  const badge = poiBadge(id)
  if (badge) map.addImage(id, badge, { pixelRatio: 2 })
}

/**
 * The feature state of a POI picked on the map: its own badge hides while
 * an enlarged one stands in for it. Being a feature state, setting it costs
 * next to nothing, where changing the layers' paint to single out a POI
 * would have the map lay out every tile again.
 */
export const PICKED = 'picked'

/** A POI badge's opacity: hidden while the POI is picked. */
export const POI_ICON_OPACITY: ExpressionSpecification = [
  'case',
  ['boolean', ['feature-state', PICKED], false],
  0,
  1,
]
