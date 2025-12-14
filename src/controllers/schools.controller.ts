import { type EntitiSekolah, MARKER_GROUP } from '@types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from 'src/config/env.config'
import type { GetNearbySchoolByLocation, ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import type { FindNearbyResponse } from 'src/schemas/schools/response.schema'
import { groupingFromRadius, makeSchoolObject } from 'src/services/nearby.helper'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

import type { CreateSchoolBody } from '@/schemas'

import { NegeriPolygonModel } from '../models/negeri-polygon.model'
import { ParlimenPolygonModel } from '../models/parlimen-polygon.model'
import { EntitiSekolahModel } from '../models/school.model'
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

  if (longitude === undefined || latitude === undefined || radiusInMeter === undefined) {
    const errResponse = createErrorResponse('latitude, longitude, and radiusInMeter are required', 'ERR_400', 400)
    return reply.code(400).send(errResponse)
  }

  const viewInfoLokasi = {
    koordinatXX: longitude,
    koordinatYY: latitude,
    zoom: radiusInMeter,
  }

  const grouping = groupingFromRadius(radiusInMeter)

  try {
    const query = {
      'data.infoLokasi.location': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInMeter,
        },
      },
    }

    const foundSchools = await EntitiSekolahModel.find(query).lean<EntitiSekolah[]>()

    if (!Array.isArray(foundSchools) || foundSchools.length === 0) {
      return reply.send(createSuccessResponse([]))
    }


    if (grouping === MARKER_GROUP.INDIVIDUAL) {
      const markerGroups = foundSchools.map(school => {
        const item = makeSchoolObject(school, env.DATA_URL)
        return {
          markerType: MARKER_GROUP.INDIVIDUAL,
          infoLokasi: item.infoLokasi,
          kodSekolah: item.kodSekolah,
          dataUrl: item.dataUrl,
        }
      })

      const response = {
        viewInfoLokasi,
        markerGroups,
      } as FindNearbyResponse

      return reply.send(createSuccessResponse(response))
    }

    if (grouping === MARKER_GROUP.NEGERI) {
      const negeriGroups = new Map<string, EntitiSekolah[]>()
      foundSchools.forEach(school => {
        const negeriKey = school.data.infoPentadbiran.negeri || 'UNKNOWN_NEGERI'
        const list = negeriGroups.get(negeriKey) || []
        list.push(school)
        negeriGroups.set(negeriKey, list)
      })

      const markerGroups = await Promise.all(
        Array.from(negeriGroups.entries()).map(async ([negeri]) => {
          const centroidDoc = await NegeriPolygonModel.findOne({ negeri }).lean()
          const centroid = centroidDoc?.centroid
          const centroidXX = centroid?.koordinatXX
          const centroidYY = centroid?.koordinatYY
          const total = await EntitiSekolahModel.countDocuments({ 'data.infoPentadbiran.negeri': negeri })

          return {
            markerType: MARKER_GROUP.NEGERI,
            negeri,
            infoLokasi: {
              koordinatXX: centroidXX,
              koordinatYY: centroidYY,
            },
            total,
          }
        }),
      )

      const response = {
        viewInfoLokasi,
        markerGroups,
      } as FindNearbyResponse

      return reply.send(createSuccessResponse(response))
    }

    // PARLIMEN grouping
    const parlimenGroups = new Map<string, { negeri: string; parlimen: string; schools: EntitiSekolah[] }>()
    foundSchools.forEach(school => {
      const negeriKey = school.data.infoPentadbiran.negeri || 'UNKNOWN_NEGERI'
      const parlimenKey = school.data.infoPentadbiran.parlimen || 'UNKNOWN_PARLIMEN'
      const key = `${negeriKey}||${parlimenKey}`
      const entry = parlimenGroups.get(key) || { negeri: negeriKey, parlimen: parlimenKey, schools: [] }
      entry.schools.push(school)
      parlimenGroups.set(key, entry)
    })

    const markerGroups = await Promise.all(
      Array.from(parlimenGroups.values()).map(async group => {
        const centroidDoc =
          group.parlimen !== 'UNKNOWN_PARLIMEN' ? await ParlimenPolygonModel.findOne({ parlimen: group.parlimen }).lean() : null
        const centroid = centroidDoc?.centroid
        const centroidXX = centroid?.koordinatXX
        const centroidYY = centroid?.koordinatYY

        return {
          markerType: MARKER_GROUP.PARLIMENT,
          negeri: group.negeri,
          parlimen: group.parlimen,
          infoLokasi: {
            koordinatXX: centroidXX,
            koordinatYY: centroidYY,
          },
          total: group.schools.length,
        }
      }),
    )

    const response = {
      viewInfoLokasi,
      markerGroups,
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
