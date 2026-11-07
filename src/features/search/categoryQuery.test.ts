import { describe, expect, it } from 'vitest'
import { fold, matchCategory, nearbyLabel } from './categoryQuery.ts'

const key = (query: string) => matchCategory(query)?.key

describe('fold', () => {
  it('lowers the Turkish way and drops accents', () => {
    expect(fold('  İSTANBUL  Işık ')).toBe('istanbul isik')
    expect(fold('AKARYAKIT')).toBe('akaryakit')
    expect(fold('Müze')).toBe('muze')
  })
})

describe('matchCategory', () => {
  it('knows each quick category by its name', () => {
    expect(key('eczane')).toBe('pharmacy')
    expect(key('Kafe')).toBe('cafe')
    expect(key('ATM')).toBe('atm')
    expect(key('hastane')).toBe('hospital')
    expect(key('Otopark')).toBe('parking')
    expect(key('park')).toBe('park')
    expect(key('CAMİ')).toBe('mosque')
  })

  it('knows them by other words people use', () => {
    expect(key('benzinci')).toBe('fuel')
    expect(key('akaryakıt')).toBe('fuel')
    expect(key('Benzin istasyonu')).toBe('fuel')
    expect(key('bankamatik')).toBe('atm')
    expect(key('kahveci')).toBe('cafe')
    expect(key('lokanta')).toBe('restaurant')
    expect(key('bakkal')).toBe('supermarket')
    expect(key('pansiyon')).toBe('hotel')
  })

  it('reads plurals, suffixes and no accents', () => {
    expect(key('eczaneler')).toBe('pharmacy')
    expect(key('Benzinciler')).toBe('fuel')
    expect(key("ATM'ler")).toBe('atm')
    expect(key('atmler')).toBe('atm')
    expect(key('parklar')).toBe('park')
    expect(key('oteller')).toBe('hotel')
    expect(key('muzeler')).toBe('museum')
    expect(key('akaryakit')).toBe('fuel')
  })

  it('looks past words asking for one nearby', () => {
    expect(key('en yakın eczane')).toBe('pharmacy')
    expect(key('yakındaki kafeler')).toBe('cafe')
    expect(key('eczane nerede')).toBe('pharmacy')
  })

  it('guesses at a term half typed, from four letters', () => {
    expect(key('ecza')).toBe('pharmacy')
    expect(key('hast')).toBe('hospital')
    expect(key('akaryakıt ist')).toBe('fuel')
    expect(key('ecz')).toBeUndefined()
  })

  it('leaves names and addresses to the place search', () => {
    expect(key('Eczane Sokak 5')).toBeUndefined()
    expect(key('Kahve Dünyası')).toBeUndefined()
    expect(key('Paris')).toBeUndefined()
    expect(key('Kadıköy')).toBeUndefined()
    expect(key('')).toBeUndefined()
    expect(key('en yakın')).toBeUndefined()
  })

  it('reads a suggestion the way it is said', () => {
    expect(nearbyLabel(matchCategory('eczane')!)).toBe('Yakındaki eczaneler')
    expect(nearbyLabel(matchCategory('atm')!)).toBe("Yakındaki ATM'ler")
  })
})
