import type { Map as MapLibreMap } from 'maplibre-gl'
import { STROKES } from '../../icons/strokes.ts'
import type { Theme } from '../../theme/theme.ts'
import type { FavoriteKind } from './favorites.ts'

const PREFIX = 'saved-place-'
const KINDS = new Set<string>(['home', 'work', 'star'])
/** The map image of a saved place's badge, for each kind and theme. */
export const savedPlaceImage = (kind: FavoriteKind, theme: Theme) =>
  `${PREFIX}${kind}-${theme}`

/** Badge size in CSS px, with room for its shadow, drawn at twice that. */
const SIZE = 22
const RATIO = 2

export const SAVED_COLORS: Record<FavoriteKind, string> = {
  star: '#f59e0b',
  home: '#2563eb',
  work: '#2563eb',
}

/**
 * A saved place's badge: a small disc ringed in white (dark grey on the
 * dark map), gold with a white star for a starred place, blue with a
 * house or a briefcase for home and work.
 */
function drawBadge(kind: FavoriteKind, theme: Theme): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE * RATIO
  canvas.height = SIZE * RATIO
  const ctx = canvas.getContext('2d')!
  ctx.scale(RATIO, RATIO)
  const center = SIZE / 2
  ctx.shadowColor =
    theme === 'dark' ? 'rgb(0 0 0 / 50%)' : 'rgb(15 23 42 / 30%)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.fillStyle = theme === 'dark' ? '#2c313a' : '#fff'
  ctx.beginPath()
  ctx.arc(center, center, 9, 0, 2 * Math.PI)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = SAVED_COLORS[kind]
  ctx.beginPath()
  ctx.arc(center, center, 7.5, 0, 2 * Math.PI)
  ctx.fill()
  // The icon, from the interface's own, 11 px across
  const glyph = 11
  ctx.translate(center - glyph / 2, center - glyph / 2)
  ctx.scale(glyph / 24, glyph / 24)
  const path = new Path2D(STROKES[kind])
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (kind === 'star') {
    ctx.lineWidth = 2
    ctx.fill(path)
    ctx.stroke(path)
  } else {
    ctx.lineWidth = 2.6
    ctx.stroke(path)
  }
  return ctx.getImageData(0, 0, SIZE * RATIO, SIZE * RATIO)
}

/** Draws a saved place's badge the first time the map asks for it. */
export function resolveSavedPlaceImage(map: MapLibreMap, id: string): boolean {
  if (!id.startsWith(PREFIX)) return false
  const [kind, theme] = id.slice(PREFIX.length).split('-')
  if (!KINDS.has(kind)) return false
  map.addImage(
    id,
    drawBadge(kind as FavoriteKind, theme === 'dark' ? 'dark' : 'light'),
    { pixelRatio: RATIO },
  )
  return true
}
