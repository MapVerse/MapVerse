import { GLYPHS, type GlyphName } from './glyphs.ts'

/** Map badge image size in CSS px, with room for its border and shadow. */
export const BADGE_IMAGE_PX = 28
const TILE_PX = 21
const GLYPH_PX = 13.5
const RATIO = 2

/**
 * Draws a POI badge: a rounded tile in the category colour with a white
 * border, a soft shadow and the category glyph in two tones of white.
 */
export function drawBadge(glyph: GlyphName, color: string): ImageData {
  const size = BADGE_IMAGE_PX * RATIO
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.scale(RATIO, RATIO)

  const inset = (BADGE_IMAGE_PX - TILE_PX) / 2
  ctx.shadowColor = 'rgb(15 23 42 / 32%)'
  ctx.shadowBlur = 2.5
  ctx.shadowOffsetY = 0.8
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.roundRect(inset - 1.5, inset - 1.5, TILE_PX + 3, TILE_PX + 3, 8)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(inset, inset, TILE_PX, TILE_PX, 6.5)
  ctx.fill()

  const offset = (BADGE_IMAGE_PX - GLYPH_PX) / 2
  ctx.translate(offset, offset)
  ctx.scale(GLYPH_PX / 24, GLYPH_PX / 24)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.4
  for (const layer of GLYPHS[glyph]) {
    ctx.globalAlpha = 'light' in layer ? 0.55 : 1
    const path = new Path2D(layer.d)
    ctx.fill(path, 'evenodd' in layer ? 'evenodd' : 'nonzero')
    if ('soften' in layer) ctx.stroke(path)
  }
  return ctx.getImageData(0, 0, size, size)
}
