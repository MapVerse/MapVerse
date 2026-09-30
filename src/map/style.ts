import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl'
import type { Theme } from '../theme/theme.ts'
import { poiIconImage, poiLabelColor } from './poiStyle.ts'

// Near-monochrome maps: pale grey ground with white roads and buildings, or
// its dark counterpart, so routes, places and category colours stand out.
const LIGHT = {
  land: '#eef0f3',
  landuse: '#e8ebef',
  green: '#e0e9da',
  wood: '#d9e4d3',
  sand: '#efebdf',
  ice: '#f6f8fa',
  water: '#d2deea',
  waterLabel: '#6d88a5',
  building: '#f9fafb',
  buildingLine: '#e2e5ea',
  extrusion: '#ffffff',
  road: '#ffffff',
  casing: '#dce0e6',
  majorCasing: '#cdd3dc',
  tunnel: '#f5f6f8',
  path: '#cbd1da',
  rail: '#c6ccd5',
  runway: '#e3e6eb',
  ferry: '#a9bdd0',
  boundary: '#aab3bf',
  stateBoundary: '#c4cad3',
  label: '#1f2937',
  labelSoft: '#4b5563',
  labelMuted: '#6b7280',
  labelSubtle: '#9ca3af',
  halo: '#ffffff',
  lightIntensity: 0.16,
}

type Palette = typeof LIGHT

const DARK: Palette = {
  land: '#1b1e24',
  landuse: '#1f232a',
  green: '#1c2821',
  wood: '#1e2b23',
  sand: '#2a2922',
  ice: '#232830',
  water: '#15243a',
  waterLabel: '#6f8db3',
  building: '#22262d',
  buildingLine: '#2b3038',
  extrusion: '#292e37',
  road: '#363d4a',
  casing: '#252a32',
  majorCasing: '#2c323c',
  tunnel: '#2a2f38',
  path: '#4a5260',
  rail: '#434b59',
  runway: '#2a2f37',
  ferry: '#3f5a78',
  boundary: '#5c6778',
  stateBoundary: '#3f4753',
  label: '#e5e7eb',
  labelSoft: '#c3cad4',
  labelMuted: '#9aa4b2',
  labelSubtle: '#6f7a8a',
  halo: '#1b1e24',
  lightIntensity: 0.2,
}

const PALETTES: Record<Theme, Palette> = { light: LIGHT, dark: DARK }

const REGULAR = ['Noto Sans Regular']
const BOLD = ['Noto Sans Bold']
const ITALIC = ['Noto Sans Italic']

const NAME: ExpressionSpecification = [
  'coalesce',
  ['get', 'name:tr'],
  ['get', 'name:latin'],
  ['get', 'name'],
]

const byZoom = (...stops: number[]): ExpressionSpecification =>
  ['interpolate', ['linear'], ['zoom'], ...stops] as ExpressionSpecification

const isClass = (...classes: string[]): ExpressionSpecification => [
  'match',
  ['get', 'class'],
  classes,
  true,
  false,
]

// Road widths in px at each zoom, per road group
const ROAD_ZOOMS = [8, 11, 13, 15, 17, 19]
const ROAD_WIDTHS = {
  major: [1.2, 2, 4, 7, 13, 24],
  primary: [0.8, 1.6, 3, 6, 11, 20],
  secondary: [0.3, 1, 2.2, 5, 9.5, 17],
  minor: [0, 0.3, 1, 3, 6.5, 12],
  service: [0, 0, 0.6, 1.6, 3.5, 7],
}
const CASING_EXTRA = [0.6, 0.8, 1.4, 2, 2.5, 3]
const ROAD_CLASSES = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'minor',
  'service',
  'track',
  'busway',
]

function roadWidth(casing: boolean): ExpressionSpecification {
  const stops = ROAD_ZOOMS.flatMap((zoom, i) => {
    const extra = casing ? CASING_EXTRA[i] : 0
    const w = (group: keyof typeof ROAD_WIDTHS) => ROAD_WIDTHS[group][i] + extra
    return [
      zoom,
      [
        'match',
        ['get', 'class'],
        ['motorway', 'trunk'],
        w('major'),
        'primary',
        w('primary'),
        ['secondary', 'tertiary'],
        w('secondary'),
        ['minor', 'busway'],
        w('minor'),
        w('service'),
      ],
    ]
  })
  return [
    'interpolate',
    ['exponential', 1.5],
    ['zoom'],
    ...stops,
  ] as ExpressionSpecification
}

/** Draw bigger roads over smaller ones where they cross. */
const ROAD_SORT: ExpressionSpecification = [
  'match',
  ['get', 'class'],
  ['motorway', 'trunk'],
  4,
  'primary',
  3,
  ['secondary', 'tertiary'],
  2,
  1,
]

function roads(c: Palette, tunnel: boolean): LayerSpecification[] {
  const filter: FilterSpecification = [
    'all',
    ['==', ['geometry-type'], 'LineString'],
    isClass(...ROAD_CLASSES),
    tunnel
      ? ['==', ['get', 'brunnel'], 'tunnel']
      : ['!=', ['coalesce', ['get', 'brunnel'], ''], 'tunnel'],
  ]
  const id = tunnel ? 'tunnel' : 'road'
  return [
    {
      id: `${id}-casing`,
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 8,
      filter,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'line-sort-key': ROAD_SORT,
      },
      paint: {
        'line-color': [
          'match',
          ['get', 'class'],
          ['motorway', 'trunk', 'primary'],
          c.majorCasing,
          c.casing,
        ],
        'line-width': roadWidth(true),
        ...(tunnel && { 'line-dasharray': [1, 0.6] }),
      },
    },
    {
      id: `${id}-fill`,
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 8,
      filter,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'line-sort-key': ROAD_SORT,
      },
      paint: {
        'line-color': tunnel ? c.tunnel : c.road,
        'line-width': roadWidth(false),
      },
    },
  ]
}

function poiLayer(
  theme: Theme,
  id: string,
  minzoom: number,
  rank: FilterSpecification,
): LayerSpecification {
  return {
    id,
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom,
    filter: rank,
    layout: {
      'icon-image': poiIconImage(theme),
      'icon-size': 1,
      'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      'text-field': NAME,
      'text-font': REGULAR,
      'text-size': 11.5,
      'text-anchor': 'top',
      'text-offset': [0, 1.25],
      'text-max-width': 8,
      'text-optional': true,
    },
    paint: {
      'text-color': poiLabelColor(theme),
      'text-halo-color': PALETTES[theme].halo,
      'text-halo-width': 1.5,
    },
  }
}

function placeLabel(
  c: Palette,
  id: string,
  classes: string[],
  options: {
    minzoom?: number
    maxzoom?: number
    font: string[]
    size: ExpressionSpecification
    color: string
    uppercase?: boolean
  },
): LayerSpecification {
  return {
    id,
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    ...(options.minzoom !== undefined && { minzoom: options.minzoom }),
    ...(options.maxzoom !== undefined && { maxzoom: options.maxzoom }),
    filter: isClass(...classes),
    layout: {
      'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      'text-field': NAME,
      'text-font': options.font,
      'text-size': options.size,
      'text-max-width': 8,
      ...(options.uppercase && {
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      }),
    },
    paint: {
      'text-color': options.color,
      'text-halo-color': c.halo,
      'text-halo-width': 1.6,
    },
  }
}

function buildStyle(theme: Theme): StyleSpecification {
  const c = PALETTES[theme]
  return {
    version: 8,
    name: 'MapVerse',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
      },
    },
    // Soft, high light so building sides shade gently
    light: {
      anchor: 'map',
      position: [1.15, 210, 30],
      color: '#ffffff',
      intensity: c.lightIntensity,
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': c.land },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            'wood',
            c.wood,
            ['sand', 'beach'],
            c.sand,
            ['ice', 'glacier'],
            c.ice,
            c.green,
          ],
          'fill-opacity': byZoom(4, 0.5, 12, 1),
        },
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: isClass(
          'commercial',
          'industrial',
          'retail',
          'railway',
          'cemetery',
          'pitch',
          'playground',
          'stadium',
          'hospital',
          'school',
          'university',
          'college',
        ),
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            ['cemetery', 'pitch', 'playground', 'stadium'],
            c.green,
            c.landuse,
          ],
        },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: {
          'fill-color': c.green,
          'fill-opacity': byZoom(5, 0.4, 12, 0.9),
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': c.water },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        minzoom: 8,
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': c.water,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            ['match', ['get', 'class'], 'river', 1, 0.3],
            18,
            ['match', ['get', 'class'], 'river', 8, 2.5],
          ],
        },
      },
      {
        id: 'aeroway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'aeroway',
        minzoom: 11,
        filter: [
          'all',
          ['==', ['geometry-type'], 'LineString'],
          isClass('runway', 'taxiway'),
        ],
        paint: {
          'line-color': c.runway,
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            11,
            ['match', ['get', 'class'], 'runway', 3, 0.5],
            17,
            ['match', ['get', 'class'], 'runway', 60, 12],
          ],
        },
      },
      ...roads(c, true),
      {
        id: 'path',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 14,
        filter: [
          'all',
          ['==', ['geometry-type'], 'LineString'],
          isClass('path'),
        ],
        paint: {
          'line-color': c.path,
          'line-width': byZoom(14, 0.8, 18, 1.8),
          'line-dasharray': [2, 1.4],
        },
      },
      ...roads(c, false),
      {
        id: 'rail',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 11,
        filter: [
          'all',
          isClass('rail', 'transit'),
          ['!=', ['coalesce', ['get', 'brunnel'], ''], 'tunnel'],
        ],
        paint: {
          'line-color': c.rail,
          'line-width': byZoom(11, 0.8, 18, 2),
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'ferry',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 10,
        filter: isClass('ferry'),
        paint: {
          'line-color': c.ferry,
          'line-width': 1.1,
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        maxzoom: 15.5,
        paint: {
          'fill-color': c.building,
          'fill-outline-color': c.buildingLine,
        },
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 15,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': c.extrusion,
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            16,
            ['coalesce', ['get', 'render_height'], 6],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            16,
            ['coalesce', ['get', 'render_min_height'], 0],
          ],
          'fill-extrusion-opacity': 0.94,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: [
          'all',
          ['==', ['get', 'admin_level'], 2],
          ['!=', ['get', 'maritime'], 1],
        ],
        paint: {
          'line-color': c.boundary,
          'line-width': byZoom(3, 0.6, 10, 1.4),
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'boundary-state',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        minzoom: 5,
        filter: [
          'all',
          ['==', ['get', 'admin_level'], 4],
          ['!=', ['get', 'maritime'], 1],
        ],
        paint: {
          'line-color': c.stateBoundary,
          'line-width': 0.8,
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'waterway-name',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        minzoom: 13,
        layout: {
          'symbol-placement': 'line',
          'text-field': NAME,
          'text-font': ITALIC,
          'text-size': 11,
        },
        paint: {
          'text-color': c.waterLabel,
          'text-halo-color': c.halo,
          'text-halo-width': 1.2,
        },
      },
      {
        id: 'water-name',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'water_name',
        layout: {
          'text-field': NAME,
          'text-font': ITALIC,
          'text-size': byZoom(4, 11, 12, 14),
          'text-max-width': 6,
        },
        paint: {
          'text-color': c.waterLabel,
          'text-halo-color': c.halo,
          'text-halo-width': 1.2,
        },
      },
      {
        id: 'road-name',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 13,
        filter: isClass(...ROAD_CLASSES),
        layout: {
          'symbol-placement': 'line',
          'text-field': NAME,
          'text-font': REGULAR,
          'text-size': byZoom(13, 10, 18, 13),
          'text-letter-spacing': 0.02,
        },
        paint: {
          'text-color': c.labelMuted,
          'text-halo-color': c.halo,
          'text-halo-width': 1.6,
        },
      },
      {
        id: 'housenumber',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'housenumber',
        minzoom: 17,
        layout: {
          'text-field': ['get', 'housenumber'],
          'text-font': REGULAR,
          'text-size': 10,
        },
        paint: {
          'text-color': c.labelSubtle,
          'text-halo-color': c.halo,
          'text-halo-width': 1.2,
        },
      },
      // Like OpenMapTiles styles, show the most important POIs first
      poiLayer(theme, 'poi-r1', 15, [
        '<=',
        ['coalesce', ['get', 'rank'], 99],
        6,
      ]),
      poiLayer(theme, 'poi-r7', 16, [
        'all',
        ['>', ['coalesce', ['get', 'rank'], 99], 6],
        ['<=', ['coalesce', ['get', 'rank'], 99], 19],
      ]),
      poiLayer(theme, 'poi-r20', 17, [
        '>',
        ['coalesce', ['get', 'rank'], 99],
        19,
      ]),
      placeLabel(
        c,
        'place-neighbourhood',
        ['neighbourhood', 'quarter', 'suburb'],
        {
          minzoom: 12,
          font: BOLD,
          size: byZoom(12, 10, 16, 12.5),
          color: c.labelMuted,
          uppercase: true,
        },
      ),
      placeLabel(c, 'place-village', ['village', 'hamlet'], {
        minzoom: 11,
        font: REGULAR,
        size: byZoom(11, 11, 16, 14),
        color: c.labelSoft,
      }),
      placeLabel(c, 'place-town', ['town'], {
        minzoom: 8,
        font: REGULAR,
        size: byZoom(8, 11.5, 15, 16),
        color: c.label,
      }),
      placeLabel(c, 'place-city', ['city'], {
        minzoom: 4,
        font: BOLD,
        size: byZoom(4, 11, 8, 14, 12, 19),
        color: c.label,
      }),
      placeLabel(c, 'place-state', ['state'], {
        minzoom: 5,
        maxzoom: 9,
        font: BOLD,
        size: byZoom(5, 10, 8, 12),
        color: c.labelSubtle,
        uppercase: true,
      }),
      placeLabel(c, 'place-country', ['country'], {
        maxzoom: 7,
        font: BOLD,
        size: byZoom(2, 11, 6, 16),
        color: c.labelSoft,
      }),
    ],
  }
}

export const MAP_STYLES: Record<Theme, StyleSpecification> = {
  light: buildStyle('light'),
  dark: buildStyle('dark'),
}
