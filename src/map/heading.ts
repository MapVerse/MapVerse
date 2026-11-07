/** An angle in degrees, brought into [0, 360). */
export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/** The shortest turn from one angle to another, in (-180, 180] degrees. */
export function angleDelta(from: number, to: number): number {
  const d = normalizeAngle(to - from)
  return d > 180 ? d - 360 : d
}

/** What a device orientation reading carries, as far as heading goes. */
export type OrientationReading = {
  alpha: number | null
  absolute: boolean
  /** Safari on iOS: degrees from north, clockwise */
  webkitCompassHeading?: number | null
}

/**
 * Which way the top of the screen points, in degrees clockwise from north,
 * or null if the reading doesn't say (no compass, or an orientation only
 * relative to how the device lay when the page opened, as on a desktop).
 * `screenAngle` is how far the screen is turned from portrait, as
 * `screen.orientation.angle` gives it.
 */
export function compassHeading(
  reading: OrientationReading,
  screenAngle = 0,
): number | null {
  const { webkitCompassHeading: ios, alpha, absolute } = reading
  if (typeof ios === 'number' && Number.isFinite(ios) && ios >= 0) {
    return normalizeAngle(ios + screenAngle)
  }
  // alpha turns counterclockwise, from north only when absolute
  if (absolute && typeof alpha === 'number' && Number.isFinite(alpha)) {
    return normalizeAngle(360 - alpha + screenAngle)
  }
  return null
}

/**
 * A heading eased towards a new reading, the short way round, so the
 * compass's jitter doesn't shake the cone. `amount` is how far, 0 to 1.
 */
export function easeHeading(
  current: number | null,
  next: number,
  amount: number,
): number {
  if (current === null) return normalizeAngle(next)
  return normalizeAngle(current + angleDelta(current, next) * amount)
}

/**
 * Whether the map, facing `bearing`, should turn to face `heading`: not
 * for every small wobble, and not more often than every `interval` ms.
 */
export function shouldTurn(
  bearing: number,
  heading: number,
  sinceLastMs: number,
  { minDegrees, interval }: { minDegrees: number; interval: number },
): boolean {
  return (
    sinceLastMs >= interval &&
    Math.abs(angleDelta(bearing, heading)) >= minDegrees
  )
}
