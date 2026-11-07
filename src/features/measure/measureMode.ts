import { useSyncExternalStore } from 'react'

// Whether distance measuring is on: turned on from the map's button or a
// key, read by the map, which then leaves its clicks to the measuring
let measuring = false
const listeners = new Set<() => void>()

export function setMeasuring(next: boolean) {
  if (next === measuring) return
  measuring = next
  for (const listener of listeners) listener()
}

export const isMeasuring = () => measuring

export const toggleMeasuring = () => setMeasuring(!measuring)

export function subscribeMeasuring(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useMeasuring(): boolean {
  return useSyncExternalStore(subscribeMeasuring, isMeasuring)
}
