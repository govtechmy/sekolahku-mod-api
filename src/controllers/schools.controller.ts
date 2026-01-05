import type { FastifyReply, FastifyRequest } from 'fastify'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import { SystemConfigModel } from 'src/models/system-config.model'
import type { ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

import type { CreateSchoolBody } from '@/schemas'

const EARTH_RADIUS_IN_METERS = 6378100 // Average radius of Earth in meters

export async function listSchools(req: FastifyRequest, reply: FastifyReply) {
  const schools = await EntitiSekolahModel.find().lean()
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
  const { page = 1, pageSize = 25, namaSekolah, negeri, jenis, latitude, longitude, radiusInMeter } = req.query
  const numericPage = Number(page) || 1
  const numericLimit = Number(pageSize)
  const skip = (numericPage - 1) * numericLimit
  const query = {}

  if (namaSekolah) {
    Object.assign(query, { namaSekolah: { $regex: escapeStringRegex(namaSekolah), $options: 'i' } })
  }

  if (negeri && negeri !== 'ALL') {
    Object.assign(query, { 'data.infoPentadbiran.negeri': negeri })
  }

  if (jenis && jenis !== 'ALL') {
    Object.assign(query, { 'data.infoSekolah.jenisLabel': { $regex: escapeStringRegex(jenis), $options: 'i' } })
  }

  try {
    if (latitude && longitude) {
      // Fetch radius from SystemConfig if radiusInMeter is not provided from frontend
      const radiusConfig = await SystemConfigModel.findOne({ key: 'radiusInMeter' })
      const radius = Number(radiusConfig?.value ?? 100000)

      // Use frontend value if provided, otherwise use config value
      const effectiveRadius = radiusInMeter ?? radius

      const locationQuery = {
        ...query,
        'data.infoLokasi.location': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: effectiveRadius,
          },
        },
      }

      const countQuery = {
        ...query,
        'data.infoLokasi.location': {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], effectiveRadius / EARTH_RADIUS_IN_METERS],
          },
        },
      }

      const total = await EntitiSekolahModel.countDocuments(countQuery)

      const schools = await EntitiSekolahModel.find(locationQuery).skip(skip).limit(numericLimit).lean()

      const response = createSuccessResponse({
        items: schools,
        totalRecords: total,
        pageNumber: page,
        pageSize: pageSize,
      })

      return reply.send(response)
    } else {
      const total = await EntitiSekolahModel.countDocuments(query)

      const schools = await EntitiSekolahModel.find(query).skip(skip).limit(numericLimit).lean()

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
    //to get school-type from schools.data.infoSekolah.jenisLabel
    const schoolTypes = await EntitiSekolahModel.distinct('data.infoSekolah.jenisLabel').lean()
    return reply.send(createSuccessResponse(schoolTypes))
  } catch (error) {
    req.log.error({ err: error }, 'schools:get-school-types:error')
    const errResponse = createErrorResponse('Failed to fetch school types. Please try again later.', 'ERR_500', 500)
    return reply.code(500).send(errResponse)
  }
}

