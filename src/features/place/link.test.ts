import { describe, expect, it } from 'vitest'
import { parseLaunch, withoutLaunch } from './launch.ts'
import { decodePlace, encodePlace, placeQuery } from './link.ts'
import type { Place } from './place.ts'

const ayasofya: Place = {
  key: 'W123',
  name: 'Ayasofya-i Kebir Camii',
  category: 'Cami',
  categoryKey: 'mosque',
  lngLat: [28.980181, 41.008587],
  osm: { type: 'W', id: 123 },
}

describe('encodePlace', () => {
  it('puts where it is first, then its element, category and name', () => {
    expect(encodePlace(ayasofya)).toBe(
      '41.00859,28.98018,w123,mosque,Ayasofya-i Kebir Camii',
    )
  })

  it('takes an element found for a place picked on the map', () => {
    const poi = { ...ayasofya, key: 'poi:1,2', osm: undefined }
    expect(encodePlace(poi, { type: 'node', id: 9 })).toMatch(/,n9,mosque,/)
    expect(encodePlace(poi)).toBe(
      '41.00859,28.98018,,mosque,Ayasofya-i Kebir Camii',
    )
  })

  it('leaves out a category it does not know', () => {
    expect(encodePlace({ ...ayasofya, categoryKey: 'whatever' })).toBe(
      '41.00859,28.98018,w123,,Ayasofya-i Kebir Camii',
    )
  })

  it('sends a bare point as only where it is', () => {
    const point = {
      key: 'point:29,41',
      name: 'Seçilen nokta',
      lngLat: [29, 41],
    }
    expect(encodePlace(point as Place)).toBe('41.00000,29.00000')
  })

  it('keeps the query readable, and the name safe in it', () => {
    const query = placeQuery({ ...ayasofya, name: 'A & B, C/D' })
    expect(query).toBe('place=41.00859,28.98018,w123,mosque,A%20%26%20B,%20C/D')
    expect(new URLSearchParams(query).get('place')).toBe(
      '41.00859,28.98018,w123,mosque,A & B, C/D',
    )
  })
})

describe('decodePlace', () => {
  it('reads back a place sent', () => {
    const shared = decodePlace(encodePlace(ayasofya))
    expect(shared).toEqual({
      place: {
        key: 'W123',
        name: 'Ayasofya-i Kebir Camii',
        category: 'Cami',
        categoryKey: 'mosque',
        lngLat: [28.98018, 41.00859],
        osm: { type: 'W', id: 123 },
      },
      point: false,
    })
  })

  it('keeps commas in a name', () => {
    expect(decodePlace('41,29,,,Kafe, Bar')?.place.name).toBe('Kafe, Bar')
  })

  it('reads a bare point as one', () => {
    expect(decodePlace('41.5,29.25')).toEqual({
      place: {
        key: 'point:29.25,41.5',
        name: 'Seçilen nokta',
        lngLat: [29.25, 41.5],
      },
      point: true,
    })
  })

  it('names a place with only its element after its category', () => {
    expect(decodePlace('41,29,n5,pharmacy')?.place).toMatchObject({
      key: 'N5',
      name: 'Eczane',
    })
  })

  it('turns down what is no place', () => {
    for (const value of [
      null,
      '',
      'abc',
      '41',
      '91,29',
      '41,181',
      '41,29e3',
      'NaN,1',
    ]) {
      expect(decodePlace(value)).toBeNull()
    }
  })

  it('ignores an element reference that is none', () => {
    const shared = decodePlace('41,29,x5,,Yer')
    expect(shared?.place.osm).toBeUndefined()
    expect(shared?.point).toBe(false)
  })
})

describe('launch', () => {
  it('reads a place, a category and the saved places', () => {
    const launch = parseLaunch(
      '?place=41,29,n5,,Yer&category=pharmacy&saved=1',
      '#17/41/29',
    )
    expect(launch.place?.place.key).toBe('N5')
    expect(launch.category?.key).toBe('pharmacy')
    expect(launch.saved).toBe(true)
    expect(launch.hasView).toBe(true)
  })

  it('ignores what it does not know', () => {
    expect(parseLaunch('?category=volcano&saved=0&dir=1', '')).toEqual({
      hasView: false,
    })
  })

  it('takes only its own parameters out of the address', () => {
    expect(
      withoutLaunch('https://x.org/app/?place=41,29&dir=a&saved=1#17/41/29'),
    ).toBe('https://x.org/app/?dir=a#17/41/29')
    expect(withoutLaunch('https://x.org/app/?category=atm')).toBe(
      'https://x.org/app/',
    )
    const plain = 'https://x.org/app/?dir=a%2Cb#3/1/2'
    expect(withoutLaunch(plain)).toBe(plain)
  })
})
