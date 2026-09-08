import { ratio } from 'fuzzball'
import type { PipelineStage } from 'mongoose'
import type { EntitiSekolah } from 'src/types/entities'
import { escapeStringRegex } from 'src/utils/escape-string-regex'

// Atlas Search index name (see atlas/search-indexes/sekolah_search.json).
export const SCHOOL_SEARCH_INDEX = 'sekolah_search'
// Atlas Search synonym mapping name (source collection: school_synonyms).
// Handles abbreviations like "smk" -> "sekolah menengah kebangsaan".
export const SCHOOL_SYNONYMS = 'school_synonyms'

// Text fields searched for a school name query. Kept in one place so /schools/search
// and /schools/find-nearby stay in sync.
export const SCHOOL_NAME_SEARCH_PATHS = [
  'namaSekolah',
  'namaRingkas',
  'data.infoKomunikasi.alamatSurat',
  'data.infoKomunikasi.bandarSurat',
  'data.infoPentadbiran.parlimen',
  'data.infoPentadbiran.negeri',
] as const

const FUZZY_TOKEN_MIN_SCORE = 68

export type RankedFuzzySchool = {
  school: EntitiSekolah
  score: number
  exact: boolean
}

type WeightedSearchField = {
  value: unknown
  weight: number
}

function normalizeSearchText(value: unknown): string {
  return (
    String(value ?? '')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toUpperCase()
      .replace(/&/g, ' DAN ')
      .match(/[A-Z0-9]+/g)
      ?.join(' ') ?? ''
  )
}

function normalizeCompact(value: unknown): string {
  return normalizeSearchText(value).replace(/ /g, '')
}

function getSearchFields(school: EntitiSekolah): WeightedSearchField[] {
  return [
    { value: school.kodSekolah, weight: 1 },
    { value: school.namaSekolah, weight: 1 },
    ...(school.namaRingkas ?? []).map(value => ({ value, weight: 1 })),
    { value: school.data?.infoKomunikasi?.bandarSurat, weight: 0.95 },
    { value: school.data?.infoPentadbiran?.parlimen, weight: 0.95 },
    { value: school.data?.infoKomunikasi?.alamatSurat, weight: 0.85 },
    { value: school.data?.infoPentadbiran?.negeri, weight: 0.8 },
  ]
}

function scoreToken(queryToken: string, candidateToken: string): number {
  if (queryToken === candidateToken) return 100
  if (candidateToken.startsWith(queryToken)) return 95
  if (queryToken.length <= 2) return 0

  const fuzzyScore = ratio(queryToken, candidateToken, { full_process: false })
  return fuzzyScore >= FUZZY_TOKEN_MIN_SCORE ? fuzzyScore : 0
}

export function isExactSchoolMatch(query: string, school: EntitiSekolah): boolean {
  const normalizedQuery = normalizeCompact(query)
  return (
    normalizedQuery.length > 0 &&
    (normalizedQuery === normalizeCompact(school.kodSekolah) || normalizedQuery === normalizeCompact(school.namaSekolah))
  )
}

/**
 * Ranks a bounded school candidate set without Atlas Search.
 * Every query token must match at least one searchable field, which keeps
 * multi-token queries precise while still tolerating spelling mistakes.
 */
export function rankFuzzySchools(query: string, schools: EntitiSekolah[]): RankedFuzzySchool[] {
  const queryTokens = normalizeSearchText(query).split(' ').filter(Boolean)
  if (queryTokens.length === 0) return []

  return schools
    .map(school => {
      const fields = getSearchFields(school).map(field => ({
        tokens: normalizeSearchText(field.value).split(' ').filter(Boolean),
        weight: field.weight,
      }))
      const tokenScores = queryTokens.map(queryToken =>
        Math.max(...fields.flatMap(field => field.tokens.map(candidateToken => scoreToken(queryToken, candidateToken) * field.weight)), 0),
      )

      if (tokenScores.some(score => score < FUZZY_TOKEN_MIN_SCORE)) return null

      const exact = isExactSchoolMatch(query, school)
      const averageScore = tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length
      return { school, score: exact ? 1_000 : averageScore, exact }
    })
    .filter((result): result is RankedFuzzySchool => result !== null)
    .sort((left, right) => {
      const scoreDifference = right.score - left.score
      if (scoreDifference !== 0) return scoreDifference
      return String(left.school.namaSekolah).localeCompare(String(right.school.namaSekolah))
    })
}

/**
 * Fuzzy + synonym + code clauses for a school name query, combined with OR semantics.
 *  - fuzzy (typo tolerant) across the name/address/parlimen/negeri paths
 *  - synonyms for abbreviations (e.g. "smk gombak" -> "sekolah menengah kebangsaan gombak").
 *    synonyms cannot be combined with fuzzy in the same text operator, so it is a separate clause.
 *  - kodSekolah exact/analyzed match (no fuzzy), boosted so a code match ranks first.
 */
export function buildFuzzyNameShould(name: string): Record<string, unknown>[] {
  return [
    {
      text: {
        query: name,
        path: [...SCHOOL_NAME_SEARCH_PATHS],
        fuzzy: { maxEdits: 2, prefixLength: 1 },
      },
    },
    {
      text: {
        query: name,
        path: 'namaSekolah',
        synonyms: SCHOOL_SYNONYMS,
      },
    },
    {
      text: {
        query: name,
        path: 'kodSekolah',
        score: { boost: { value: 5 } },
      },
    },
  ]
}

/**
 * Mandatory name clause for a compound query. Wraps {@link buildFuzzyNameShould} in a nested
 * compound with `minimumShouldMatch: 1` so it can be placed in a `must` array (a text query is
 * required, and cannot be satisfied by a geo/proximity clause alone).
 */
export function buildFuzzyNameMust(name: string): Record<string, unknown> {
  return {
    compound: { should: buildFuzzyNameShould(name), minimumShouldMatch: 1 },
  }
}

/** Atlas Search `geoWithin` circle filter (hard radius limit, meters). */
export function geoWithinCircleFilter(longitude: number, latitude: number, radiusMeters: number): Record<string, unknown> {
  return {
    geoWithin: {
      circle: {
        center: { type: 'Point', coordinates: [longitude, latitude] },
        radius: radiusMeters,
      },
      path: 'data.infoLokasi.location',
    },
  }
}

/** Atlas Search filter requiring the school to have a location (mirrors the legacy existence check). */
export function locationExistsFilter(): Record<string, unknown> {
  return { exists: { path: 'data.infoLokasi.location' } }
}

/**
 * Builds the leading `$search` aggregation stage for a fuzzy school name query.
 * `filters` are placed in the compound `filter` clause (e.g. geo radius, location existence).
 */
export function buildNameSearchStage(name: string, filters: Record<string, unknown>[] = []): PipelineStage {
  const compound: Record<string, unknown> = {
    must: [buildFuzzyNameMust(name)],
  }
  if (filters.length > 0) {
    compound.filter = filters
  }
  return {
    $search: { index: SCHOOL_SEARCH_INDEX, compound },
  } as unknown as PipelineStage
}

/**
 * Regex fallback for a school name query, mirroring the legacy behaviour. Used when Atlas
 * Search is unavailable so the endpoints degrade gracefully instead of failing.
 */
export function regexNameOr(name: string): Record<string, unknown> {
  const regexObj = { $regex: escapeStringRegex(name), $options: 'i' }
  return {
    $or: SCHOOL_NAME_SEARCH_PATHS.map(path => ({ [path]: regexObj })),
  }
}

// Dropdown filters shared by /schools/search and /schools/find-nearby. `'ALL'` (or empty)
// means "no filter". Kept here so the sidebar list and the map markers filter identically.
export type SchoolAttributeFilters = {
  negeri?: string
  peringkat?: string
  jenis?: string[]
}

/**
 * Atlas Search `equals` filters for the negeri / peringkat / jenis dropdowns. These paths are
 * indexed as `token` in sekolah_search.json so `equals` matches exactly. Placed in a compound
 * `filter` clause (no scoring impact — they only narrow the result set).
 */
export function buildAttributeFilters({ negeri, peringkat, jenis }: SchoolAttributeFilters): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = []

  if (negeri && negeri !== 'ALL') {
    filters.push({
      equals: { path: 'data.infoPentadbiran.negeri', value: negeri },
    })
  }

  if (jenis && jenis.length > 0 && !jenis.includes('ALL')) {
    filters.push({
      compound: {
        should: jenis.map(j => ({
          equals: { path: 'data.infoSekolah.jenisLabel', value: j },
        })),
        minimumShouldMatch: 1,
      },
    })
  }

  if (peringkat && peringkat !== 'ALL') {
    filters.push({
      equals: { path: 'data.infoPentadbiran.peringkat', value: peringkat },
    })
  }

  return filters
}

/**
 * Equivalent Mongo `$match` conditions for the negeri / peringkat / jenis dropdowns, used on the
 * regex fallback / non-Atlas path. Returned as an array so callers can combine them with other
 * conditions under `$and` (multiple `$or` clauses cannot share one object).
 */
export function buildAttributeMatch({ negeri, peringkat, jenis }: SchoolAttributeFilters): Record<string, unknown>[] {
  const conditions: Record<string, unknown>[] = []

  if (negeri && negeri !== 'ALL') {
    conditions.push({ 'data.infoPentadbiran.negeri': negeri })
  }

  if (jenis && jenis.length > 0 && !jenis.includes('ALL')) {
    conditions.push({
      $or: jenis.map(j => ({ 'data.infoSekolah.jenisLabel': j })),
    })
  }

  if (peringkat && peringkat !== 'ALL') {
    conditions.push({ 'data.infoPentadbiran.peringkat': peringkat })
  }

  return conditions
}
