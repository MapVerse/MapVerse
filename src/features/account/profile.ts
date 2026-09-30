import { useSyncExternalStore } from 'react'

/** Who is using the app on this device: a name, and a photo if they add one. */
export type Profile = {
  name: string
  /** A small JPEG, as a data URL */
  photo?: string
}

const STORAGE_KEY = 'mapverse:profile'
const PHOTO_PX = 160

let profile: Profile | null = load()
const listeners = new Set<() => void>()

function load(): Profile | null {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    )
    return stored &&
      typeof stored === 'object' &&
      'name' in stored &&
      typeof stored.name === 'string'
      ? (stored as Profile)
      : null
  } catch {
    return null
  }
}

/** Saves the profile, or signs out with null. */
export function setProfile(next: Profile | null) {
  profile = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the profile then lasts one visit
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, () => profile)
}

/** Up to two initials, for when there is no photo. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr'))
    .join('')
}

/** Crops a picked photo to a small square, small enough to keep locally. */
export async function squarePhoto(file: Blob): Promise<string> {
  const image = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_PX
  canvas.height = PHOTO_PX
  const scale = Math.max(PHOTO_PX / image.width, PHOTO_PX / image.height)
  const [w, h] = [image.width * scale, image.height * scale]
  canvas
    .getContext('2d')!
    .drawImage(image, (PHOTO_PX - w) / 2, (PHOTO_PX - h) / 2, w, h)
  image.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
