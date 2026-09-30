/** Metres east and north of a landmark's centre. */
export type XY = [x: number, y: number]

const EARTH_RADIUS_M = 6_371_008.8
const DEG = 180 / Math.PI

/** Metres east and north of a point, as a longitude and latitude. */
export function offset(
  [lng, lat]: [number, number],
  [x, y]: XY,
): [number, number] {
  const dLat = (y / EARTH_RADIUS_M) * DEG
  const dLng = ((x / EARTH_RADIUS_M) * DEG) / Math.cos(lat / DEG)
  return [lng + dLng, lat + dLat]
}

/** A longitude and latitude, as metres east and north of a point. */
export function metres(
  [lng0, lat0]: [number, number],
  [lng, lat]: [number, number],
): XY {
  return [
    ((lng - lng0) / DEG) * EARTH_RADIUS_M * Math.cos(lat0 / DEG),
    ((lat - lat0) / DEG) * EARTH_RADIUS_M,
  ]
}
