import { describe, expect, it } from 'vitest'
import { fluted, grown, windowRow } from './shapes.ts'

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

describe('windowRow', () => {
  it('sets its windows out of the wall, to its right, in each storey', () => {
    const windows = windowRow([0, 0], [10, 0], 2, 1, [
      [1, 2],
      [3, 4],
    ])
    expect(windows).toHaveLength(4)
    for (const part of windows) {
      const footprint = part.kind === 'block' ? part.footprint : []
      // Walking east, the outside is to the south
      expect(Math.min(...footprint.map(([, y]) => y))).toBeLessThan(0)
      const xs = footprint.map(([x]) => x)
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 5)
    }
  })
})

describe('fluted', () => {
  it('narrows layer by layer, each ribbed all round', () => {
    const outline: [number, number][] = [
      [4, 0],
      [0.4, 6],
    ]
    const layers = fluted([0, 0], outline, 16, 'turquoise')
    expect(layers.length).toBeGreaterThan(5)
    const widths = layers.map((part) => {
      const footprint = part.kind === 'block' ? part.footprint : []
      expect(footprint).toHaveLength(32)
      return Math.max(...footprint.map(([x]) => x))
    })
    expect(widths).toEqual([...widths].sort((a, b) => b - a))
  })
})
