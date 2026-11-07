import { describe, expect, it } from 'vitest'
import { clearLocalData, localKeys } from './localData.ts'

/** A Storage kept in memory, as the tests run without a browser. */
function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries))
  return {
    get length() {
      return map.size
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
  }
}

describe('clearLocalData', () => {
  it("removes the app's keys and leaves others alone", () => {
    const local = memoryStorage({
      'mapverse:theme': 'dark',
      'mapverse:profile': '{"name":"Ada"}',
      'other-app': 'keep',
    })
    const session = memoryStorage({ 'mapverse:x': '1' })
    expect(clearLocalData([local, session])).toBe(3)
    expect(localKeys(local)).toEqual([])
    expect(local.getItem('other-app')).toBe('keep')
    expect(session.length).toBe(0)
  })

  it('copes with storage that refuses to be read', () => {
    const broken = {
      get length(): number {
        throw new Error('SecurityError')
      },
    } as Storage
    expect(clearLocalData([broken])).toBe(0)
  })
})
