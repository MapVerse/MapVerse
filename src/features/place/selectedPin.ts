import type { Map } from 'maplibre-gl'

export const SELECTED_PIN = 'selected-pin'
/** Distance from the pin's tip up to the centre of its head, in px. */
export const PIN_HEAD_OFFSET = 30

const WIDTH = 36
const HEIGHT = 48
const RATIO = 2

/** Adds a red teardrop pin, drawn on a canvas, to the map's images. */
export function addSelectedPinImage(map: Map) {
  if (map.hasImage(SELECTED_PIN)) return
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * RATIO
  canvas.height = HEIGHT * RATIO
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(RATIO, RATIO)

  const x = WIDTH / 2
  const y = HEIGHT - PIN_HEAD_OFFSET
  const r = 16
  const tip = HEIGHT - 2
  ctx.beginPath()
  ctx.moveTo(x, tip)
  ctx.bezierCurveTo(x - 6, tip - 10, x - r, y + 10, x - r, y)
  ctx.arc(x, y, r, Math.PI, 0)
  ctx.bezierCurveTo(x + r, y + 10, x + 6, tip - 10, x, tip)
  ctx.fillStyle = '#e5484d'
  ctx.shadowColor = 'rgb(0 0 0 / 30%)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, 12, 0, 2 * Math.PI)
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'transparent'
  ctx.fill()

  map.addImage(
    SELECTED_PIN,
    ctx.getImageData(0, 0, canvas.width, canvas.height),
    { pixelRatio: RATIO },
  )
}
