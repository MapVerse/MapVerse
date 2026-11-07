import { storedFlag } from './storedFlag.ts'

const satellite = storedFlag('mapverse:satellite')

/** Turns satellite imagery under the roads and labels on or off, and remembers it. */
export const setSatelliteEnabled = satellite.set

export function useSatelliteEnabled(): boolean {
  return satellite.use()
}
