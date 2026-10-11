import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  RasterDEMSourceSpecification,
  StyleSpecification,
} from 'maplibre-gl'
import { LANDMARKS } from '../features/landmarks/catalog.ts'
import { hideBuildings, hideZones } from '../features/landmarks/landmarks.ts'
import type { Theme } from '../theme/theme.ts'
import type { MapDesign } from './designSetting.ts'
import { poiFilter, poiIconImage, poiLabelColor } from './poiStyle.ts'

// A bright, lightly coloured map: warm ground, clear blue water, green
// parks, tinted districts and yellow highways. Its dark counterpart stays
// muted, so routes, places and category colours stand out on both.
const LIGHT = {
  // How labels are set: San Andreas writes them in capitals with a heavy
  // outline, in one colour rather than each POI's category colour
  upperLabels: false,
  haloScale: 1,
  poiLabel: null as string | null,
  land: '#f4f2ee',
  landuse: '#eeebe6',
  commercial: '#f8edf0',
  industrial: '#ece9f3',
  hospital: '#fce3e6',
  education: '#f8f0d6',
  green: '#cdeac0',
  wood: '#bfe0b1',
  sand: '#f7edcc',
  ice: '#ffffff',
  water: '#a6d3f5',
  waterLabel: '#3a78b0',
  building: '#e6e0d8',
  buildingLine: '#d6cfc5',
  extrusion: '#efece8',
  road: '#ffffff',
  primary: '#fff5cc',
  motorway: '#ffd466',
  casing: '#dad6cf',
  majorCasing: '#ead9a0',
  motorwayCasing: '#e3a93a',
  tunnel: '#f7f5f2',
  path: '#c4beb3',
  rail: '#b8bcc6',
  runway: '#e6e2db',
  ferry: '#6fa8d8',
  boundary: '#a79fc2',
  stateBoundary: '#cbc5dc',
  label: '#1f2937',
  labelSoft: '#4b5563',
  labelMuted: '#6b7280',
  labelSubtle: '#9ca3af',
  // Names of estates and industrial areas, fetched outside the tiles
  areaLabel: '#8a7d6f',
  halo: '#ffffff',
  lightColor: '#ffffff',
  lightIntensity: 0.22,
  // Relief on the 3D terrain, and the sky above the horizon
  hillShadow: '#4b5563',
  hillHighlight: '#ffffff',
  hillAccent: '#6b7280',
  hillStrength: 0.45,
  sky: '#cfe5f8',
}

type Palette = typeof LIGHT

const DARK: Palette = {
  ...LIGHT,
  land: '#1b1e24',
  landuse: '#1f232a',
  commercial: '#231f27',
  industrial: '#20222d',
  hospital: '#2a2127',
  education: '#28261e',
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
  primary: '#3e4553',
  motorway: '#5a5241',
  casing: '#252a32',
  majorCasing: '#2c323c',
  motorwayCasing: '#332e25',
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
  areaLabel: '#8a94a3',
  halo: '#1b1e24',
  lightColor: '#ffffff',
  lightIntensity: 0.2,
  hillShadow: '#000000',
  hillHighlight: '#4a5363',
  hillAccent: '#0c0e12',
  hillStrength: 0.55,
  sky: '#10151c',
}

// An old printed map: parchment ground, sea-green water, inked labels and
// ochre highways; by night, the same in sepia
const VINTAGE_LIGHT: Palette = {
  ...LIGHT,
  land: '#f1e6cc',
  landuse: '#ebdfc2',
  commercial: '#f0dcc8',
  industrial: '#e2d9c6',
  hospital: '#efd2c4',
  education: '#efe0b8',
  green: '#d5dcac',
  wood: '#c3ce98',
  sand: '#f3e2b3',
  ice: '#fbf7ee',
  water: '#b7d0c8',
  waterLabel: '#4d7468',
  building: '#e2d3b4',
  buildingLine: '#c9b48f',
  extrusion: '#eadcc0',
  road: '#fbf5e6',
  primary: '#f7e4b8',
  motorway: '#e9b875',
  casing: '#cdb894',
  majorCasing: '#c9a46a',
  motorwayCasing: '#a8743d',
  tunnel: '#efe5cf',
  path: '#a89272',
  rail: '#8f7e66',
  runway: '#e0d2b5',
  ferry: '#6f988b',
  boundary: '#9a6a5a',
  stateBoundary: '#c4a493',
  label: '#3f2e1e',
  labelSoft: '#5a4630',
  labelMuted: '#76603f',
  labelSubtle: '#9a8565',
  areaLabel: '#8a6f4f',
  halo: '#f6eedb',
  lightColor: '#fff4dc',
  hillShadow: '#5a4630',
  hillHighlight: '#fffaf0',
  hillAccent: '#76603f',
  sky: '#e8dcc0',
}

const VINTAGE_DARK: Palette = {
  ...DARK,
  land: '#221d17',
  landuse: '#262019',
  commercial: '#2a211c',
  industrial: '#25211c',
  hospital: '#2d211d',
  education: '#2a2519',
  green: '#232619',
  wood: '#20261a',
  sand: '#2e2a1e',
  ice: '#2e2b26',
  water: '#16231f',
  waterLabel: '#7f9e92',
  building: '#2a241d',
  buildingLine: '#3a3126',
  extrusion: '#332b22',
  road: '#4a3f30',
  primary: '#574631',
  motorway: '#6e5332',
  casing: '#2a231b',
  majorCasing: '#30271c',
  motorwayCasing: '#3a2c1a',
  tunnel: '#2e271f',
  path: '#5e5140',
  rail: '#544838',
  runway: '#2e2820',
  ferry: '#4a6a60',
  boundary: '#7a5a4a',
  stateBoundary: '#4f4236',
  label: '#efe2c6',
  labelSoft: '#d6c5a2',
  labelMuted: '#ab9a7a',
  labelSubtle: '#7f705a',
  areaLabel: '#a08f70',
  halo: '#221d17',
  lightColor: '#fff0d6',
  hillHighlight: '#4f4536',
  hillAccent: '#0e0b08',
  sky: '#16120e',
}

// After GTA San Andreas' radar: dusty desert ground, olive grass, muted blue
// water, grey asphalt with dark kerbs and white capitals outlined in black,
// under an orange smoggy sky. By night, the game's purple-blue streets.
const SAN_ANDREAS_DAY: Palette = {
  ...LIGHT,
  upperLabels: true,
  haloScale: 1.5,
  poiLabel: '#ffffff',
  land: '#b9ad8a',
  landuse: '#b0a582',
  commercial: '#b5a38c',
  industrial: '#a39d8e',
  hospital: '#c0a39a',
  education: '#bdb08a',
  green: '#8ea36a',
  wood: '#6f8a52',
  sand: '#d8c48f',
  ice: '#e6e6e6',
  water: '#5d7fa3',
  waterLabel: '#ffffff',
  building: '#9c9284',
  buildingLine: '#7e7568',
  extrusion: '#bdb3a2',
  road: '#8c8c8c',
  primary: '#7d7d7d',
  motorway: '#5f5f5f',
  casing: '#4a4a4a',
  majorCasing: '#3c3c3c',
  motorwayCasing: '#2a2a2a',
  tunnel: '#a09a8c',
  path: '#8a7d62',
  rail: '#5b5249',
  runway: '#7a7a7a',
  ferry: '#3d5f85',
  boundary: '#5a4a3a',
  stateBoundary: '#7a6a55',
  label: '#ffffff',
  labelSoft: '#f4f4f4',
  labelMuted: '#ececec',
  labelSubtle: '#dedede',
  areaLabel: '#f3e3bd',
  halo: '#000000',
  lightColor: '#ffd9a0',
  lightIntensity: 0.3,
  hillShadow: '#3b2e1e',
  hillHighlight: '#f2dcae',
  hillAccent: '#5a4630',
  hillStrength: 0.55,
  sky: '#f0a860',
}

const SAN_ANDREAS_NIGHT: Palette = {
  ...SAN_ANDREAS_DAY,
  land: '#2f3140',
  landuse: '#33354a',
  commercial: '#3a3148',
  industrial: '#33344a',
  hospital: '#43303e',
  education: '#3e3a36',
  green: '#2f3f33',
  wood: '#273629',
  sand: '#4a4434',
  ice: '#4a4e5c',
  water: '#1b2a45',
  building: '#3b3d4d',
  buildingLine: '#4a4c5e',
  extrusion: '#46485a',
  road: '#5c5c66',
  primary: '#6a6670',
  // Sodium-lit freeways
  motorway: '#7a7058',
  casing: '#1e1f28',
  majorCasing: '#1a1b22',
  motorwayCasing: '#14151b',
  tunnel: '#3a3b46',
  path: '#5a5468',
  rail: '#565266',
  runway: '#4a4a55',
  ferry: '#3a5278',
  boundary: '#7a6a8a',
  stateBoundary: '#5a4f68',
  areaLabel: '#d8c8a0',
  lightColor: '#c8b8ff',
  lightIntensity: 0.2,
  hillShadow: '#000000',
  hillHighlight: '#5a5470',
  hillAccent: '#101018',
  hillStrength: 0.6,
  sky: '#1c1630',
}

const PALETTES: Record<MapDesign, Record<Theme, Palette>> = {
  standard: { light: LIGHT, dark: DARK },
  vintage: { light: VINTAGE_LIGHT, dark: VINTAGE_DARK },
  'san-andreas': { light: SAN_ANDREAS_DAY, dark: SAN_ANDREAS_NIGHT },
}

/** Halo behind map labels, for layers added outside the style. */
export function labelHalo(theme: Theme, design: MapDesign = 'standard') {
  return PALETTES[design][theme].halo
}

/** Colour for the names of estates and industrial areas. */
export function areaLabelColor(theme: Theme, design: MapDesign = 'standard') {
  return PALETTES[design][theme].areaLabel
}

/** A few of a design's colours, for its preview in the settings. */
export function designSwatch(design: MapDesign, theme: Theme) {
  const c = PALETTES[design][theme]
  return {
    land: c.land,
    green: c.green,
    water: c.water,
    road: c.road,
    casing: c.casing,
    motorway: c.motorway,
  }
}

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

/**
 * Buildings rise in 3D from this zoom, landmarks among them, out of the
 * ground to their full height a zoom in; further out, they lie flat.
 */
export const RISE_ZOOM = 15

/** A height that grows out of the ground as the buildings rise in 3D. */
export const rising = (
  height: ExpressionSpecification,
): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  RISE_ZOOM,
  0,
  RISE_ZOOM + 1,
  height,
]

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
          ['motorway', 'trunk'],
          c.motorwayCasing,
          'primary',
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
        'line-color': tunnel
          ? c.tunnel
          : [
              'match',
              ['get', 'class'],
              ['motorway', 'trunk'],
              c.motorway,
              'primary',
              c.primary,
              c.road,
            ],
        'line-width': roadWidth(false),
      },
    },
  ]
}

function poiLayer(
  theme: Theme,
  c: Palette,
  id: string,
  minzoom: number,
  rank: ExpressionSpecification,
): LayerSpecification {
  return {
    id,
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom,
    filter: ['all', rank, poiFilter()],
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
      'text-color': c.poiLabel ?? poiLabelColor(theme),
      'text-halo-color': c.halo,
      'text-halo-width': 1.5 * c.haloScale,
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
      ...((options.uppercase || c.upperLabels) && {
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      }),
    },
    paint: {
      'text-color': options.color,
      'text-halo-color': c.halo,
      'text-halo-width': 1.6 * c.haloScale,
    },
  }
}

// Elevation from the open Terrain Tiles dataset on AWS (no key needed).
// Terrain and hillshade read it through separate sources, as MapLibre
// recommends, since each fetches the tiles at its own zoom.
const DEM_SOURCE: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  tiles: [
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  ],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
  attribution:
    '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Mapzen Terrain Tiles</a>',
}

function hillshade(c: Palette): LayerSpecification {
  return {
    id: 'hillshade',
    type: 'hillshade',
    source: 'hillshade-dem',
    paint: {
      'hillshade-shadow-color': c.hillShadow,
      'hillshade-highlight-color': c.hillHighlight,
      'hillshade-accent-color': c.hillAccent,
      'hillshade-exaggeration': c.hillStrength,
    },
  }
}

/** The map's own buildings that the landmarks are drawn in place of. */
const LANDMARK_ZONES = hideZones(LANDMARKS)

function buildStyle(
  theme: Theme,
  terrain: boolean,
  design: MapDesign,
): StyleSpecification {
  const c = PALETTES[design][theme]
  return {
    version: 8,
    name: 'MapVerse',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    // Restyle at once: with terrain, MapLibre caches the map as textures and
    // would keep the first frame of a colour fade, i.e. the old theme
    transition: { duration: 0, delay: 0 },
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
      },
      ...(terrain && {
        'terrain-dem': DEM_SOURCE,
        'hillshade-dem': DEM_SOURCE,
      }),
    },
    ...(terrain && {
      terrain: { source: 'terrain-dem', exaggeration: 1.4 },
      sky: {
        'sky-color': c.sky,
        'horizon-color': c.land,
        'fog-color': c.land,
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.6,
        'fog-ground-blend': 0.7,
      },
    }),
    // Soft, high light so building sides shade gently
    light: {
      anchor: 'map',
      position: [1.15, 210, 30],
      color: c.lightColor,
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
            'hospital',
            c.hospital,
            ['school', 'university', 'college'],
            c.education,
            ['commercial', 'retail'],
            c.commercial,
            'industrial',
            c.industrial,
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
      // Under the water, which covers the sea floor's relief
      ...(terrain ? [hillshade(c)] : []),
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
        // Landmarks, drawn in 3D once buildings rise, stand in for their own
        filter: [
          'any',
          ['<', ['zoom'], RISE_ZOOM],
          hideBuildings(LANDMARK_ZONES),
        ],
        paint: {
          'fill-color': c.building,
          'fill-outline-color': c.buildingLine,
          // Let district tints show through a little
          'fill-opacity': 0.85,
        },
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: RISE_ZOOM,
        // Landmarks stand in for their own buildings
        filter: [
          'all',
          ['!=', ['get', 'hide_3d'], true],
          hideBuildings(LANDMARK_ZONES),
        ],
        paint: {
          'fill-extrusion-color': c.extrusion,
          'fill-extrusion-height': rising([
            'coalesce',
            ['get', 'render_height'],
            6,
          ]),
          'fill-extrusion-base': rising([
            'coalesce',
            ['get', 'render_min_height'],
            0,
          ]),
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
          'text-halo-width': 1.2 * c.haloScale,
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
          'text-halo-width': 1.2 * c.haloScale,
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
          'text-halo-width': 1.6 * c.haloScale,
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
          'text-halo-width': 1.2 * c.haloScale,
        },
      },
      // Like OpenMapTiles styles, show the most important POIs first
      poiLayer(theme, c, 'poi-r1', 15, [
        '<=',
        ['coalesce', ['get', 'rank'], 99],
        6,
      ]),
      poiLayer(theme, c, 'poi-r7', 16, [
        'all',
        ['>', ['coalesce', ['get', 'rank'], 99], 6],
        ['<=', ['coalesce', ['get', 'rank'], 99], 19],
      ]),
      poiLayer(theme, c, 'poi-r20', 17, [
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

const styles = new Map<string, StyleSpecification>()

/** The map style for a theme and design, with or without 3D terrain. */
export function mapStyle(
  theme: Theme,
  terrain: boolean,
  design: MapDesign = 'standard',
): StyleSpecification {
  // The same object each time, so the map only restyles on a real change
  const key = `${design}:${theme}:${terrain}`
  let style = styles.get(key)
  if (!style) {
    style = buildStyle(theme, terrain, design)
    styles.set(key, style)
  }
  return style
}
