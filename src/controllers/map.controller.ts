import { type EntitiSekolah, MARKER_GROUP, NEGERI } from '@types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from 'src/config/env.config'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import { SystemConfigModel } from 'src/models/system-config.model'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'
import type { FindNearbyResponse } from 'src/schemas/schools/response.schema'
import { type CentroidCache } from 'src/services/centroid-cache.svc'
import { calculateLocationCenter, getRadiusFromZoom, getZoomFromRadius, resolveGroupCoordinates } from 'src/services/geometry.svc'
import { groupingFromZoom, makeSchoolObject } from 'src/services/nearby.helper'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

const EARTH_RADIUS_IN_METERS = 6378100 // Average radius of Earth in meters

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
    zoom = getZoomFromRadius(radiusInMeter, latitude)
  }

  const viewInfoLokasi = {
    koordinatXX: longitude,
    koordinatYY: latitude,
    zoom: zoom,
  }

  const grouping = groupingFromZoom(zoom)
  const centroidCache = req.server.centroidCache
  const radiusConfig = await SystemConfigModel.findOne({ key: 'radiusInMeter' })
  const radius = Number(radiusConfig?.value ?? 100000)
  const effectiveRadius = radiusInMeter ?? radius

  if (name) {
    const response = await searchByName({
      name,
      longitude,
      latitude,
      effectiveRadius,
      grouping,
      viewInfoLokasi,
      centroidCache,
    })

    if (response) {
      return reply.send(createSuccessResponse(response))
    }

    const errResponse = createErrorResponse('Failed to fetch nearby schools. Please check your coordinates and try again.', 'ERR_500', 500)
    return reply.code(500).send(errResponse)
  }

  try {
    const response = await searchByRadius({
      longitude,
      latitude,
      effectiveRadius,
      grouping,
      viewInfoLokasi,
      centroidCache,
    })
    if (response) {
      return reply.send(createSuccessResponse(response))
    }
  } catch (error) {
    req.log.error(`searchByRadius error: ${JSON.stringify(error)}`)
  }

  const errResponse = createErrorResponse('Failed to fetch nearby schools. Please check your coordinates and try again.', 'ERR_500', 500)
  return reply.code(500).send(errResponse)
}

async function groupByWestEastMalaysia(params: {
  viewInfoLokasi: { koordinatXX: number; koordinatYY: number; zoom: number }
  latitude: number
  longitude: number
  name?: string
  centroidCache: CentroidCache
}) {
  const query = {}

  if (params.name) {
    Object.assign(query, { namaSekolah: { $regex: escapeStringRegex(params.name), $options: 'i' } })
  }

  const westEastTotals = await EntitiSekolahModel.aggregate<{ _id: string; total: number }>([
    { $match: query },
    { $group: { _id: '$data.infoPentadbiran.negeri', total: { $sum: 1 } } },
    {
      $addFields: {
        region: {
          $cond: {
            if: { $in: ['$_id', [NEGERI.SABAH, NEGERI.SARAWAK]] },
            then: NEGERI.EAST_MALAYSIA,
            else: NEGERI.WEST_MALAYSIA,
          },
        },
      },
    },
    { $group: { _id: '$region', total: { $sum: '$total' } } },
    { $sort: { _id: 1 as const } },
  ])

  const keys = westEastTotals.map(item => item._id)

  const markerGroups = keys.map(key => {
    const centroid = params.centroidCache.malaysia[key]
    const centroidXX = centroid?.koordinatXX
    const centroidYY = centroid?.koordinatYY
    const total = westEastTotals.find(item => item._id === key)?.total

    return {
      markerType: MARKER_GROUP.WEST_EAST_MALAYSIA,
      region: key,
      infoLokasi: {
        koordinatXX: centroidXX,
        koordinatYY: centroidYY,
      },
      total,
    }
  })

  const response = {
    viewInfoLokasi: params.viewInfoLokasi,
    markerGroups,
  } as FindNearbyResponse

  return response
}

async function groupByNegeri(params: {
  viewInfoLokasi: { koordinatXX: number; koordinatYY: number; zoom: number }
  latitude: number
  longitude: number
  name?: string
  centroidCache: CentroidCache
}) {
  const query = {}

  if (params.name) {
    Object.assign(query, { namaSekolah: { $regex: escapeStringRegex(params.name), $options: 'i' } })
  }

  const finalQuery = [
    { $match: query },
    { $group: { _id: '$data.infoPentadbiran.negeri', total: { $sum: 1 } } },
    { $sort: { _id: 1 as const } },
  ]
  const negeriTotals = await EntitiSekolahModel.aggregate<{ _id: string; total: number }>(finalQuery)
  const negeriKeys = Array.from(negeriTotals).map(item => item._id)
  const markerGroups = negeriKeys.map(negeriKey => {
    const centroid = params.centroidCache.negeri[negeriKey]
    const centroidXX = centroid?.koordinatXX
    const centroidYY = centroid?.koordinatYY
    const total = negeriTotals.find(item => item._id === negeriKey)?.total

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
    viewInfoLokasi: params.viewInfoLokasi,
    markerGroups,
  } as FindNearbyResponse
  return response
}

async function groupByParlimen(params: {
  viewInfoLokasi: { koordinatXX: number; koordinatYY: number; zoom: number }
  latitude: number
  longitude: number
  effectiveRadius: number
  name?: string
  centroidCache: CentroidCache
}) {
  const query = {
    'data.infoLokasi.location': {
      $geoWithin: {
        $centerSphere: [[params.longitude, params.latitude], params.effectiveRadius / EARTH_RADIUS_IN_METERS],
      },
    },
  }

  if (params.name) {
    Object.assign(query, { namaSekolah: { $regex: escapeStringRegex(params.name), $options: 'i' } })
  }

  const parlimenTotals = await EntitiSekolahModel.aggregate<{ _id: string; total: number }>([
    { $match: query },
    { $group: { _id: '$data.infoPentadbiran.parlimen', total: { $sum: 1 } } },
    { $sort: { _id: 1 as const } },
  ])

  const parlimenKeys = Array.from(parlimenTotals).map(item => item._id)
  const markerGroups = parlimenKeys.map(parlimenKey => {
    const centroid = params.centroidCache.parlimen[parlimenKey]
    const centroidXX = centroid?.koordinatXX
    const centroidYY = centroid?.koordinatYY
    const total = parlimenTotals.find(item => item._id === parlimenKey)?.total

    return {
      markerType: MARKER_GROUP.PARLIMEN,
      negeri: undefined,
      parlimen: parlimenKey,
      infoLokasi: {
        koordinatXX: centroidXX,
        koordinatYY: centroidYY,
      },
      total,
    }
  })

  const response = {
    viewInfoLokasi: params.viewInfoLokasi,
    markerGroups,
  } as FindNearbyResponse

  return response
}

async function searchByName(params: {
  name: string
  longitude: number
  latitude: number
  effectiveRadius: number
  grouping: MARKER_GROUP
  viewInfoLokasi: { koordinatXX: number; koordinatYY: number; zoom: number }
  centroidCache: CentroidCache
}) {
  const query = {
    'data.infoLokasi.location': {
      $geoWithin: {
        $centerSphere: [[params.longitude, params.latitude], params.effectiveRadius / EARTH_RADIUS_IN_METERS],
      },
    },
  }

  if (params.name) {
    Object.assign(query, { namaSekolah: { $regex: escapeStringRegex(params.name), $options: 'i' } })
  }

  const foundSchools = await EntitiSekolahModel.aggregate<EntitiSekolah>([{ $match: query }, { $sort: { _id: 1 as const } }])

  if (params.grouping === MARKER_GROUP.INDIVIDUAL) {
    const markerGroups = foundSchools.map(school => {
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
    return response
  }

  if (params.grouping === MARKER_GROUP.WEST_EAST_MALAYSIA) {
    const response = await groupByWestEastMalaysia({
      viewInfoLokasi: params.viewInfoLokasi,
      latitude: params.latitude,
      longitude: params.longitude,
      name: params.name,
      centroidCache: params.centroidCache,
    })
    return response
  }

  if (params.grouping === MARKER_GROUP.NEGERI) {
    const negeriGroups = new Map<string, EntitiSekolah[]>()
    for (const school of foundSchools) {
      const negeriKey = school.data?.infoPentadbiran?.negeri
      if (!negeriKey) continue
      const grouped = negeriGroups.get(negeriKey) ?? []
      grouped.push(school)
      negeriGroups.set(negeriKey, grouped)
    }

    const markerGroups = Array.from(negeriGroups.entries()).flatMap(([negeriKey, groupedSchools]) => {
      const coords = resolveGroupCoordinates(groupedSchools)
      if (!coords) return []

      return [
        {
          markerType: MARKER_GROUP.NEGERI,
          negeri: negeriKey,
          infoLokasi: {
            koordinatXX: coords.koordinatXX,
            koordinatYY: coords.koordinatYY,
          },
          total: groupedSchools.length,
        },
      ]
    })

    if (markerGroups.length === 0) {
      const response = await groupByNegeri({
        viewInfoLokasi: params.viewInfoLokasi,
        latitude: params.latitude,
        longitude: params.longitude,
        name: params.name,
        centroidCache: params.centroidCache,
      })
      return response
    }

    const response = {
      viewInfoLokasi: params.viewInfoLokasi,
      markerGroups,
    } as FindNearbyResponse
    return response
  }

  if (params.grouping === MARKER_GROUP.PARLIMEN) {
    const parlimenGroups = new Map<string, EntitiSekolah[]>()
    for (const school of foundSchools) {
      const parlimenKey = school.data?.infoPentadbiran?.parlimen
      if (!parlimenKey) continue
      const grouped = parlimenGroups.get(parlimenKey) ?? []
      grouped.push(school)
      parlimenGroups.set(parlimenKey, grouped)
    }

    const markerGroups = Array.from(parlimenGroups.entries()).flatMap(([parlimenKey, groupedSchools]) => {
      const coords = resolveGroupCoordinates(groupedSchools)
      if (!coords) return []

      return [
        {
          markerType: MARKER_GROUP.PARLIMEN,
          negeri: undefined,
          parlimen: parlimenKey,
          infoLokasi: {
            koordinatXX: coords.koordinatXX,
            koordinatYY: coords.koordinatYY,
          },
          total: groupedSchools.length,
        },
      ]
    })

    if (markerGroups.length === 0) {
      const response = await groupByParlimen({
        viewInfoLokasi: params.viewInfoLokasi,
        latitude: params.latitude,
        longitude: params.longitude,
        effectiveRadius: params.effectiveRadius,
        name: params.name,
        centroidCache: params.centroidCache,
      })
      return response
    }

    const response = {
      viewInfoLokasi: params.viewInfoLokasi,
      markerGroups,
    } as FindNearbyResponse
    return response
  }

  return null
}

async function searchByRadius(params: {
  longitude: number
  latitude: number
  effectiveRadius: number
  grouping: MARKER_GROUP
  viewInfoLokasi: { koordinatXX: number; koordinatYY: number; zoom: number }
  centroidCache: CentroidCache
}) {
  if (params.grouping === MARKER_GROUP.INDIVIDUAL) {
    const query = {
      'data.infoLokasi.location': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [params.longitude, params.latitude],
          },
          $maxDistance: params.effectiveRadius,
        },
      },
    }
    const sekolahInRadius = await EntitiSekolahModel.find(query).lean<EntitiSekolah[]>()

    const markerGroups = sekolahInRadius.map(school => {
      const item = makeSchoolObject(school, env.DATA_URL)
      return {
        markerType: MARKER_GROUP.INDIVIDUAL,
        infoLokasi: item.infoLokasi,
        kodSekolah: item.kodSekolah,
        dataUrl: item.dataUrl,
      }
    })

    const response = {
      viewInfoLokasi: params.viewInfoLokasi,
      markerGroups,
    } as FindNearbyResponse

    return response
  }

  if (params.grouping === MARKER_GROUP.WEST_EAST_MALAYSIA) {
    const response = await groupByWestEastMalaysia({
      viewInfoLokasi: params.viewInfoLokasi,
      latitude: params.latitude,
      longitude: params.longitude,
      centroidCache: params.centroidCache,
    })
    return response
  }

  if (params.grouping === MARKER_GROUP.NEGERI) {
    const response = await groupByNegeri({
      viewInfoLokasi: params.viewInfoLokasi,
      latitude: params.latitude,
      longitude: params.longitude,
      centroidCache: params.centroidCache,
    })
    return response
  }

  if (params.grouping === MARKER_GROUP.PARLIMEN) {
    const response = await groupByParlimen({
      viewInfoLokasi: params.viewInfoLokasi,
      latitude: params.latitude,
      longitude: params.longitude,
      effectiveRadius: params.effectiveRadius,
      centroidCache: params.centroidCache,
    })
    return response
  }

  return null
}
