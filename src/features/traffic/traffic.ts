import type {
  ExpressionSpecification,
  LayerSpecification,
  VectorSourceSpecification,
} from 'maplibre-gl'

/** TomTom's live traffic needs an API key; without one the feature stays off. */
export const TRAFFIC_API_KEY =
  (import.meta.env.VITE_TOMTOM_API_KEY as string | undefined)?.trim() ||
  undefined

export const TRAFFIC_SOURCE_ID = 'traffic'
/** TomTom refreshes flow data about once a minute. */
export const TRAFFIC_REFRESH_MS = 2 * 60 * 1000

export function trafficSource(apiKey: string): VectorSourceSpecification {
  return {
    type: 'vector',
    // "relative" tiles give each road's speed relative to free-flowing traffic
    tiles: [
      `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.pbf?key=${encodeURIComponent(apiKey)}`,
    ],
    maxzoom: 22,
    attribution:
      'Trafik © <a href="https://www.tomtom.com" target="_blank">TomTom</a>',
  }
}

/** Current speed as a share of free-flow speed (0–1), from standstill to free-flowing. */
const SPEED_COLOR: ExpressionSpecification = [
  'step',
  ['coalesce', ['get', 'traffic_level'], -1],
  // no speed on the road: neutral grey rather than a guess
  '#94a3b8',
  0,
  '#991b1b',
  0.25,
  '#ef4444',
  0.5,
  '#f59e0b',
  0.75,
  '#22c55e',
]

const WIDTH: ExpressionSpecification = [
  'interpolate',
  ['exponential', 1.5],
  ['zoom'],
  10,
  1.4,
  14,
  3,
  18,
  7,
]

export const TRAFFIC_LAYERS: LayerSpecification[] = [
  {
    id: 'traffic-flow',
    type: 'line',
    source: TRAFFIC_SOURCE_ID,
    'source-layer': 'Traffic flow',
    minzoom: 9,
    filter: ['!=', ['get', 'road_closure'], true],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': SPEED_COLOR,
      'line-width': WIDTH,
      'line-opacity': 0.9,
    },
  },
  {
    id: 'traffic-closed',
    type: 'line',
    source: TRAFFIC_SOURCE_ID,
    'source-layer': 'Traffic flow',
    minzoom: 9,
    filter: ['==', ['get', 'road_closure'], true],
    paint: {
      'line-color': '#7f1d1d',
      'line-width': WIDTH,
      'line-dasharray': [1, 1.2],
    },
  },
]
