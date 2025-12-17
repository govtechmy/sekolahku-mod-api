import { type EntitiSekolah, MARKER_GROUP, type PolygonCentroid } from '@types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from 'src/config/env.config'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import { SystemConfigModel } from 'src/models/system-config.model'
import type { GetNearbySchoolByLocation, ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import type { FindNearbyResponse } from 'src/schemas/schools/response.schema'
import { calculateLocationCenter, getRadiusFromZoom, returnWithinRadius } from 'src/services/geometry.svc'
import { groupingFromRadius, makeSchoolObject } from 'src/services/nearby.helper'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

import type { CreateSchoolBody } from '@/schemas'

import { NegeriPolygonModel } from '../models/negeri-polygon.model'
import { ParlimenPolygonModel } from '../models/parlimen-polygon.model'
// Zod now validates query parameters via `getNearbySchoolByLocationSchema` wired in the route

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
export async function getFindNearby(req: FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>, reply: FastifyReply) {
  // All query validation handled by Zod via route schema
  const { latitude, longitude, name } = req.query
  let { radiusInMeter, zoom } = req.query

  if (longitude === undefined || latitude === undefined || radiusInMeter === undefined) {
    const errResponse = createErrorResponse('latitude, longitude, and radiusInMeter are required', 'ERR_400', 400)
    return reply.code(400).send(errResponse)
  }

  if (zoom) {
    radiusInMeter = getRadiusFromZoom(zoom, latitude)
  }

  if (!zoom) {
    zoom = getRadiusFromZoom(radiusInMeter, latitude)
  }

  const viewInfoLokasi = {
    koordinatXX: longitude,
    koordinatYY: latitude,
    zoom: zoom,
  }

  const grouping = groupingFromRadius(radiusInMeter)
  const radiusConfig = await SystemConfigModel.findOne({ key: 'radiusInMeter' })
  const radius = Number(radiusConfig?.value ?? 100000)
  const effectiveRadius = radiusInMeter ?? radius

  if (name) {
    const query = {
      namaSekolah: { $regex: escapeStringRegex(name), $options: 'i' },
    }
    const foundSchools = await EntitiSekolahModel.find(query).lean<EntitiSekolah[]>()
    const schoolsWithinRadius = returnWithinRadius(foundSchools, longitude, latitude, effectiveRadius)

    if (!Array.isArray(schoolsWithinRadius) || schoolsWithinRadius.length === 0) {
      return reply.send(createSuccessResponse([]))
    }

    if (grouping === MARKER_GROUP.INDIVIDUAL) {
      const markerGroups = schoolsWithinRadius.map(school => {
        const item = makeSchoolObject(school, env.DATA_URL)
        return {
          markerType: MARKER_GROUP.INDIVIDUAL,
          infoLokasi: item.infoLokasi,
          kodSekolah: item.kodSekolah,
          dataUrl: item.dataUrl,
        }
      })

      const centerLocation = calculateLocationCenter(foundSchools.map(school => school.data.infoLokasi.location?.coordinates))
      const response = {
        viewInfoLokasi: {
          koordinatXX: centerLocation.center[0],
          koordinatYY: centerLocation.center[1],
          zoom: centerLocation.zoom,
        },
        markerGroups,
      } as FindNearbyResponse
      return reply.send(createSuccessResponse(response))
    }

    if (grouping === MARKER_GROUP.NEGERI) {
      const negeriTotalsMap = new Map<string, number>()
      schoolsWithinRadius.forEach(school => {
        const negeriKey = school.data.infoPentadbiran.negeri
        if (!negeriKey) return
        negeriTotalsMap.set(negeriKey, (negeriTotalsMap.get(negeriKey) || 0) + 1)
      })
      const negeriKeys = Array.from(negeriTotalsMap.keys())

      const allCentroid = await NegeriPolygonModel.find().lean()
      const negeriCentroidMap = new Map<string, PolygonCentroid>(
        allCentroid.map(item => [item.negeri as string, item.centroid as PolygonCentroid]),
      )

      const markerGroups = negeriKeys.map(negeriKey => {
        const centroid = negeriCentroidMap.get(negeriKey)
        const centroidXX = centroid?.koordinatXX
        const centroidYY = centroid?.koordinatYY
        const total = negeriTotalsMap.get(negeriKey)

        return {
          markerType: MARKER_GROUP.NEGERI,
          negeri: negeriKey,
          infoLokasi: {
            koordinatXX: centroidXX,
            koordinatYY: centroidYY,
          },
          total,
        }
      })

      const response = {
        viewInfoLokasi,
        markerGroups,
      } as FindNearbyResponse

      return reply.send(createSuccessResponse(response))
    }

    if (grouping === MARKER_GROUP.PARLIMEN) {
      const parlimenGroups = new Map<string, { negeri: string; parlimen: string }>()
      const parlimenTotalsMap = new Map<string, number>()
      schoolsWithinRadius.forEach(school => {
        const negeriKey = school.data.infoPentadbiran.negeri
        const parlimenKey = school.data.infoPentadbiran.parlimen
        if (negeriKey && parlimenKey) {
          parlimenGroups.set(parlimenKey, { negeri: negeriKey, parlimen: parlimenKey })
          parlimenTotalsMap.set(parlimenKey, (parlimenTotalsMap.get(parlimenKey) || 0) + 1)
        }
      })

      const parlimenEntries = Array.from(parlimenGroups.values())

      const allParlimenCentroid = await ParlimenPolygonModel.find().lean()
      const parlimenCentroidMap = new Map<string, PolygonCentroid>(
        allParlimenCentroid.map(item => [item.parlimen as string, item.centroid as PolygonCentroid]),
      )

      const markerGroups = parlimenEntries.map(group => {
        const centroid = parlimenCentroidMap.get(group.parlimen)
        const centroidXX = centroid?.koordinatXX
        const centroidYY = centroid?.koordinatYY
        const total = parlimenTotalsMap.get(group.parlimen)

        return {
          markerType: MARKER_GROUP.PARLIMEN,
          negeri: group.negeri,
          parlimen: group.parlimen,
          infoLokasi: {
            koordinatXX: centroidXX,
            koordinatYY: centroidYY,
          },
          total,
        }
      })

      const response = {
        viewInfoLokasi,
        markerGroups,
      } as FindNearbyResponse

      return reply.send(createSuccessResponse(response))
    }
  }

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
      const negeriTotalsMap = new Map<string, number>()
      foundSchools.forEach(school => {
        const negeriKey = school.data.infoPentadbiran.negeri
        if (!negeriKey) return
        negeriTotalsMap.set(negeriKey, (negeriTotalsMap.get(negeriKey) || 0) + 1)
      })
      const negeriKeys = Array.from(negeriTotalsMap.keys())

      const allCentroid = await NegeriPolygonModel.find().lean()
      const negeriCentroidMap = new Map<string, PolygonCentroid>(
        allCentroid.map(item => [item.negeri as string, item.centroid as PolygonCentroid]),
      )

      const markerGroups = negeriKeys.map(negeriKey => {
        const centroid = negeriCentroidMap.get(negeriKey)
        const centroidXX = centroid?.koordinatXX
        const centroidYY = centroid?.koordinatYY
        const total = negeriTotalsMap.get(negeriKey)

        return {
          markerType: MARKER_GROUP.NEGERI,
          negeri: negeriKey,
          infoLokasi: {
            koordinatXX: centroidXX,
            koordinatYY: centroidYY,
          },
          total,
        }
      })

      const response = {
        viewInfoLokasi,
        markerGroups,
      } as FindNearbyResponse

      return reply.send(createSuccessResponse(response))
    }

    // PARLIMEN grouping
    const parlimenGroups = new Map<string, { negeri: string; parlimen: string }>()
    foundSchools.forEach(school => {
      const negeriKey = school.data.infoPentadbiran.negeri
      const parlimenKey = school.data.infoPentadbiran.parlimen
      if (negeriKey && parlimenKey) {
        parlimenGroups.set(parlimenKey, { negeri: negeriKey, parlimen: parlimenKey })
      }
    })

    const parlimenEntries = Array.from(parlimenGroups.values())
    const parlimenKeys = parlimenEntries.map(entry => entry.parlimen)
    const parlimenTotals = await EntitiSekolahModel.aggregate<{ _id: string; total: number }>([
      { $match: { 'data.infoPentadbiran.parlimen': { $in: parlimenKeys } } },
      { $group: { _id: '$data.infoPentadbiran.parlimen', total: { $sum: 1 } } },
    ])
    const parlimenTotalsMap = new Map<string, number>(parlimenTotals.map(item => [item._id, item.total]))

    const allParlimenCentroid = await ParlimenPolygonModel.find().lean()
    const parlimenCentroidMap = new Map<string, PolygonCentroid>(
      allParlimenCentroid.map(item => [item.parlimen as string, item.centroid as PolygonCentroid]),
    )

    const markerGroups = parlimenEntries.map(group => {
      const centroid = parlimenCentroidMap.get(group.parlimen)
      const centroidXX = centroid?.koordinatXX
      const centroidYY = centroid?.koordinatYY
      const total = parlimenTotalsMap.get(group.parlimen)

      return {
        markerType: MARKER_GROUP.PARLIMEN,
        negeri: group.negeri,
        parlimen: group.parlimen,
        infoLokasi: {
          koordinatXX: centroidXX,
          koordinatYY: centroidYY,
        },
        total,
      }
    })

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
