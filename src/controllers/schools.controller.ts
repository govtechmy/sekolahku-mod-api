import { MARKER_GROUP } from '@types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from 'src/config/env.config'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import type { ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'
import type { FindNearbyResponse } from 'src/schemas/schools/response.schema'
import { calculateLocationCenter } from 'src/services/geometry.svc'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

import type { CreateSchoolBody } from '@/schemas'
// Zod now validates query parameters via `getNearbySchoolByLocationSchema` wired in the route

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
export async function getFindNearby(req: FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>, reply: FastifyReply) {
  // All query validation handled by Zod via route schema
  const { latitude, longitude, radiusInMeter, name } = req.query

  //Querying to find school in db
  try {
    const query = {}
    if (latitude && longitude && radiusInMeter) {
      Object.assign(query, {
        'data.infoLokasi.location': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeter,
          },
        },
      })
    }

    if (name) {
      Object.assign(query, { namaSekolah: { $regex: escapeStringRegex(name), $options: 'i' } })
    }

    const foundSchools = await EntitiSekolahModel.find(query).lean()

    if (!Array.isArray(foundSchools) || foundSchools.length === 0) {
      return reply.send(createSuccessResponse([]))
    }

    const coordinates = foundSchools.map(school => {
      return [school.data.infoLokasi.location?.coordinates[0], school.data.infoLokasi.location?.coordinates[1]]
    })
    const centerCoordinate = calculateLocationCenter(coordinates)

    const data = foundSchools.map(school => ({
      kodSekolah: school.kodSekolah,
      location: [school.data.infoLokasi.location?.coordinates[0], school.data.infoLokasi.location?.coordinates[1]],
      dataUrl: `${env.DATA_URL}/${school.data.infoPentadbiran.negeri}/${school.data.infoPentadbiran.parlimen}/${school.kodSekolah}/${school.kodSekolah}.json`,
    }))

    const response = {
      viewInfoLokasi: {
        koordinatXX: centerCoordinate.center[0],
        koordinatYY: centerCoordinate.center[1],
        zoom: centerCoordinate.zoom,
      },
      markerGroups: data.map(item => ({
        markerType: MARKER_GROUP.INDIVIDUAL,
        radiusInMeter: 0,
        items: [
          {
            kodSekolah: item.kodSekolah,
            infoLokasi: {
              koordinatXX: item.location[0],
              koordinatYY: item.location[1],
            },
            dataUrl: item.dataUrl,
          },
        ],
      })),
    } as FindNearbyResponse

    return reply.send(createSuccessResponse(response))
  } catch (error) {
    req.log.error({ err: error }, 'schools:getNearby:error')
    const errResponse = createErrorResponse('Failed to fetch nearby schools. Please check your coordinates and try again.', 'ERR_500', 500)
    return reply.code(500).send(errResponse)
  }
}

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
      const locationQuery = {
        ...query,
        'data.infoLokasi.location': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusInMeter || 100000,
          },
        },
      }

      const countQuery = {
        ...query,
        'data.infoLokasi.location': {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], (radiusInMeter || 100000) / 6378100],
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
