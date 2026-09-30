import { useSyncExternalStore } from 'react'
import {
  hideZone,
  type Found,
  type HideZone,
  type Landmark,
} from './landmarks.ts'

// Where each landmark was found in the tiles; this lasts the visit
let placed: Readonly<Record<string, Found>> = {}
let zones: readonly HideZone[] = []
const listeners = new Set<() => void>()

export function placeLandmark(landmark: Landmark, found: Found) {
  placed = { ...placed, [landmark.id]: found }
  zones = [...zones, hideZone(landmark, found)]
  for (const listener of listeners) listener()
}

export const isPlaced = (id: string) => id in placed

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlacedLandmarks() {
  return useSyncExternalStore(subscribe, () => placed)
}

/** Where the map's own buildings make way for the landmarks placed so far. */
export function useHideZones() {
  return useSyncExternalStore(subscribe, () => zones)
}
