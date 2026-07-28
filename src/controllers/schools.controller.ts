import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PipelineStage } from 'mongoose'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import type { GetFilterSchoolTypeQuery, ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import { buildAttributeFilters, buildAttributeMatch, buildFuzzyNameMust, geoWithinCircleFilter, SCHOOL_SEARCH_INDEX } from 'src/services/school-search.svc'
import type { EntitiSekolah } from 'src/types/entities'
import { PERINGKAT } from 'src/types/enum'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'
import { ratio, WRatio } from 'fuzzball'

import type { CreateSchoolBody } from '@/schemas'

export async function listSchools(req: FastifyRequest, reply: FastifyReply) {
  const schools = await EntitiSekolahModel.find().sort({ namaSekolah: 1 }).lean()
  return reply.send(createSuccessResponse(schools))
}

export async function createSchool(req: FastifyRequest<{ Body: CreateSchoolBody }>, reply: FastifyReply) {
  const payload = req.body
  const created = await EntitiSekolahModel.create(payload)
  return reply.code(201).send(createSuccessResponse(created, 201))
}

export async function getSchoolById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = req.params
  const doc = await EntitiSekolahModel.findOne({ kodSekolah: id }).lean()
  if (!doc) {
    req.log.warn({ id }, 'schools:get:not-found')
    return reply.code(404).send(createErrorResponse('School not found', 'ERR_404', 404))
  }
  return reply.send(createSuccessResponse(doc))
}

// Atlas Search index/synonyms constants and query builders live in school-search.svc.ts so
// /schools/search and /schools/find-nearby share a single fuzzy-search implementation.
// Default geo radius (meters) when latitude/longitude are provided without radiusInMeter.
// Client requirement: show schools within 8km of the user's location by default.
const DEFAULT_GEO_RADIUS_METERS = 8_000
// Proximity decay pivot (meters): distance at which the `near` proximity score halves.
const GEO_PROXIMITY_PIVOT_METERS = 2_000

type SchoolSearchParams = {
  namaSekolah?: string
  negeri?: string
  jenis?: string[]
  peringkat?: string
  latitude?: number
  longitude?: number
  radiusInMeter?: number
  skip: number
  limit: number
}

type SchoolSearchResult = { items: EntitiSekolah[]; total: number }

function normalizeWords(value: string): string {
  const decomposed = value.normalize('NFKD')
  const stripped = decomposed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
  const removedDiacritics = stripped.replace(/\p{M}/gu, '')
  const upperCased = removedDiacritics.toUpperCase().replace(/&/g, ' DAN ')
  return (upperCased.match(/[A-Z0-9]+/g) ?? []).join(' ')
}

function normalizeCompact(value: string): string {
  return normalizeWords(value).replace(/ /g, '')
}

function hybridFuzzyScore(query: string, value: string): number {
  const normalizedQuery = normalizeWords(query)
  const normalizedValue = normalizeWords(value)
  if (!normalizedValue) {
    return 0
  }

  if (normalizeCompact(query) === normalizeCompact(value)) {
    return 100
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean)
  const valueTokens = normalizedValue.split(' ').filter(Boolean)

  if (queryTokens.length > 0 && queryTokens.every(token => valueTokens.includes(token))) {
    return 100
  }

  if (
    queryTokens.length > 0 &&
    queryTokens.every(token => valueTokens.some(valueToken => valueToken.startsWith(token)))
  ) {
    return 95
  }

  const tokenScore =
    queryTokens.length > 0
      ? queryTokens.reduce((sum, token) => {
          const best = Math.max(
            ...valueTokens.map(valueToken => ratio(token, valueToken, { full_process: false })),
            0,
          )
          return sum + best
        }, 0) / queryTokens.length
      : 0

  const compactScore = ratio(normalizeCompact(query), normalizeCompact(value), { full_process: false })
  const wRatioScore = WRatio(normalizedQuery, normalizedValue, { full_process: false })
  const tokenCoverage = Math.min(1, queryTokens.length / Math.max(1, valueTokens.length))

  return Math.max(tokenScore, compactScore, wRatioScore) * (0.75 + 0.2 * tokenCoverage)
}

function scoreSchoolMatch(query: string, school: EntitiSekolah): number {
  const fields = [
    { field: 'KODSEKOLAH', value: school.kodSekolah },
    { field: 'NAMA_SEKOLAH', value: school.namaSekolah },
    { field: 'ALAMAT_SURAT', value: school.data?.infoKomunikasi?.alamatSurat },
    { field: 'BANDAR_SURAT', value: school.data?.infoKomunikasi?.bandarSurat },
    { field: 'PARLIMEN', value: school.data?.infoPentadbiran?.parlimen },
    { field: 'NEGERI', value: school.data?.infoPentadbiran?.negeri },
  ]

  let best = 0
  for (const item of fields) {
    if (!item.value) continue
    const score = hybridFuzzyScore(query, String(item.value))
    if (item.field === 'KODSEKOLAH' && normalizeCompact(query) === normalizeCompact(String(item.value))) {
      best = Math.max(best, 100)
    } else {
      best = Math.max(best, score)
    }
  }

  return best
}

/**
 * Legacy regex-based search. Used when there are no search criteria (plain list)
 * and as a graceful fallback when Atlas Search is unavailable.
 */
async function regexSearchSchools(params: SchoolSearchParams): Promise<SchoolSearchResult> {
  const { namaSekolah, negeri, jenis, peringkat, latitude, longitude, radiusInMeter, skip, limit } = params
  const conditions: Record<string, unknown>[] = []

  if (namaSekolah) {
    const regexObj = { $regex: escapeStringRegex(namaSekolah), $options: 'i' }
    conditions.push({
      $or: [
        { namaSekolah: regexObj },
        { kodSekolah: regexObj },
        { 'data.infoKomunikasi.alamatSurat': regexObj },
        { 'data.infoKomunikasi.bandarSurat': regexObj },
        { 'data.infoPentadbiran.parlimen': regexObj },
        { 'data.infoPentadbiran.negeri': regexObj },
      ],
    })
  }

  conditions.push(...buildAttributeMatch({ negeri, peringkat, jenis }))

  const query: Record<string, unknown> = conditions.length > 0 ? { $and: conditions } : {}

  if (latitude !== undefined && longitude !== undefined) {
    const effectiveRadius = radiusInMeter ?? DEFAULT_GEO_RADIUS_METERS
    const geoNearStage = {
      $geoNear: {
        near: { type: 'Point' as const, coordinates: [longitude, latitude] as [number, number] },
        distanceField: 'distance',
        maxDistance: effectiveRadius,
        spherical: true,
        key: 'data.infoLokasi.location',
        query,
      },
    }

    const countResult = await EntitiSekolahModel.aggregate([geoNearStage, { $count: 'total' }] as unknown as PipelineStage[])
    const total = (countResult[0] as { total?: number } | undefined)?.total ?? 0

    const geoSort = namaSekolah
      ? { $sort: { distance: 1, namaSekolah: 1 } }
      : { $sort: { namaSekolah: 1 } }

    let items = await EntitiSekolahModel.aggregate<EntitiSekolah>([
      geoNearStage,
      geoSort,
      { $skip: skip },
      { $limit: limit },
    ] as unknown as PipelineStage[])

    if (namaSekolah) {
      items = items
        .map(item => ({ item, score: scoreSchoolMatch(namaSekolah, item), distance: (item as any).distance }))
        .sort((left, right) => {
          const scoreDiff = right.score - left.score
          if (scoreDiff !== 0) {
            return scoreDiff
          }
          const aDist = left.distance ?? 0
          const bDist = right.distance ?? 0
          if (aDist !== bDist) {
            return aDist - bDist
          }
          return String(left.item.namaSekolah).localeCompare(String(right.item.namaSekolah))
        })
        .map(({ item }) => item)
    }

    return { items, total }
  }

  // No geo: preserve existing behaviour of only returning schools with valid coordinates
  Object.assign(query, {
    'data.infoLokasi.location': { $exists: true },
    'data.infoLokasi.location.coordinates.0': { $exists: true, $ne: null },
    'data.infoLokasi.location.coordinates.1': { $exists: true, $ne: null },
  })

  const total = await EntitiSekolahModel.countDocuments(query)
  let items = (await EntitiSekolahModel.find(query).sort({ namaSekolah: 1 }).skip(skip).limit(limit).lean()) as unknown as EntitiSekolah[]

  if (namaSekolah) {
    items = items
      .map(item => ({ item, score: scoreSchoolMatch(namaSekolah, item) }))
      .sort((left, right) => {
        const scoreDiff = right.score - left.score
        if (scoreDiff !== 0) {
          return scoreDiff
        }
        return String(left.item.namaSekolah).localeCompare(String(right.item.namaSekolah))
      })
      .map(({ item }) => item)
  }

  return { items, total }
}

// School search suggestion — fuzzy search via MongoDB Atlas Search with regex fallback.
export async function getSchoolsSearchSuggestion(req: FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>, reply: FastifyReply) {
  const { page = 1, pageSize = 25, namaSekolah, negeri, jenis, peringkat, latitude, longitude, radiusInMeter } = req.query
  const numericPage = Number(page) || 1
  const numericLimit = Number(pageSize)
  const skip = (numericPage - 1) * numericLimit

  const params: SchoolSearchParams = {
    namaSekolah,
    negeri,
    jenis,
    peringkat,
    latitude,
    longitude,
    radiusInMeter,
    skip,
    limit: numericLimit,
  }

  // Build Atlas Search compound query
  const must: Record<string, unknown>[] = []
  const should: Record<string, unknown>[] = []
  const filter: Record<string, unknown>[] = []

  const hasGeo = latitude !== undefined && longitude !== undefined

  // Req 1, 2, 8, 9 — text match. Fuzzy (typo) OR synonyms (abbreviations) OR code, combined
  // with OR semantics in a nested compound and placed in `must` so a text query is mandatory.
  // (If these were in `should`, the proximity `near` clause could satisfy minimumShouldMatch
  // on its own and return non-matching schools.)
  if (namaSekolah) {
    // Fuzzy (typo) OR synonyms (abbreviations) OR code, shared with /schools/find-nearby via
    // school-search.svc.ts. Placed in `must` so a text query is mandatory (a geo/proximity
    // clause alone must not satisfy the match).
    must.push(buildFuzzyNameMust(namaSekolah))
  }

  // Req 3 — filters (negeri / jenis / peringkat). Shared with /schools/find-nearby via
  // school-search.svc.ts so the sidebar list and the map markers filter identically.
  filter.push(...buildAttributeFilters({ negeri, peringkat, jenis }))

  const hasText = typeof namaSekolah === 'string' && namaSekolah.trim().length > 0

  // Req 4 — geo. Two parts:
  //  1) filter (hard limit): only schools within the radius (default 8km) are returned.
  //  2) should `near` (soft rank): closer schools score higher, so the nearest appear first.
  //     Only apply proximity scoring when a text query exists.
  if (hasGeo) {
    const radius = radiusInMeter ?? DEFAULT_GEO_RADIUS_METERS
    filter.push(geoWithinCircleFilter(longitude!, latitude!, radius))
    if (hasText) {
      should.push({
        near: {
          origin: { type: 'Point', coordinates: [longitude, latitude] },
          pivot: GEO_PROXIMITY_PIVOT_METERS,
          path: 'data.infoLokasi.location',
        },
      })
    }
  }

  const hasSearchCriteria = must.length > 0 || should.length > 0 || filter.length > 0

  try {
    // No criteria at all → behave like the existing plain list endpoint
    if (!hasSearchCriteria) {
      const { items, total } = await regexSearchSchools(params)
      return reply.send(createSuccessResponse({ items, totalRecords: total, pageNumber: page, pageSize }))
    }

    const compound: Record<string, unknown> = {}
    if (must.length > 0) {
      compound.must = must
    }
    // `should` holds only the proximity `near` clause (scoring boost), so no minimumShouldMatch —
    // matching is enforced by `must` (text) and `filter` (geo radius + attribute filters).
    if (should.length > 0) {
      compound.should = should
    }
    if (filter.length > 0) {
      compound.filter = filter
    }

    const searchStage = { $search: { index: SCHOOL_SEARCH_INDEX, compound } } as unknown as PipelineStage

    const dataPipeline: PipelineStage[] = [searchStage]
    // If there is no text query, order by name for stability even when geo filters exist.
    if (!hasText) {
      dataPipeline.push({ $sort: { namaSekolah: 1 } })
    }
    dataPipeline.push({ $skip: skip }, { $limit: numericLimit })

    const items = await EntitiSekolahModel.aggregate<EntitiSekolah>(dataPipeline)

    const metaPipeline = [{ $searchMeta: { index: SCHOOL_SEARCH_INDEX, compound, count: { type: 'total' } } }] as unknown as PipelineStage[]
    const metaResult = await EntitiSekolahModel.aggregate(metaPipeline)
    const total = (metaResult[0] as { count?: { total?: number } } | undefined)?.count?.total ?? 0

    return reply.send(createSuccessResponse({ items, totalRecords: total, pageNumber: page, pageSize }))
  } catch (error) {
    // Req 6.2 & 6.3 — Atlas Search unavailable: log and gracefully fall back to regex search
    req.log.error({ err: error }, 'schools:search-suggestion:atlas-error')
    try {
      const { items, total } = await regexSearchSchools(params)
      return reply.send(createSuccessResponse({ items, totalRecords: total, pageNumber: page, pageSize }))
    } catch (fallbackError) {
      req.log.error({ err: fallbackError }, 'schools:search-suggestion:error')
      const errResponse = createErrorResponse('Failed to fetch school search suggestions. Please try again later.', 'ERR_500', 500)
      return reply.code(500).send(errResponse)
    }
  }
}

// export async function getSchoolsSearchSuggestion(req: FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>, reply: FastifyReply) {
export async function getFilterSchoolType(req: FastifyRequest<{ Querystring: GetFilterSchoolTypeQuery }>, reply: FastifyReply) {
  try {
    // Get school types from cache instead of querying the database
    const { peringkat } = req.query
    const cache = req.server.schoolFilterCache

    if (peringkat && peringkat !== 'ALL') {
      const filteredTypes = cache.schoolTypes.filter(st => st.peringkats?.includes(peringkat)).map(st => st.jenisLabel)
      return reply.send(createSuccessResponse(filteredTypes))
    }

    const schoolTypes = cache.schoolTypes.map(st => st.jenisLabel)
    return reply.send(createSuccessResponse(schoolTypes))
  } catch (error) {
    req.log.error({ err: error }, 'schools:get-school-types:error')
    const errResponse = createErrorResponse('Failed to fetch school types. Please try again later.', 'ERR_500', 500)
    return reply.code(500).send(errResponse)
  }
}

export async function getFilterPeringkat(req: FastifyRequest, reply: FastifyReply) {
  const peringkatValues = Object.values(PERINGKAT)
  return reply.send(createSuccessResponse(peringkatValues))
}
