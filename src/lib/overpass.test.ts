import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A fresh module each test, so no rate limit carries over
async function load() {
  vi.resetModules()
  return import('./overpass.ts')
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), init)

const element = { type: 'node', id: 1, lat: 39.9, lon: 32.8 }
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const urls = () => fetchMock.mock.calls.map(([url]) => String(url))

describe('overpass', () => {
  it('gives the elements of a good answer', async () => {
    const { overpass } = await load()
    fetchMock.mockResolvedValueOnce(json({ elements: [element] }))
    await expect(overpass('q')).resolves.toEqual([element])
  })

  it('fails on a runtime error remark rather than keep a partial answer', async () => {
    const { overpass, OverpassError } = await load()
    fetchMock.mockImplementation(async () =>
      json({
        elements: [element],
        remark: 'runtime error: Query run out of memory using about 2048 MB.',
      }),
    )
    await expect(overpass('q')).rejects.toBeInstanceOf(OverpassError)
    // A server error, so the other endpoint got a try
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falls back to the second endpoint when the first fails', async () => {
    const { overpass } = await load()
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 504 }))
      .mockResolvedValueOnce(json({ elements: [element] }))
    await expect(overpass('q')).resolves.toEqual([element])
    expect(urls()[0]).not.toBe(urls()[1])
  })

  it('on a 429 neither falls back nor asks that endpoint again until Retry-After', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { overpass } = await load()
    fetchMock.mockResolvedValueOnce(
      new Response('', { status: 429, headers: { 'Retry-After': '60' } }),
    )
    await expect(overpass('q')).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 60_000,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [limited] = urls()

    // The next request goes to the other endpoint
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
    await expect(overpass('q')).rejects.toMatchObject({ status: 429 })
    expect(urls()[1]).not.toBe(limited)

    // Both are cooling: nothing is sent
    await expect(overpass('q')).rejects.toMatchObject({ status: 429 })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(61_000)
    fetchMock.mockResolvedValueOnce(json({ elements: [] }))
    await expect(overpass('q')).resolves.toEqual([])
    expect(urls()[2]).toBe(limited)
  })

  it('gives up on a request that hangs', async () => {
    vi.useFakeTimers()
    const { overpass, TIMEOUT_MS } = await load()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          ),
        ),
    )
    const result = overpass('q')
    const caught = expect(result).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2 + 1)
    await caught
    // Each endpoint got its own try
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("passes the caller's abort through", async () => {
    const { overpass } = await load()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          ),
        ),
    )
    const controller = new AbortController()
    const result = overpass('q', controller.signal)
    await Promise.resolve()
    controller.abort(new Error('moved away'))
    await expect(result).rejects.toThrow('moved away')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends one request at a time, and drops those aborted while waiting', async () => {
    const { overpass } = await load()
    let finish!: (res: Response) => void
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    )
    const first = overpass('first')
    const controller = new AbortController()
    const second = overpass('second', controller.signal)
    const third = overpass('third')
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    controller.abort(new Error('not wanted'))
    await expect(second).rejects.toThrow('not wanted')

    fetchMock.mockResolvedValueOnce(json({ elements: [] }))
    finish(json({ elements: [element] }))
    await expect(first).resolves.toEqual([element])
    await expect(third).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const sent = fetchMock.mock.calls.map(([, init]) =>
      (init!.body as URLSearchParams).get('data'),
    )
    expect(sent).toEqual(['first', 'third'])
  })
})

describe('parseRetryAfter', () => {
  it('reads seconds or a date', async () => {
    const { parseRetryAfter } = await load()
    expect(parseRetryAfter('120')).toBe(120_000)
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:30 GMT', now)).toBe(30_000)
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter('soon')).toBeUndefined()
  })
})
