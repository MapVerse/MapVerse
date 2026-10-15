import { describe, expect, it } from 'vitest'
import {
  cuisine,
  detailsQuery,
  features,
  nearest,
  phone,
  tagAddress,
  website,
  wikipedia,
} from './details.ts'

describe('detailsQuery', () => {
  it('asks for a known element directly', () => {
    expect(
      detailsQuery({ name: 'X', lngLat: [29, 41], osm: { type: 'W', id: 42 } }),
    ).toBe('[out:json][timeout:10];way(42);out tags center;')
  })

  it('looks a map POI up by its name round where it is, quotes and all', () => {
    const query = detailsQuery({
      name: 'Kahve "Dünyası"',
      lngLat: [28.98, 41.03],
    })
    expect(query).toContain('nwr(around:60,41.030000,28.980000)')
    expect(query).toContain('["name"="Kahve \\"Dünyası\\""]')
    expect(query).toContain('["name:tr"="Kahve \\"Dünyası\\""]')
  })
})

describe('nearest', () => {
  it('picks the element nearest the place, by its centre for a building', () => {
    const near = {
      type: 'way' as const,
      id: 2,
      center: { lat: 41.0301, lon: 28.98 },
      tags: {},
    }
    const far = {
      type: 'node' as const,
      id: 1,
      lat: 41.031,
      lon: 28.98,
      tags: {},
    }
    expect(nearest([far, near], [28.98, 41.03])).toBe(near)
    expect(nearest([], [28.98, 41.03])).toBeUndefined()
  })
})

describe('reading tags', () => {
  it('puts an address together from its parts', () => {
    expect(
      tagAddress({
        'addr:street': 'İstiklal Caddesi',
        'addr:housenumber': '12',
        'addr:district': 'Beyoğlu',
        'addr:city': 'İstanbul',
      }),
    ).toBe('İstiklal Caddesi 12, Beyoğlu, İstanbul')
    expect(tagAddress({ 'addr:city': 'İstanbul' })).toBeUndefined()
  })

  it('makes a dialable link of the first phone number', () => {
    expect(phone({ phone: '+90 212 555 00 00; +90 212 555 00 01' })).toEqual({
      number: '+90 212 555 00 00',
      href: 'tel:+902125550000',
    })
  })

  it('shows a website by its host', () => {
    expect(website({ website: 'https://www.example.com.tr/' })).toEqual({
      url: 'https://www.example.com.tr/',
      label: 'example.com.tr',
    })
    expect(website({ 'contact:website': 'example.com/menu/' })?.label).toBe(
      'example.com/menu',
    )
  })

  it('links a Wikipedia article in its language', () => {
    expect(wikipedia({ wikipedia: 'tr:Galata Kulesi' })).toEqual({
      url: 'https://tr.wikipedia.org/wiki/Galata_Kulesi',
      label: 'Galata Kulesi',
    })
  })

  it('names common cuisines in Turkish, and others as written', () => {
    expect(cuisine({ cuisine: 'turkish;kebab;coffee_shop;bubble_tea' })).toBe(
      'Türk, Kebap, Kahve, Bubble tea',
    )
  })

  it('lists what a place offers', () => {
    expect(
      features({
        wheelchair: 'limited',
        internet_access: 'wlan',
        outdoor_seating: 'yes',
        takeaway: 'only',
        smoking: 'no',
      }),
    ).toEqual([
      'Kısmi engelli erişimi',
      'Wi-Fi',
      'Dış mekân',
      'Paket servis',
      'Sigara içilmez',
    ])
  })
})
