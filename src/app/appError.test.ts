import { describe, expect, it } from 'vitest'
import { MapStartError, errorKind } from './appError.ts'

describe('errorKind', () => {
  it('tells when WebGL is missing', () => {
    const error = new Error('WebGL2 is required to display this map.')
    error.name = 'GPUInitializationError'
    expect(errorKind(new MapStartError(error))).toBe('webgl')
  })

  it('tells when the map’s script could not be loaded', () => {
    const error = new TypeError(
      'Failed to fetch dynamically imported module: /assets/maplibre-gl.js',
    )
    expect(errorKind(new MapStartError(error))).toBe('load')
    expect(errorKind(error)).toBe('load')
  })

  it('takes anything else as unexpected', () => {
    expect(errorKind(new Error('x is undefined'))).toBe('other')
    expect(errorKind('nope')).toBe('other')
  })
})
