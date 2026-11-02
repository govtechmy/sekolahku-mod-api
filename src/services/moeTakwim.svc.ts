import { env } from 'src/config/env.config'

const MOE_TAKWIM_API_URL = env.MOE_TAKWIM_API_URL
const CACHE_TTL_MS = 60 * 60 * 1000

export interface MoeTakwimResource {
  url: string
  alt?: string
  date?: string
}

interface MoeTakwimApiResponse {
  data: MoeTakwimResource
}

let cachedResource: MoeTakwimResource | null = null
let cachedAt = 0

// MOE sends "YYYY-MM-DD HH:mm:ss" with no offset; it is Malaysia time.
function toIsoMyt(date?: string): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) return undefined
  return `${date.replace(' ', 'T')}+08:00`
}

// ponytail: one in-memory cache slot, not shared across instances and reset on
// restart - fine for a single slow-changing public PDF link. Move to
// SystemConfigModel (like moeNews' sync tracking) if that ever matters.
export async function getMoeTakwimResource(): Promise<MoeTakwimResource | null> {
  if (cachedResource && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResource
  }

  const response = await fetch(MOE_TAKWIM_API_URL)
  if (!response.ok) {
    throw new Error(`MOE takwim API returned unexpected status ${response.status}`)
  }
  const body = (await response.json()) as MoeTakwimApiResponse
  cachedResource = body.data?.url ? { url: body.data.url, alt: body.data.alt, date: toIsoMyt(body.data.date) } : null
  cachedAt = Date.now()

  return cachedResource
}

export function resetMoeTakwimCache(): void {
  cachedResource = null
  cachedAt = 0
}
