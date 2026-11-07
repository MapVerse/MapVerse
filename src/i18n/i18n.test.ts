import { afterEach, describe, expect, it } from 'vitest'
import { en } from './en.ts'
import { formatMinutes, formatNumber } from './format.ts'
import { setLocalePreference, systemLocale, t, translate } from './index.ts'
import { tr } from './tr.ts'
import type { Message } from './types.ts'

const forms = (message: Message) =>
  typeof message === 'string' ? [message] : [message.one, message.other]

/** The {placeholders} a message's forms use, between them. */
const params = (message: Message) =>
  [...new Set(forms(message).flatMap((m) => m.match(/\{\w+\}/g) ?? []))].sort()

describe('the dictionaries', () => {
  it('have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort())
  })

  it('fill in the same values in each message', () => {
    for (const key of Object.keys(tr) as (keyof typeof tr)[]) {
      expect(params(en[key]), key).toEqual(params(tr[key]))
    }
  })

  it('leave no message empty', () => {
    for (const message of [...Object.values(tr), ...Object.values(en)]) {
      for (const form of forms(message)) expect(form.trim()).not.toBe('')
    }
  })
})

describe('translate', () => {
  afterEach(() => setLocalePreference('tr'))

  it('fills in values, and picks the plural form by count', () => {
    expect(translate('tr', 'saved.added', { count: 3 })).toBe('3 yer eklendi.')
    expect(translate('en', 'saved.added', { count: 1 })).toBe('1 place added.')
    expect(translate('en', 'saved.added', { count: 2 })).toBe('2 places added.')
  })

  it('speaks the language picked', () => {
    setLocalePreference('en')
    expect(t('common.close')).toBe('Close')
    setLocalePreference('tr')
    expect(t('common.close')).toBe('Kapat')
  })
})

describe('systemLocale', () => {
  it('is Turkish for a browser that prefers it, English for any other', () => {
    expect(systemLocale(['tr-TR', 'en-US'])).toBe('tr')
    expect(systemLocale(['tr'])).toBe('tr')
    expect(systemLocale(['en-US', 'tr-TR'])).toBe('en')
    expect(systemLocale(['de-DE'])).toBe('en')
  })
})

describe('formats', () => {
  it('write numbers the way each language does', () => {
    const one = { minimumFractionDigits: 1, maximumFractionDigits: 1 }
    expect(formatNumber(1.5, one, 'tr')).toBe('1,5')
    expect(formatNumber(1.5, one, 'en')).toBe('1.5')
  })

  it('write a time of day on a 24-hour clock in Turkish', () => {
    expect(formatMinutes(9 * 60 + 5, 'tr')).toBe('09:05')
    expect(formatMinutes(24 * 60, 'tr')).toBe('24:00')
  })
})
