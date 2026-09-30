import { labelColor } from '../features/place/categories.ts'
import { GLYPHS, type GlyphName } from './glyphs.ts'

/** Map badge image size in CSS px, with room for its shadow. */
export const BADGE_IMAGE_PX = 30
const DISC_PX = 22
const GLYPH_PX = 13
const RATIO = 2

/**
 * Draws a POI badge. Normally a white disc (dark grey on the dark map) with
 * a soft shadow and the category glyph in its colour; when selected, the
 * disc takes the category colour and the glyph turns white.
 */
export function drawBadge(
  glyph: GlyphName,
  color: string,
  { selected = false, dark = false } = {},
): ImageData {
  const size = BADGE_IMAGE_PX * RATIO
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.scale(RATIO, RATIO)

  const center = BADGE_IMAGE_PX / 2
  const radius = DISC_PX / 2
  ctx.shadowColor = dark ? 'rgb(0 0 0 / 45%)' : 'rgb(15 23 42 / 22%)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1
  ctx.fillStyle = selected ? color : dark ? '#2c313a' : '#fff'
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, 2 * Math.PI)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = selected ? 2 : 1
  ctx.strokeStyle = selected
    ? '#fff'
    : dark
      ? 'rgb(255 255 255 / 9%)'
      : 'rgb(15 23 42 / 7%)'
  ctx.beginPath()
  ctx.arc(center, center, radius - ctx.lineWidth / 2, 0, 2 * Math.PI)
  ctx.stroke()

  const offset = center - GLYPH_PX / 2
  ctx.translate(offset, offset)
  ctx.scale(GLYPH_PX / 24, GLYPH_PX / 24)
  // On the dark disc, the lighter shade used for dark map labels
  const ink = selected ? '#fff' : dark ? labelColor(color, 'dark') : color
  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.4
  for (const layer of GLYPHS[glyph]) {
    ctx.globalAlpha = 'light' in layer ? (selected ? 0.55 : 0.4) : 1
    const path = new Path2D(layer.d)
    ctx.fill(path, 'evenodd' in layer ? 'evenodd' : 'nonzero')
    if ('soften' in layer) ctx.stroke(path)
  }
  return ctx.getImageData(0, 0, size, size)
}
