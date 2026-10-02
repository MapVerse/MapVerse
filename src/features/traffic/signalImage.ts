import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Theme } from '../../theme/theme.ts'

/** The map image of a traffic light, for each theme. */
export const signalImage = (theme: Theme) => `traffic-signal-${theme}`

const [WIDTH, HEIGHT] = [12, 24]
const RATIO = 2

/**
 * Draws a traffic light: a dark housing, edged to stand out on either
 * map, with its red, amber and green lamps one over another.
 */
export function drawSignal(theme: Theme): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * RATIO
  canvas.height = HEIGHT * RATIO
  const ctx = canvas.getContext('2d')!
  ctx.scale(RATIO, RATIO)

  ctx.shadowColor =
    theme === 'dark' ? 'rgb(0 0 0 / 50%)' : 'rgb(15 23 42 / 25%)'
  ctx.shadowBlur = 2
  ctx.shadowOffsetY = 0.5
  ctx.fillStyle = '#23272e'
  ctx.strokeStyle = theme === 'dark' ? '#5b6370' : '#ffffff'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(1.5, 1.5, WIDTH - 3, HEIGHT - 3, 3)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.stroke()

  for (const [i, color] of ['#ef4444', '#f59e0b', '#22c55e'].entries()) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(WIDTH / 2, 6 + i * 6, 2.1, 0, 2 * Math.PI)
    ctx.fill()
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/** Adds the traffic light's image when the map first asks for it. */
export function resolveSignalImage(map: MapLibreMap, id: string): boolean {
  const theme = (['light', 'dark'] as const).find((t) => signalImage(t) === id)
  if (!theme) return false
  map.addImage(id, drawSignal(theme), { pixelRatio: RATIO })
  return true
}
