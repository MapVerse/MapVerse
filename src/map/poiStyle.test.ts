import { describe, expect, it } from 'vitest'
import { selectedPoiImage } from './poiStyle.ts'

describe('selectedPoiImage', () => {
  it('names the selected badge in the current theme', () => {
    expect(selectedPoiImage('mv-poi:light:normal:cafe', 'dark')).toBe(
      'mv-poi:dark:selected:cafe',
    )
  })

  it('leaves other images as they are', () => {
    expect(selectedPoiImage('marker', 'light')).toBe('marker')
  })
})
