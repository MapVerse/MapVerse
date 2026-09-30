import type { IControl, Map as MapLibreMap } from 'maplibre-gl'

/** Several map controls drawn together as one glass capsule. */
export class ControlGroup implements IControl {
  private readonly container = document.createElement('div')
  private readonly label: string
  private readonly controls: IControl[]

  constructor(label: string, controls: IControl[]) {
    this.label = label
    this.controls = controls
  }

  onAdd(map: MapLibreMap) {
    this.container.className = 'maplibregl-ctrl mv-group mv-glass'
    this.container.setAttribute('role', 'group')
    this.container.setAttribute('aria-label', this.label)
    // Each control keeps its own element, so it can still update it
    for (const control of this.controls) {
      this.container.append(control.onAdd(map))
    }
    return this.container
  }

  onRemove(map: MapLibreMap) {
    for (const control of this.controls) control.onRemove(map)
    this.container.remove()
  }
}
