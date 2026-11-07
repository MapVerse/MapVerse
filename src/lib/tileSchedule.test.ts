import { describe, expect, it } from 'vitest'
import {
  BASE_RETRY_MS,
  MAX_RETRY_MS,
  retryDelay,
  TileSchedule,
} from './tileSchedule.ts'
import { tileBounds, tilesCovering, type Tile } from './tiles.ts'

type Thing = { id: string; lngLat: [number, number] }

// A tile's middle, as a longitude and latitude
function middle(tile: Tile): [number, number] {
  const [w, s, e, n] = tileBounds(tile)
  return [(w + e) / 2, (s + n) / 2]
}

const view = tilesCovering([32.69, 39.955, 32.72, 39.965])

describe('retryDelay', () => {
  it('doubles with each failure, up to a cap', () => {
    expect(retryDelay(1)).toBe(BASE_RETRY_MS)
    expect(retryDelay(2)).toBe(BASE_RETRY_MS * 2)
    expect(retryDelay(3)).toBe(BASE_RETRY_MS * 4)
    expect(retryDelay(50)).toBe(MAX_RETRY_MS)
  })

  it('waits at least as long as the server asked', () => {
    expect(retryDelay(1, 60_000)).toBe(60_000)
    expect(retryDelay(10, 1_000)).toBe(MAX_RETRY_MS)
  })
})

describe('TileSchedule', () => {
  it('hands out the view a batch at a time, in order', () => {
    const schedule = new TileSchedule<Thing>()
    const first = schedule.due(view, 0, 4)
    expect(first).toEqual(view.slice(0, 4))
    schedule.start(first)
    // The rest are still due while the first batch is out
    expect(schedule.due(view, 0, 4)).toEqual(view.slice(4))
    schedule.succeed(first, [])
    expect(schedule.due(view, 0, 9)).toEqual(view.slice(4))
  })

  it('keeps failed tiles back, longer each time', () => {
    const schedule = new TileSchedule<Thing>()
    const tiles = view.slice(0, 2)
    schedule.start(tiles)
    schedule.fail(tiles, 1_000)
    expect(schedule.due(tiles, 1_000, 9)).toEqual([])
    expect(schedule.nextRetry(view)).toBe(1_000 + BASE_RETRY_MS)
    expect(schedule.due(tiles, 1_000 + BASE_RETRY_MS, 9)).toEqual(tiles)

    schedule.start(tiles)
    schedule.fail(tiles, 10_000)
    expect(schedule.nextRetry(tiles)).toBe(10_000 + 2 * BASE_RETRY_MS)
  })

  it("follows the server's Retry-After", () => {
    const schedule = new TileSchedule<Thing>()
    schedule.start(view)
    schedule.fail(view, 0, 120_000)
    expect(schedule.due(view, 119_999, 9)).toEqual([])
    expect(schedule.due(view, 120_000, 9)).toEqual(view)
  })

  it('lets a cancelled batch go again at once', () => {
    const schedule = new TileSchedule<Thing>()
    const tiles = view.slice(0, 3)
    schedule.start(tiles)
    schedule.cancel(tiles)
    expect(schedule.due(tiles, 0, 9)).toEqual(tiles)

    // A tile that had failed keeps its count
    schedule.start(tiles)
    schedule.fail(tiles, 0)
    schedule.start(schedule.due(tiles, BASE_RETRY_MS, 9))
    schedule.cancel(tiles)
    expect(schedule.due(tiles, BASE_RETRY_MS, 9)).toEqual(tiles)
    schedule.start(tiles)
    schedule.fail(tiles, 0)
    expect(schedule.nextRetry(tiles)).toBe(2 * BASE_RETRY_MS)
  })

  it('keeps what was found by id', () => {
    const schedule = new TileSchedule<Thing>()
    const [a, b] = view
    schedule.start([a, b])
    schedule.succeed(
      [a, b],
      [
        { id: 'n1', lngLat: middle(a) },
        { id: 'n2', lngLat: middle(b) },
      ],
    )
    schedule.succeed([a], [{ id: 'n1', lngLat: middle(a) }])
    expect([...schedule.found().keys()]).toEqual(['n1', 'n2'])
  })

  it('lets go of tiles and things far from the view, and fetches them again', () => {
    const schedule = new TileSchedule<Thing>()
    const near = view[0]
    const far = { x: near.x + 20, y: near.y }
    schedule.start([near, far])
    schedule.succeed(
      [near, far],
      [
        { id: 'near', lngLat: middle(near) },
        { id: 'far', lngLat: middle(far) },
      ],
    )
    expect(schedule.evict(middle(near), 6)).toBe(true)
    expect([...schedule.found().keys()]).toEqual(['near'])
    expect(schedule.due([near, far], 0, 9)).toEqual([far])
    expect(schedule.evict(middle(near), 6)).toBe(false)
  })

  it('leaves tiles being fetched alone', () => {
    const schedule = new TileSchedule<Thing>()
    const far = { x: view[0].x + 20, y: view[0].y }
    schedule.start([far])
    schedule.evict(middle(view[0]), 6)
    expect(schedule.due([far], 0, 9)).toEqual([])
  })
})
