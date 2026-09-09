import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PipelineStage } from 'mongoose'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import type { GetFilterSchoolTypeQuery, ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import { buildAttributeMatch, FUZZY_CANDIDATE_PROJECTION, rankFuzzySchools } from 'src/services/school-search.svc'
import type { EntitiSekolah } from 'src/types/entities'
import { PERINGKAT } from 'src/types/enum'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

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
        { namaRingkas: regexObj },
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
        near: {
          type: 'Point' as const,
          coordinates: [longitude, latitude] as [number, number],
        },
        distanceField: 'distance',
        maxDistance: effectiveRadius,
        spherical: true,
        key: 'data.infoLokasi.location',
        query,
      },
    }

    const countResult = await EntitiSekolahModel.aggregate([geoNearStage, { $count: 'total' }] as unknown as PipelineStage[])
    const total = (countResult[0] as { total?: number } | undefined)?.total ?? 0

    const geoSort = namaSekolah ? { $sort: { distance: 1, namaSekolah: 1 } } : { $sort: { namaSekolah: 1 } }

    const items = await EntitiSekolahModel.aggregate<EntitiSekolah>([
      geoNearStage,
      geoSort,
      { $skip: skip },
      { $limit: limit },
    ] as unknown as PipelineStage[])

    return { items, total }
  }

  // No geo: preserve existing behaviour of only returning schools with valid coordinates
  Object.assign(query, {
    'data.infoLokasi.location': { $exists: true },
    'data.infoLokasi.location.coordinates.0': { $exists: true, $ne: null },
    'data.infoLokasi.location.coordinates.1': { $exists: true, $ne: null },
  })

  const total = await EntitiSekolahModel.countDocuments(query)
  const items = (await EntitiSekolahModel.find(query).sort({ namaSekolah: 1 }).skip(skip).limit(limit).lean()) as unknown as EntitiSekolah[]

  return { items, total }
}

type SchoolWithDistance = EntitiSekolah & { distance?: number }

async function fuzzySearchSchools(params: SchoolSearchParams): Promise<SchoolSearchResult> {
  const { namaSekolah, negeri, jenis, peringkat, latitude, longitude, radiusInMeter, skip, limit } = params
  if (!namaSekolah) return regexSearchSchools(params)

  const conditions = buildAttributeMatch({ negeri, peringkat, jenis })
  const query: Record<string, unknown> = conditions.length > 0 ? { $and: conditions } : {}
  let candidates: SchoolWithDistance[]

  if (latitude !== undefined && longitude !== undefined) {
    const geoNearStage = {
      $geoNear: {
        near: {
          type: 'Point' as const,
          coordinates: [longitude, latitude] as [number, number],
        },
        distanceField: 'distance',
        maxDistance: radiusInMeter ?? DEFAULT_GEO_RADIUS_METERS,
        spherical: true,
        key: 'data.infoLokasi.location',
        query,
      },
    }
    candidates = await EntitiSekolahModel.aggregate<SchoolWithDistance>([
      geoNearStage,
      { $project: { ...FUZZY_CANDIDATE_PROJECTION, distance: 1 } },
    ] as unknown as PipelineStage[])
  } else {
    Object.assign(query, {
      'data.infoLokasi.location': { $exists: true },
      'data.infoLokasi.location.coordinates.0': { $exists: true, $ne: null },
      'data.infoLokasi.location.coordinates.1': { $exists: true, $ne: null },
    })

    // ponytail: O(n) scan is bounded to the filtered ~10k-school fallback set;
    // replace with a cached lightweight index only when fallback traffic warrants it.
    candidates = (await EntitiSekolahModel.find(query, FUZZY_CANDIDATE_PROJECTION).lean()) as unknown as SchoolWithDistance[]
  }

  const ranked = rankFuzzySchools(namaSekolah, candidates)
  const pageResults = ranked.slice(skip, skip + limit)
  const pageCodes = pageResults.map(result => result.school.kodSekolah)
  if (pageCodes.length === 0) return { items: [], total: ranked.length }

  const fullItems = (await EntitiSekolahModel.find({
    kodSekolah: { $in: pageCodes },
  }).lean()) as unknown as EntitiSekolah[]
  const itemByCode = new Map(fullItems.map(item => [item.kodSekolah, item]))
  const items = pageResults.flatMap(result => {
    const item = itemByCode.get(result.school.kodSekolah)
    if (!item) return []
    const distance = (result.school as SchoolWithDistance).distance
    return distance === undefined ? [item] : [{ ...item, distance } as EntitiSekolah]
  })

  return { items, total: ranked.length }
}

// School search suggestion — typo-tolerant fuzzy ranking (fuzzball) with regex fallback.
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

  try {
    // Primary path: in-memory fuzzball ranker over the full school set. It tolerates spelling
    // mistakes ("bufot" -> "Beaufort") and requires EVERY query token to match a field — which
    // Atlas Search `fuzzy` (capped at maxEdits: 2) could not do, and which its synonym clause
    // broke (e.g. "smk gombak" matched every SMK, ignoring "gombak"). fuzzySearchSchools also
    // handles the dropdown filters, geo radius, and — when there is no name query — delegates to
    // regexSearchSchools for the plain paginated list.
    const { items, total } = await fuzzySearchSchools(params)
    return reply.send(
      createSuccessResponse({
        items,
        totalRecords: total,
        pageNumber: page,
        pageSize,
      }),
    )
  } catch (error) {
    // Graceful degradation: fall back to the legacy regex search if fuzzy ranking fails.
    req.log.error({ err: error }, 'schools:search-suggestion:error')
    try {
      const { items, total } = await regexSearchSchools(params)
      return reply.send(
        createSuccessResponse({
          items,
          totalRecords: total,
          pageNumber: page,
          pageSize,
        }),
      )
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
