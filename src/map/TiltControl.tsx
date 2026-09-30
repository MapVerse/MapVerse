import { useControl } from '@vis.gl/react-maplibre'
import type { ControlPosition, IControl, Map as MapLibreMap } from 'maplibre-gl'
import { STROKES } from '../icons/strokes.ts'

const TILTED_PITCH = 60
/** Buildings only rise from this zoom, so tilting zooms in at least this far. */
const BUILDINGS_ZOOM = 16

/** A map button that tilts the view to show 3D buildings, and back. */
class Tilt implements IControl {
  private map?: MapLibreMap
  private readonly container = document.createElement('div')
  private readonly button = document.createElement('button')

  private readonly sync = () => {
    const tilted = (this.map?.getPitch() ?? 0) > 10
    this.button.setAttribute('aria-pressed', String(tilted))
  }

  private readonly toggle = () => {
    const map = this.map
    if (!map) return
    const tilted = map.getPitch() > 10
    map.easeTo(
      tilted
        ? { pitch: 0, bearing: 0, duration: 900 }
        : {
            pitch: TILTED_PITCH,
            zoom: Math.max(map.getZoom(), BUILDINGS_ZOOM),
            duration: 900,
          },
    )
  }

  onAdd(map: MapLibreMap) {
    this.map = map
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this.button.type = 'button'
    this.button.className = 'mv-tilt'
    this.button.title = '3B görünüm'
    this.button.setAttribute('aria-label', '3B görünüm')
    this.button.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${STROKES.cube}"/></svg>`
    this.button.addEventListener('click', this.toggle)
    this.container.append(this.button)
    map.on('pitchend', this.sync)
    this.sync()
    return this.container
  }

  onRemove() {
    this.map?.off('pitchend', this.sync)
    this.container.remove()
    this.map = undefined
  }
}

export default function TiltControl({
  position,
}: {
  position: ControlPosition
}) {
  useControl(() => new Tilt(), { position })
  return null
}
