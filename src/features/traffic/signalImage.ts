import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Theme } from '../../theme/theme.ts'

/** The map image of a traffic light, for each theme. */
export const signalImage = (theme: Theme) => `traffic-signal-${theme}`

/** Its size in CSS px, with room round it for its shadow and glow. */
const [WIDTH, HEIGHT] = [16, 28]
const RATIO = 2
const LAMPS = ['#ff4d4f', '#ffb21f', '#22d37a']

/**
 * Draws a traffic light: a slim graphite capsule, lit softly from above,
 * with its red, amber and green lamps glowing one over another. No rim
 * round it; a soft shadow sets it off the map.
 */
export function drawSignal(theme: Theme): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * RATIO
  canvas.height = HEIGHT * RATIO
  const ctx = canvas.getContext('2d')!
  ctx.scale(RATIO, RATIO)

  const [x, y, w, h] = [WIDTH / 2 - 4.5, 2.5, 9, HEIGHT - 6]
  const dark = theme === 'dark'
  const body = ctx.createLinearGradient(0, y, 0, y + h)
  body.addColorStop(0, dark ? '#4a515c' : '#3a404a')
  body.addColorStop(1, dark ? '#2b3038' : '#1c2027')
  ctx.shadowColor = dark ? 'rgb(0 0 0 / 55%)' : 'rgb(15 23 42 / 35%)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, w / 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // A sheen along its top edge
  const sheen = ctx.createLinearGradient(0, y, 0, y + 4)
  sheen.addColorStop(0, 'rgb(255 255 255 / 22%)')
  sheen.addColorStop(1, 'rgb(255 255 255 / 0%)')
  ctx.fillStyle = sheen
  ctx.beginPath()
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, 6, [w / 2, w / 2, 1, 1])
  ctx.fill()

  LAMPS.forEach((color, i) => {
    const [cx, cy] = [WIDTH / 2, y + 4.8 + i * 6.2]
    ctx.shadowColor = color
    ctx.shadowBlur = dark ? 4 : 2.5
    const lamp = ctx.createRadialGradient(cx - 0.6, cy - 0.6, 0.2, cx, cy, 2.4)
    lamp.addColorStop(0, '#ffffff')
    lamp.addColorStop(0.35, color)
    lamp.addColorStop(1, color)
    ctx.fillStyle = lamp
    ctx.beginPath()
    ctx.arc(cx, cy, 2.3, 0, 2 * Math.PI)
    ctx.fill()
  })
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/** Adds the traffic light's image when the map first asks for it. */
export function resolveSignalImage(map: MapLibreMap, id: string): boolean {
  const theme = (['light', 'dark'] as const).find((t) => signalImage(t) === id)
  if (!theme) return false
  map.addImage(id, drawSignal(theme), { pixelRatio: RATIO })
  return true
}
