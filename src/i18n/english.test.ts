import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  formatDuration,
  routeLabels,
} from '../features/directions/directions.ts'
import { parseRoutes, buildRequest } from '../features/directions/valhalla.ts'
import { categoryInfo } from '../features/place/categories.ts'
import { features } from '../features/place/details.ts'
import {
  describeOpenState,
  parseOpeningHours,
  weekLines,
  type WallClock,
} from '../features/place/openingHours.ts'
import { formatDistance } from '../features/place/place.ts'
import { matchCategory, nearbyLabel } from '../features/search/categoryQuery.ts'
import { spokenDistance } from '../features/navigation/voice.ts'
import { mapStyle } from '../map/style.ts'
import { setLocalePreference } from './index.ts'

// A Wednesday at 10:00
const wall: WallClock = {
  date: { year: 2026, month: 11, day: 4 },
  weekday: 2,
  minutes: 600,
}

describe('in English', () => {
  beforeEach(() => setLocalePreference('en'))
  afterEach(() => setLocalePreference('tr'))

  it('writes distances and durations', () => {
    expect(formatDistance(1234)).toBe('1.2 km')
    expect(formatDistance(450)).toBe('450 m')
    expect(formatDuration(75 * 60)).toBe('1 h 15 min')
    expect(formatDuration(5 * 60)).toBe('5 min')
  })

  it('says when a place opens and closes', () => {
    const week = parseOpeningHours('Mo-Fr 08:00-18:00; Sa-Su off')!
    expect(describeOpenState(week, wall)).toMatch(/^Open · Closes /)
    expect(weekLines(week)[0].days).toBe('Mon–Fri')
    expect(weekLines(week)[1]).toEqual({ days: 'Sat–Sun', hours: 'Closed' })
  })

  it('names categories, and what places offer', () => {
    expect(categoryInfo('pharmacy')?.label).toBe('Pharmacy')
    expect(features({ takeaway: 'yes' })).toEqual(['Takeaway'])
  })

  it('knows the quick categories by their English names', () => {
    expect(matchCategory('pharmacy')?.key).toBe('pharmacy')
    expect(matchCategory('gas station')?.key).toBe('fuel')
    expect(matchCategory('ATMs')?.key).toBe('atm')
    expect(matchCategory('nearest hotels')?.key).toBe('hotel')
    expect(nearbyLabel(matchCategory('atm')!)).toBe('ATMs nearby')
  })

  it('labels routes and says distances aloud', () => {
    const route = { meters: 1000, seconds: 60, shape: [], maneuvers: [] }
    expect(routeLabels([route, { ...route, meters: 500 }])).toEqual([
      'Suggested',
      'Shorter',
    ])
    expect(spokenDistance(1460)).toBe('1.5 kilometers')
    expect(spokenDistance(487)).toBe('500 meters')
  })

  it('names the map in English where the tiles do', () => {
    const style = mapStyle('light', false, 'standard', false, 'en')
    const labels = style.layers.filter(
      (l) => l.type === 'symbol' && l.id.startsWith('place-'),
    )
    expect(labels.length).toBeGreaterThan(0)
    for (const layer of labels) {
      const field = (layer.layout as Record<string, unknown>)['text-field']
      expect(JSON.stringify(field)).toContain('name:en')
    }
    expect(mapStyle('light', false, 'standard', false, 'tr')).not.toBe(style)
  })
})

describe('routes in English', () => {
  it('ask Valhalla for English, and say stops by number', () => {
    const request = buildRequest({
      points: [
        [29, 41],
        [29.01, 41],
        [29.02, 41],
      ],
      mode: 'auto',
      avoid: { tolls: false, highways: false, ferries: false },
      when: { kind: 'now' },
      language: 'en-US',
    })
    expect(request.directions_options.language).toBe('en-US')
    const leg = (instruction: string, alert: string) => ({
      shape: '',
      maneuvers: [
        {
          instruction,
          type: 1,
          length: 0.1,
          time: 10,
          verbal_transition_alert_instruction: alert,
        },
      ],
    })
    const [route] = parseRoutes(
      {
        trip: {
          summary: { length: 1, time: 60 },
          legs: [
            {
              shape: '',
              maneuvers: [
                {
                  instruction: 'Your destination is on the right.',
                  type: 5,
                  length: 0,
                  time: 0,
                },
              ],
            },
            leg('Drive east.', 'Your destination will be on the left.'),
          ],
        },
      },
      'en',
    )
    expect(route.maneuvers[0].instruction).toBe('Stop 1 is on the right.')
    expect(route.maneuvers[1].verbal?.alert).toBe(
      'Your destination will be on the left.',
    )
  })
})
