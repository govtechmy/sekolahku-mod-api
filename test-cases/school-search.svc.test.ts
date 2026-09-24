import { describe, expect, test } from 'bun:test'

import { rankFuzzySchools } from '../src/services/school-search.svc'
import type { EntitiSekolah } from '../src/types/entities'

function school(
  kodSekolah: string,
  namaSekolah: string,
  options: {
    namaRingkas?: string[]
    bandarSurat?: string
    parlimen?: string
    negeri?: string
  } = {},
): EntitiSekolah {
  return {
    kodSekolah,
    namaSekolah,
    namaRingkas: options.namaRingkas,
    data: {
      infoSekolah: {},
      infoKomunikasi: {
        alamatSurat: options.bandarSurat,
        bandarSurat: options.bandarSurat,
      },
      infoPentadbiran: {
        parlimen: options.parlimen,
        negeri: options.negeri,
      },
      infoLokasi: {},
    },
  }
}

const candidates = [
  school('XBA6036', 'SEKOLAH KEBANGSAAN PEKAN BEAUFORT', {
    namaRingkas: ['SK PEKAN BEAUFORT', 'SKPB'],
    bandarSurat: 'BEAUFORT',
    parlimen: 'BEAUFORT',
    negeri: 'SABAH',
  }),
  school('XEA6001', 'SEKOLAH MENENGAH KEBANGSAAN BEAUFORT', {
    namaRingkas: ['SMK BEAUFORT', 'SMKB'],
    bandarSurat: 'BEAUFORT',
    parlimen: 'BEAUFORT',
    negeri: 'SABAH',
  }),
  school('WBA0001', 'SEKOLAH KEBANGSAAN PUTRAJAYA', {
    namaRingkas: ['SK PUTRAJAYA'],
    bandarSurat: 'PUTRAJAYA',
    negeri: 'WILAYAH_PERSEKUTUAN_PUTRAJAYA',
  }),
  school('BBA0001', 'SEKOLAH KEBANGSAAN GOMBAK', {
    namaRingkas: ['SK GOMBAK'],
    bandarSurat: 'GOMBAK',
    negeri: 'SELANGOR',
  }),
  school('BBA0002', 'SEKOLAH KEBANGSAAN SUNGAI BULOH', {
    namaRingkas: ['SK SUNGAI BULOH'],
    bandarSurat: 'SUNGAI BULOH',
    negeri: 'SELANGOR',
  }),
]

describe('rankFuzzySchools', () => {
  // v2 char n-gram similarity is stricter than the old fuzzball ratio: "bufot"
  // no longer reaches "BEAUFORT" (same result as fuzzy_api_v2.py).
  test.each([
    ['putrajya', 'WBA0001'],
    ['gombk', 'BBA0001'],
    ['sngai buloh', 'BBA0002'],
  ])('matches typo %s', (query, expectedCode) => {
    expect(rankFuzzySchools(query, candidates)[0]?.school.kodSekolah).toBe(expectedCode)
  })

  test('requires every token in a multi-token query', () => {
    expect(rankFuzzySchools('sk beaufort', candidates).map(result => result.school.kodSekolah)).toEqual(['XBA6036'])
  })

  test('rejects unrelated candidates', () => {
    expect(rankFuzzySchools('gombk', candidates).map(result => result.school.kodSekolah)).toEqual(['BBA0001'])
  })
})

describe('rankFuzzySchools v2 (BM25 + char n-gram TF-IDF)', () => {
  const codes = (query: string) => rankFuzzySchools(query, candidates).map(result => result.school.kodSekolah)

  test.each([
    ['skpb', 'XBA6036'],
    ['smkb', 'XEA6001'],
    ['XBA6036', 'XBA6036'],
  ])('matches acronym/code %s exactly', (query, expectedCode) => {
    expect(codes(query)).toEqual([expectedCode])
  })

  test('exact AND wins over fuzzy: only schools containing every token are returned', () => {
    expect(codes('beaufort').sort()).toEqual(['XBA6036', 'XEA6001'])
    expect(codes('smk beaufort')).toEqual(['XEA6001'])
  })

  test('is case, accent and punctuation insensitive', () => {
    expect(codes('Sungai-Buloh')).toEqual(codes('sungai buloh'))
    expect(codes('gómbak')).toEqual(['BBA0001'])
  })

  test('a cached index returns the current request objects, not the cached ones', () => {
    const fresh = candidates.map(candidate => ({ ...candidate, distance: 42 }))
    rankFuzzySchools('gombak', candidates)
    const [result] = rankFuzzySchools('gombak', fresh)
    expect(result?.school).toBe(fresh[3]!)
  })

  test('only returns schools from the given (filtered) candidate set', () => {
    codes('gombak') // warm the cache with the full set
    expect(rankFuzzySchools('beaufort', [candidates[0]!]).map(result => result.school.kodSekolah)).toEqual(['XBA6036'])
    expect(rankFuzzySchools('gombak', [candidates[0]!])).toEqual([])
  })

  test('returns nothing for an empty or unmatched query', () => {
    expect(codes('   ')).toEqual([])
    expect(codes('zzzzqqq')).toEqual([])
  })
})
