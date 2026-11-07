import type { IControl } from 'maplibre-gl'
import { STROKES } from '../../icons/strokes.ts'
import {
  isMeasuring,
  subscribeMeasuring,
  toggleMeasuring,
} from './measureMode.ts'

/** A map button that turns distance measuring on and off. */
export class MeasureControl implements IControl {
  private readonly container = document.createElement('div')
  private readonly button = document.createElement('button')
  private unsubscribe?: () => void

  private readonly sync = () => {
    const on = isMeasuring()
    this.button.setAttribute('aria-pressed', String(on))
    this.button.classList.toggle('is-on', on)
  }

  onAdd() {
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this.button.type = 'button'
    this.button.className = 'mv-measure-button'
    this.button.title = 'Mesafe ölç (M)'
    this.button.setAttribute('aria-label', 'Mesafe ölç')
    this.button.setAttribute('aria-keyshortcuts', 'M')
    this.button.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${STROKES.ruler}"/></svg>`
    this.button.addEventListener('click', toggleMeasuring)
    this.container.append(this.button)
    this.unsubscribe = subscribeMeasuring(this.sync)
    this.sync()
    return this.container
  }

  onRemove() {
    this.unsubscribe?.()
    this.container.remove()
  }
}
