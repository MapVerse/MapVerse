import { describe, expect, it } from 'vitest'
import { grown } from './shapes.ts'

describe('grown', () => {
  it('moves each wall out, keeping it parallel', () => {
    const square = grown(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      1,
    )
    expect(square).toEqual([
      [-1, -1],
      [11, -1],
      [11, 11],
      [-1, 11],
    ])
  })

  it('works round a building that bends inwards, either way round', () => {
    // An L, clockwise: its inner corner moves out of the L's inside
    const l = grown(
      [
        [0, 0],
        [0, 20],
        [10, 20],
        [10, 10],
        [20, 10],
        [20, 0],
      ],
      1,
    )
    expect(l[3][0]).toBeCloseTo(11, 5)
    expect(l[3][1]).toBeCloseTo(11, 5)
  })
})
