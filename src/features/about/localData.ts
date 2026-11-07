/** What the app keeps in the browser goes under keys starting with this. */
export const PREFIX = 'mapverse:'

/** The app's own keys in a storage, if it can be read. */
export function localKeys(storage: Storage): string[] {
  const keys: string[] = []
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key)
    }
  } catch {
    // Storage turned off: there is nothing of ours in it
  }
  return keys
}

/**
 * Removes everything the app keeps in this browser: profile, settings,
 * favorites and recent searches. Says how many entries went.
 */
export function clearLocalData(
  storages: Storage[] = [localStorage, sessionStorage],
): number {
  let removed = 0
  for (const storage of storages) {
    for (const key of localKeys(storage)) {
      try {
        storage.removeItem(key)
        removed++
      } catch {
        // Left as it is; nothing more can be done from here
      }
    }
  }
  return removed
}
