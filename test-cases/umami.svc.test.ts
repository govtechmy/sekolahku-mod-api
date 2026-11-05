import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { env } from 'src/config/env.config'

import { getVisitorCounts, resetVisitorCountsCache, startOfTodayMyt } from '../src/services/umami.svc'

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }
}

type FetchCall = [string, { headers?: Record<string, string> } | undefined]

function mockUmami({ loginStatus = 200, statsStatus = [200] as number[] } = {}) {
  let statsCall = 0
  const fetchMock = mock((url: string) => {
    if (url.endsWith('/api/auth/login')) {
      return Promise.resolve(jsonResponse({ token: `token-${fetchMock.mock.calls.length}` }, loginStatus))
    }
    const status = statsStatus[Math.min(statsCall++, statsStatus.length - 1)]
    const startAt = Number(new URL(url).searchParams.get('startAt'))
    return Promise.resolve(jsonResponse({ visitors: startAt === startOfTodayMyt() ? 42 : 1234 }, status))
  })
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

const statsCalls = (fetchMock: ReturnType<typeof mockUmami>) =>
  (fetchMock.mock.calls as unknown as FetchCall[]).filter(([url]) => url.includes('/stats'))

describe('umami service', () => {
  beforeEach(() => {
    resetVisitorCountsCache()
    env.UMAMI_URL = 'https://umami.example.com'
    env.UMAMI_WEBSITE_ID = 'site-id'
    env.UMAMI_USERNAME = 'viewer'
    env.UMAMI_PASSWORD = 'secret'
  })

  test('returns today and overall visitors', async () => {
    mockUmami()

    expect(await getVisitorCounts()).toEqual({ daily: 42, overall: 1234 })
  })

  test('sends the login token as a bearer header', async () => {
    const fetchMock = mockUmami()

    await getVisitorCounts()

    const init = statsCalls(fetchMock)[0]?.[1]
    expect(init?.headers?.Authorization).toMatch(/^Bearer token-/)
  })

  test('caches the counts so a second call does not hit Umami', async () => {
    const fetchMock = mockUmami()

    await getVisitorCounts()
    await getVisitorCounts()

    expect(statsCalls(fetchMock)).toHaveLength(2)
  })

  test('shares one in-flight fetch between concurrent callers', async () => {
    const fetchMock = mockUmami()

    await Promise.all([getVisitorCounts(), getVisitorCounts(), getVisitorCounts()])

    expect(statsCalls(fetchMock)).toHaveLength(2)
  })

  test('logs in again when the token has expired', async () => {
    const fetchMock = mockUmami({ statsStatus: [401, 401, 200] })

    expect(await getVisitorCounts()).toEqual({ daily: 42, overall: 1234 })
    const logins = (fetchMock.mock.calls as unknown as FetchCall[]).filter(([url]) => url.endsWith('/api/auth/login'))
    expect(logins.length).toBeGreaterThanOrEqual(2)
  })

  test('throws when Umami is not configured', async () => {
    env.UMAMI_WEBSITE_ID = undefined

    await expect(getVisitorCounts()).rejects.toThrow('Umami is not configured')
  })

  test('throws when login fails', async () => {
    mockUmami({ loginStatus: 401 })

    await expect(getVisitorCounts()).rejects.toThrow('Umami login returned unexpected status 401')
  })

  test('startOfTodayMyt is midnight in Malaysia time', () => {
    // 2026-11-05 01:30 MYT is still 2026-11-04 17:30 UTC
    const now = Date.UTC(2026, 10, 4, 17, 30)
    expect(new Date(startOfTodayMyt(now)).toISOString()).toBe('2026-11-04T16:00:00.000Z')
  })
})
