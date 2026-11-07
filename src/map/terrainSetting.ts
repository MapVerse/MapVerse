import { storedFlag } from './storedFlag.ts'

const terrain = storedFlag('mapverse:terrain')

/** Turns 3D terrain (mountains and relief) on or off, and remembers it. */
export const setTerrainEnabled = terrain.set

export function useTerrainEnabled(): boolean {
  return terrain.use()
}
