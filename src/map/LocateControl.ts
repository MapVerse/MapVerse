import type {
  GeolocateControl,
  IControl,
  Map as MapLibreMap,
} from 'maplibre-gl'
import { t } from '../i18n/index.ts'
import { compassHeading, easeHeading, shouldTurn } from './heading.ts'

/** Safari on iOS asks before it shares the compass. */
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
}

/** How far each reading eases the shown heading towards itself. */
const EASE = 0.25

/** How often, and for how big a change, the map turns to the heading. */
const TURN = { minDegrees: 3, interval: 250 }
/** With reduced motion: rarely, at once, and only for a clear change. */
const TURN_REDUCED = { minDegrees: 12, interval: 1500 }

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * MapLibre's my-location button, with the way the phone points: a cone
 * on the user's dot shows it, from the device's compass. With the map
 * following the user, another tap turns it to face that way, as Google
 * Maps does, and the next one turns it back to north and stops following,
 * as MapLibre's second tap does. On iOS, the compass is asked
 * for on the tap that finds the location. A desktop, with no compass,
 * sees MapLibre's button as it was.
 */
export class LocateControl implements IControl {
  private map?: MapLibreMap
  private readonly geolocate: GeolocateControl
  private readonly cone = document.createElement('div')
  private heading: number | null = null
  private listening = false
  private following = false
  private lastTurn = 0
  private frame = 0

  constructor(geolocate: GeolocateControl) {
    this.geolocate = geolocate
    this.cone.className = 'mv-heading'
    this.cone.setAttribute('aria-hidden', 'true')
  }

  onAdd(map: MapLibreMap) {
    this.map = map
    const element = this.geolocate.onAdd(map)
    // Heard before MapLibre's own handler on the button inside
    element.addEventListener('click', this.onClick, true)
    this.geolocate.on('trackuserlocationend', this.onTrackingEnd)
    this.geolocate.on('geolocate', this.draw)
    map.on('rotate', this.draw)
    return element
  }

  onRemove(map: MapLibreMap) {
    this.stopListening()
    cancelAnimationFrame(this.frame)
    this.geolocate.off('trackuserlocationend', this.onTrackingEnd)
    this.geolocate.off('geolocate', this.draw)
    map.off('rotate', this.draw)
    this.cone.remove()
    this.geolocate.onRemove()
    this.map = undefined
  }

  private get button() {
    return this.geolocate._geolocateButton
  }

  private readonly onClick = (event: MouseEvent) => {
    if (!this.listening) this.startListening()
    const state = this.geolocate._watchState
    if (this.following) {
      // North up again, and MapLibre's own handler stops following
      this.setFollowing(false)
      // Once it has, or turning would itself count as moving the map away
      setTimeout(() =>
        this.map?.easeTo({ bearing: 0, duration: reducedMotion() ? 0 : 500 }),
      )
    } else if (state === 'ACTIVE_LOCK' && this.heading !== null) {
      event.stopPropagation()
      this.setFollowing(true)
      this.turn(true)
    }
  }

  private startListening() {
    this.listening = true
    const Orientation = window.DeviceOrientationEvent as
      OrientationEventWithPermission | undefined
    if (!Orientation) return
    const listen = () => {
      // Chrome on Android gives north only in its own event
      const type =
        'ondeviceorientationabsolute' in window
          ? 'deviceorientationabsolute'
          : 'deviceorientation'
      window.addEventListener(type, this.onOrientation as EventListener)
    }
    if (typeof Orientation.requestPermission === 'function') {
      // Asked within the tap, as Safari wants
      Orientation.requestPermission()
        .then((answer) => {
          if (answer === 'granted' && this.listening) listen()
        })
        .catch(() => {})
    } else {
      listen()
    }
  }

  private stopListening() {
    this.listening = false
    window.removeEventListener(
      'deviceorientationabsolute',
      this.onOrientation as EventListener,
    )
    window.removeEventListener(
      'deviceorientation',
      this.onOrientation as EventListener,
    )
  }

  private readonly onOrientation = (event: CompassEvent) => {
    const next = compassHeading(event, screen.orientation?.angle ?? 0)
    if (next === null) return
    const first = this.heading === null
    this.heading = easeHeading(this.heading, next, EASE)
    if (first) this.syncButton()
    cancelAnimationFrame(this.frame)
    this.frame = requestAnimationFrame(() => {
      this.draw()
      if (this.following) this.turn(false)
    })
  }

  /** Points the cone, on the dot MapLibre draws, the way the phone does. */
  private readonly draw = () => {
    const dot = this.geolocate._dotElement
    if (!this.map || !dot || this.heading === null) return
    if (this.cone.parentElement !== dot) dot.append(this.cone)
    dot.classList.add('has-heading')
    const angle = this.heading - this.map.getBearing()
    this.cone.style.transform = `rotate(${angle.toFixed(1)}deg)`
  }

  /** Turns the map to face the heading, unhurried and not too often. */
  private turn(now: boolean) {
    const map = this.map
    if (!map || this.heading === null) return
    const reduced = reducedMotion()
    const time = performance.now()
    if (
      !now &&
      !shouldTurn(
        map.getBearing(),
        this.heading,
        time - this.lastTurn,
        reduced ? TURN_REDUCED : TURN,
      )
    ) {
      return
    }
    this.lastTurn = time
    // Tagged so MapLibre keeps following the user
    map.easeTo(
      {
        bearing: this.heading,
        duration: reduced ? 0 : now ? 500 : TURN.interval,
        easing: (t) => t,
      },
      { geolocateSource: true },
    )
  }

  private readonly onTrackingEnd = () => {
    // Moved by hand, or stopped: the map no longer turns with the phone
    this.setFollowing(false)
    if (this.geolocate._watchState === 'OFF') {
      this.stopListening()
      this.heading = null
      this.cone.remove()
      this.geolocate._dotElement?.classList.remove('has-heading')
      this.syncButton()
    }
  }

  private setFollowing(on: boolean) {
    this.following = on
    this.syncButton()
  }

  /** Names what the next tap does, once there is a heading to turn to. */
  private syncButton() {
    const button = this.button
    if (!button || !this.map) return
    button.classList.toggle('mv-heading-on', this.following)
    const label = this.following
      ? t('controls.northStopLocating')
      : this.heading !== null
        ? t('controls.locateAndTurn')
        : this.map._getUIString('GeolocateControl.FindMyLocation')
    button.title = label
    button.setAttribute('aria-label', label)
  }
}
