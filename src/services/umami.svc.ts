import { env } from 'src/config/env.config'

const CACHE_TTL_MS = 5 * 60 * 1000
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
// Any date before SekolahKu started sending events to Umami.
const OVERALL_START_AT = Date.UTC(2025, 0, 1)

export interface VisitorCounts {
  daily: number
  overall: number
}

let cachedCounts: VisitorCounts | null = null
let cachedAt = 0
let inFlight: Promise<VisitorCounts> | null = null
let token: string | null = null

export function startOfTodayMyt(now = Date.now()): number {
  return Math.floor((now + MYT_OFFSET_MS) / DAY_MS) * DAY_MS - MYT_OFFSET_MS
}

function getConfig() {
  const { UMAMI_URL, UMAMI_WEBSITE_ID, UMAMI_USERNAME, UMAMI_PASSWORD } = env
  if (!UMAMI_WEBSITE_ID || !UMAMI_USERNAME || !UMAMI_PASSWORD) {
    throw new Error('Umami is not configured')
  }
  return { baseUrl: UMAMI_URL.replace(/\/+$/, ''), websiteId: UMAMI_WEBSITE_ID, username: UMAMI_USERNAME, password: UMAMI_PASSWORD }
}

async function login(config: ReturnType<typeof getConfig>): Promise<string> {
  const response = await fetch(`${config.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: config.username, password: config.password }),
  })
  if (!response.ok) {
    throw new Error(`Umami login returned unexpected status ${response.status}`)
  }
  const body = (await response.json()) as { token?: string }
  if (!body.token) {
    throw new Error('Umami login returned no token')
  }
  token = body.token
  return token
}

async function getVisitors(config: ReturnType<typeof getConfig>, startAt: number, endAt: number): Promise<number> {
  const url = `${config.baseUrl}/api/websites/${config.websiteId}/stats?startAt=${startAt}&endAt=${endAt}`
  const request = (bearer: string) => fetch(url, { headers: { Authorization: `Bearer ${bearer}` } })

  let response = await request(token ?? (await login(config)))
  if (response.status === 401) {
    response = await request(await login(config))
  }
  if (!response.ok) {
    throw new Error(`Umami stats returned unexpected status ${response.status}`)
  }
  const body = (await response.json()) as { visitors?: number | { value: number } }
  // Umami v2 wraps each stat as { value, prev }; v3 returns plain numbers.
  const visitors = typeof body.visitors === 'object' ? body.visitors?.value : body.visitors
  return visitors ?? 0
}

async function fetchVisitorCounts(): Promise<VisitorCounts> {
  const config = getConfig()
  const now = Date.now()
  const [daily, overall] = await Promise.all([getVisitors(config, startOfTodayMyt(now), now), getVisitors(config, OVERALL_START_AT, now)])
  return { daily, overall }
}

// ponytail: in-memory cache per ECS task, like moeTakwim.svc. Each task hits
// Umami twice per TTL at most; concurrent callers share one in-flight fetch.
export async function getVisitorCounts(): Promise<VisitorCounts> {
  if (cachedCounts && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedCounts
  }
  if (!inFlight) {
    inFlight = fetchVisitorCounts()
      .then(counts => {
        cachedCounts = counts
        cachedAt = Date.now()
        return counts
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

export function resetVisitorCountsCache(): void {
  cachedCounts = null
  cachedAt = 0
  inFlight = null
  token = null
}
