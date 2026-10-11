import { labelColor } from '../features/place/categories.ts'
import { GLYPHS, type GlyphName } from './glyphs.ts'

/** Map badge image size in CSS px, with room for its shadow. */
export const BADGE_IMAGE_PX = 30
const DISC_PX = 22
const GLYPH_PX = 13
const RATIO = 2
// San Andreas' radar blips: a square icon in a heavy black frame
const BLIP_PX = 20
const BLIP_FRAME_PX = 2.5
const BLIP_GLYPH_PX = 12

/**
 * Draws a POI badge. Normally a white disc (dark grey on the dark map) with
 * a soft shadow and the category glyph in its colour; when selected, the
 * disc takes the category colour and the glyph turns white.
 */
export function drawBadge(
  glyph: GlyphName,
  color: string,
  { selected = false, dark = false, blip = false } = {},
): ImageData {
  const size = BADGE_IMAGE_PX * RATIO
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.scale(RATIO, RATIO)
  if (blip) {
    drawBlip(ctx, glyph, color, selected)
    return ctx.getImageData(0, 0, size, size)
  }

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

/**
 * A San Andreas radar blip: the category colour in a crisp black frame with
 * the glyph in white, no shadow. Selected blips, like the game's objectives,
 * get a yellow frame round the black.
 */
function drawBlip(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphName,
  color: string,
  selected: boolean,
) {
  const start = (BADGE_IMAGE_PX - BLIP_PX) / 2
  const square = (inset: number, fill: string, radius: number) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.roundRect(
      start + inset,
      start + inset,
      BLIP_PX - 2 * inset,
      BLIP_PX - 2 * inset,
      radius,
    )
    ctx.fill()
  }
  if (selected) square(-2.5, '#ffd83a', 5)
  square(0, '#000', 4)
  square(BLIP_FRAME_PX, color, 2)

  const offset = (BADGE_IMAGE_PX - BLIP_GLYPH_PX) / 2
  ctx.translate(offset, offset)
  ctx.scale(BLIP_GLYPH_PX / 24, BLIP_GLYPH_PX / 24)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.4
  for (const layer of GLYPHS[glyph]) {
    ctx.globalAlpha = 'light' in layer ? 0.6 : 1
    const path = new Path2D(layer.d)
    ctx.fill(path, 'evenodd' in layer ? 'evenodd' : 'nonzero')
    if ('soften' in layer) ctx.stroke(path)
  }
}
