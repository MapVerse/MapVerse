import { describe, expect, it } from 'vitest'
import { baseUrl, urlList } from './endpoints.ts'

describe('baseUrl', () => {
  it('falls back when the variable is missing or blank', () => {
    expect(baseUrl(undefined, 'https://a.example')).toBe('https://a.example')
    expect(baseUrl('  ', 'https://a.example')).toBe('https://a.example')
  })

  it('drops trailing slashes, so paths can be added', () => {
    expect(baseUrl('https://b.example/photon/', 'x')).toBe(
      'https://b.example/photon',
    )
  })
})

describe('urlList', () => {
  it('splits on commas and skips empty entries', () => {
    expect(urlList(' https://a.example , ,https://b.example', [])).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('falls back when no URL is given', () => {
    expect(urlList(undefined, ['https://c.example'])).toEqual([
      'https://c.example',
    ])
    expect(urlList(' , ', ['https://c.example'])).toEqual(['https://c.example'])
  })
})
