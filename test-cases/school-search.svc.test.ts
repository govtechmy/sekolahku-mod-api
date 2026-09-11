import { describe, expect, test } from 'bun:test'

import { isExactSchoolMatch, rankFuzzySchools } from '../src/services/school-search.svc'
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
  test.each([
    ['bufot', 'XBA6036'],
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
    expect(rankFuzzySchools('bufot', candidates).map(result => result.school.kodSekolah)).not.toContain('WBA0001')
  })
})

describe('isExactSchoolMatch', () => {
  test('matches full school name and school code only', () => {
    expect(isExactSchoolMatch('xba6036', candidates[0]!)).toBeTrue()
    expect(isExactSchoolMatch('sekolah kebangsaan pekan beaufort', candidates[0]!)).toBeTrue()
    expect(isExactSchoolMatch('beaufort', candidates[0]!)).toBeFalse()
  })
})
