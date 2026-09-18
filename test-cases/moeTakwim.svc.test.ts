import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { getMoeTakwimResource, resetMoeTakwimCache } from '../src/services/moeTakwim.svc'

function mockTakwimApiResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) }
}

describe('moeTakwim service', () => {
  beforeEach(() => {
    resetMoeTakwimCache()
  })

  test('returns the MOE PDF resource on a successful fetch', async () => {
    global.fetch = mock(() =>
      Promise.resolve(mockTakwimApiResponse({ data: { url: 'https://moe.gov.my/kalendar.pdf', alt: 'Takwim' } })),
    ) as unknown as typeof fetch

    expect(await getMoeTakwimResource()).toEqual({ url: 'https://moe.gov.my/kalendar.pdf', alt: 'Takwim' })
  })

  test('caches the resource so a second call does not refetch', async () => {
    const fetchMock = mock(() =>
      Promise.resolve(mockTakwimApiResponse({ data: { url: 'https://moe.gov.my/kalendar.pdf', alt: 'Takwim' } })),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await getMoeTakwimResource()
    await getMoeTakwimResource()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('throws when the MOE API responds with an error status', async () => {
    global.fetch = mock(() => Promise.resolve(mockTakwimApiResponse(null, false))) as unknown as typeof fetch

    await expect(getMoeTakwimResource()).rejects.toThrow('MOE takwim API returned unexpected status 500')
  })
})
