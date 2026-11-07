import { describe, expect, it } from 'vitest'
import { prepareCourse } from './course.ts'
import { DESTINATION, ROUTE, STOP } from './fixtures.ts'
import { announcement, departure, spokenDistance, type Said } from './voice.ts'

const { maneuvers } = prepareCourse(
  ROUTE,
  [{ number: 1, lngLat: STOP }],
  DESTINATION,
)

/** What is said driving up to the turn, a fix every `step` metres. */
function sayings(
  from: number,
  step: number,
  mode: 'auto' | 'pedestrian' = 'auto',
) {
  const out: string[] = []
  let said: Said | null = null
  for (let d = from; d >= 0; d -= step) {
    const next = announcement(maneuvers, 1, d, mode, said)
    if (next) {
      out.push(next.text)
      said = next.said
    }
  }
  return out
}

describe('spokenDistance', () => {
  it('rounds as one would say it', () => {
    expect(spokenDistance(487)).toBe('500 metre')
    expect(spokenDistance(96)).toBe('100 metre')
    expect(spokenDistance(43)).toBe('40 metre')
    expect(spokenDistance(1460)).toBe('1,5 kilometre')
    expect(spokenDistance(2000)).toBe('2 kilometre')
  })
})

describe('announcement', () => {
  it('says a turn well before, a little before and at it, by car', () => {
    expect(sayings(600, 7)).toEqual([
      '500 metre sonra, İkinci Sokak caddesine doğru sola dönün.',
      '100 metre sonra, İkinci Sokak caddesine doğru sola dönün.',
      'İkinci Sokak caddesine doğru sola dönün.',
    ])
  })

  it('says it nearer on foot', () => {
    expect(sayings(300, 3, 'pedestrian')).toEqual([
      '150 metre sonra, İkinci Sokak caddesine doğru sola dönün.',
      '40 metre sonra, İkinci Sokak caddesine doğru sola dönün.',
      'İkinci Sokak caddesine doğru sola dönün.',
    ])
  })

  it('says only the nearest stage for a turn close after the last', () => {
    expect(announcement(maneuvers, 1, 70, 'auto', null)?.text).toBe(
      '70 metre sonra, İkinci Sokak caddesine doğru sola dönün.',
    )
  })

  it('says each stage once', () => {
    const first = announcement(maneuvers, 1, 480, 'auto', null)!
    expect(announcement(maneuvers, 1, 470, 'auto', first.said)).toBeNull()
  })

  it('leaves the arrival itself to be said apart', () => {
    expect(announcement(maneuvers, 4, 300, 'auto', null)?.text).toBe(
      '300 metre sonra, Varış noktanıza ulaştınız.',
    )
    expect(announcement(maneuvers, 4, 10, 'auto', null)).toBeNull()
    expect(announcement(maneuvers, 2, 90, 'auto', null)?.text).toBe(
      '90 metre sonra, 1. durak sağınızda kalacak.',
    )
  })

  it('starts with the way off, as Valhalla says it', () => {
    expect(departure(maneuvers)).toBe(
      'Birinci Sokak caddesinde doğuya ilerleyin.',
    )
  })
})
