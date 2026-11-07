import { describe, expect, it } from 'vitest'
import {
  MAX_STACK,
  buildReport,
  createLimiter,
  pageUrl,
  type ErrorReport,
} from './errorReport.ts'

const page = {
  href: 'https://mapverse.github.io/MapVerse/?q=ev#15/41.03/28.97',
  userAgent: 'TestBrowser/1.0',
}
const build = { version: '1.2.3', commit: 'abc1234' }

describe('pageUrl', () => {
  it('leaves out the query and the hash', () => {
    expect(pageUrl(page.href)).toBe('https://mapverse.github.io/MapVerse/')
  })

  it('copes with something that is not a URL', () => {
    expect(pageUrl('not a url?x#y')).toBe('not a url')
  })
})

describe('buildReport', () => {
  it('describes an error with its stack, the page and the build', () => {
    const error = new TypeError('x is undefined')
    const report = buildReport(error, page, build)
    expect(report).toMatchObject({
      message: 'TypeError: x is undefined',
      url: 'https://mapverse.github.io/MapVerse/',
      userAgent: 'TestBrowser/1.0',
      version: '1.2.3',
      commit: 'abc1234',
    })
    expect(report.stack).toContain('x is undefined')
  })

  it('cuts a long stack short', () => {
    const error = new Error('deep')
    error.stack = 'at f\n'.repeat(5000)
    const report = buildReport(error, page, build)
    expect(report.stack!.length).toBe(MAX_STACK)
    expect(report.stack!.endsWith('…')).toBe(true)
  })

  it('takes whatever was thrown, not only errors', () => {
    expect(buildReport('oops', page, build).message).toBe('oops')
    expect(buildReport({ code: 7 }, page, build).message).toBe('{"code":7}')
    expect(buildReport(undefined, page, build).message).toBe('undefined')
    expect(buildReport('oops', page, build)).not.toHaveProperty('stack')
  })
})

describe('createLimiter', () => {
  const report = (message: string): ErrorReport => ({
    message,
    url: '',
    userAgent: '',
    version: '',
    commit: '',
  })

  it('lets each message through once', () => {
    const allow = createLimiter(5)
    expect(allow(report('a'))).toBe(true)
    expect(allow(report('a'))).toBe(false)
    expect(allow(report('b'))).toBe(true)
  })

  it('stops after so many reports', () => {
    const allow = createLimiter(2)
    expect(allow(report('a'))).toBe(true)
    expect(allow(report('b'))).toBe(true)
    expect(allow(report('c'))).toBe(false)
  })
})
