import type { FastifyReply, FastifyRequest } from 'fastify'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import type { ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
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

// the function is to list all schools within the radius
export async function getSchoolsSearchSuggestion(req: FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>, reply: FastifyReply) {
  const { page = 1, pageSize = 25, namaSekolah, negeri, jenis, peringkat, latitude, longitude } = req.query
  const numericPage = Number(page) || 1
  const numericLimit = Number(pageSize)
  const skip = (numericPage - 1) * numericLimit
  const conditions: Record<string, unknown>[] = []

  // Build search conditions for namaSekolah (searches across multiple fields)
  if (namaSekolah) {
    const regexObj = { $regex: escapeStringRegex(namaSekolah), $options: 'i' }
    conditions.push({
      $or: [
        { namaSekolah: regexObj },
        { 'data.infoKomunikasi.alamatSurat': regexObj },
        { 'data.infoKomunikasi.bandarSurat': regexObj },
        { 'data.infoPentadbiran.parlimen': regexObj },
        { 'data.infoPentadbiran.negeri': regexObj },
      ],
    })
  }

  // Filter by state/negeri
  if (negeri && negeri !== 'ALL') {
    conditions.push({ 'data.infoPentadbiran.negeri': negeri })
  }

  // Filter by school type(s) - supports multiple types
  if (jenis && Array.isArray(jenis) && jenis.length > 0 && !jenis.includes('ALL')) {
    const jenisRegexArray = jenis.map(j => ({ 'data.infoSekolah.jenisLabel': { $regex: escapeStringRegex(j), $options: 'i' } }))
    conditions.push({ $or: jenisRegexArray })
  }

  // Filter by peringkat (education level)
  if (peringkat && peringkat !== 'ALL') {
    conditions.push({ 'data.infoPentadbiran.peringkat': { $regex: escapeStringRegex(peringkat), $options: 'i' } })
  }

  // Combine all conditions with $and
  const query = conditions.length > 0 ? { $and: conditions } : {}

  try {
    if (latitude && longitude) {
      const effectiveRadius = 5_000_000
      const lat = Number(latitude)
      const lng = Number(longitude)

      const countPipeline = [
        {
          $geoNear: {
            near: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] },
            distanceField: 'distance',
            maxDistance: effectiveRadius,
            spherical: true,
            key: 'data.infoLokasi.location',
            query: query,
          },
        },
        { $count: 'total' },
      ]

      const countResult = await EntitiSekolahModel.aggregate(countPipeline)
      const total = countResult[0]?.total || 0

      const schools = await EntitiSekolahModel.aggregate<EntitiSekolah>([
        {
          $geoNear: {
            near: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] },
            distanceField: 'distance',
            maxDistance: effectiveRadius,
            spherical: true,
            key: 'data.infoLokasi.location',
            query: query,
          },
        },
        { $sort: { distance: 1, namaSekolah: 1 } },
        { $skip: skip },
        { $limit: numericLimit },
      ])

      const response = createSuccessResponse({
        items: schools,
        totalRecords: total,
        pageNumber: page,
        pageSize: pageSize,
      })

      return reply.send(response)
    } else {
      Object.assign(query, { 'data.infoLokasi.location': { $exists: true } })

      const total = await EntitiSekolahModel.countDocuments(query)
      const schools = await EntitiSekolahModel.find(query).sort({ namaSekolah: 1 }).skip(skip).limit(numericLimit).lean()
      const response = createSuccessResponse({
        items: schools,
        totalRecords: total,
        pageNumber: page,
        pageSize: pageSize,
      })
      return reply.send(response)
    }
  } catch (error) {
    req.log.error({ err: error }, 'schools:search-suggestion:error')
    const errResponse = createErrorResponse('Failed to fetch school search suggestions. Please try again later.', 'ERR_500', 500)
    return reply.code(500).send(errResponse)
  }
}

export async function getFilterSchoolType(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Get school types from cache instead of querying the database
    const cache = req.server.schoolFilterCache
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
