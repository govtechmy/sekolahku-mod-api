import { type EntitiSekolah, MARKER_GROUP, NEGERI } from '@types'
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify'
import type { PipelineStage } from 'mongoose'
import { env } from 'src/config/env.config'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import { SystemConfigModel } from 'src/models/system-config.model'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'
import type { FindNearbyResponse } from 'src/schemas/schools/response.schema'
import { type CentroidCache } from 'src/services/centroid-cache.svc'
import { calculateLocationCenter, getRadiusFromZoom, getZoomFromRadius, resolveGroupCoordinates } from 'src/services/geometry.svc'
import { groupingFromZoom, makeSchoolObject } from 'src/services/nearby.helper'
import {
  buildAttributeFilters,
  buildAttributeMatch,
  buildNameSearchStage,
  geoWithinCircleFilter,
  locationExistsFilter,
  regexNameOr,
  type SchoolAttributeFilters,
} from 'src/services/school-search.svc'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

const EARTH_RADIUS_IN_METERS = 6378100 // Average radius of Earth in meters

/**
 * Runs an aggregation that optionally filters schools by name and by the negeri/peringkat/jenis
 * dropdown filters.
 *  - When `name` is provided it uses fuzzy Atlas Search (typo tolerant + synonyms + code boost)
 *    as the leading `$search` stage, and gracefully falls back to a regex `$match` if Atlas
 *    Search is unavailable (mirrors the /schools/search behaviour).
 *  - When `name` is absent it runs the plain `$match` pipeline (unchanged legacy behaviour).
 * `atlasFilters` are placed in the `$search` compound `filter` (geo radius / location exists +
 * attribute `equals`), while `matchConditions` are the equivalent Mongo conditions ANDed together
 * for the non-name and regex-fallback paths. `downstream` are the stages that follow the leading
 * stage (e.g. `$group` / `$sort`).
 */
async function aggregateSchoolsByName<T>(opts: {
  name?: string
  atlasFilters: Record<string, unknown>[]
  matchConditions: Record<string, unknown>[]
  downstream: PipelineStage[]
  log?: FastifyBaseLogger
}): Promise<T[]> {
  const { name, atlasFilters, matchConditions, downstream, log } = opts

  // Combine all conditions under `$and` so multiple `$or` clauses (e.g. jenis + name regex)
  // don't overwrite each other in a single object.
  const buildMatch = (extra: Record<string, unknown>[] = []): Record<string, unknown> => {
    const all = [...extra, ...matchConditions]
    return all.length > 0 ? { $and: all } : {}
  }

  if (!name) {
    return EntitiSekolahModel.aggregate<T>([{ $match: buildMatch() } as PipelineStage, ...downstream])
  }

  try {
    return await EntitiSekolahModel.aggregate<T>([buildNameSearchStage(name, atlasFilters), ...downstream])
  } catch (error) {
    // Atlas Search unavailable → graceful regex fallback within the same base + attribute conditions.
    log?.error({ err: error }, 'find-nearby:atlas-search:fallback-to-regex')
    return EntitiSekolahModel.aggregate<T>([{ $match: buildMatch([regexNameOr(name)]) } as PipelineStage, ...downstream])
  }
}

// the function is to list all schools within the radius
export async function getFindNearby(req: FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>, reply: FastifyReply) {
  // All query validation handled by Zod via route schema
  const { latitude, longitude, name, negeri, peringkat, jenis } = req.query
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
  // negeri / peringkat / jenis dropdown filters — applied to both name and radius searches so the
  // map markers narrow down the same way the sidebar list does.
  const attributes: SchoolAttributeFilters = { negeri, peringkat, jenis }

  if (name) {
    const response = await searchByName({
      name,
      longitude,
      latitude,
      effectiveRadius,
      grouping,
      viewInfoLokasi,
      centroidCache,
      attributes,
      log: req.log,
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
      attributes,
      log: req.log,
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
  attributes?: SchoolAttributeFilters
  log?: FastifyBaseLogger
}) {
  // Ensure location exists AND has valid numeric coordinates (consistent with other groupBy functions)
  const existsConditions: Record<string, unknown> = {
    'data.infoLokasi.location': { $exists: true },
    'data.infoLokasi.location.coordinates.0': { $exists: true, $type: 'number' },
    'data.infoLokasi.location.coordinates.1': { $exists: true, $type: 'number' },
  }
  const attributes = params.attributes ?? {}

  const westEastTotals = await aggregateSchoolsByName<{ _id: string; total: number }>({
    name: params.name,
    atlasFilters: [locationExistsFilter(), ...buildAttributeFilters(attributes)],
    matchConditions: [existsConditions, ...buildAttributeMatch(attributes)],
    downstream: [
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
    ],
    log: params.log,
  })

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
  attributes?: SchoolAttributeFilters
  log?: FastifyBaseLogger
}) {
  // Ensure location exists AND has valid numeric coordinates
  const existsConditions: Record<string, unknown> = {
    'data.infoLokasi.location': { $exists: true },
    'data.infoLokasi.location.coordinates.0': { $exists: true, $type: 'number' },
    'data.infoLokasi.location.coordinates.1': { $exists: true, $type: 'number' },
  }
  const attributes = params.attributes ?? {}

  const negeriTotals = await aggregateSchoolsByName<{ _id: string; total: number }>({
    name: params.name,
    atlasFilters: [locationExistsFilter(), ...buildAttributeFilters(attributes)],
    matchConditions: [existsConditions, ...buildAttributeMatch(attributes)],
    downstream: [
      { $group: { _id: '$data.infoPentadbiran.negeri', total: { $sum: 1 } } },
      { $sort: { _id: 1 as const } },
    ],
    log: params.log,
  })
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
  attributes?: SchoolAttributeFilters
  log?: FastifyBaseLogger
}) {
  const geoCondition: Record<string, unknown> = {
    'data.infoLokasi.location': {
      $geoWithin: {
        $centerSphere: [[params.longitude, params.latitude], params.effectiveRadius / EARTH_RADIUS_IN_METERS],
      },
    },
  }
  const attributes = params.attributes ?? {}

  const parlimenTotals = await aggregateSchoolsByName<{ _id: string; total: number }>({
    name: params.name,
    atlasFilters: [geoWithinCircleFilter(params.longitude, params.latitude, params.effectiveRadius), ...buildAttributeFilters(attributes)],
    matchConditions: [geoCondition, ...buildAttributeMatch(attributes)],
    downstream: [
      { $group: { _id: '$data.infoPentadbiran.parlimen', total: { $sum: 1 } } },
      { $sort: { _id: 1 as const } },
    ],
    log: params.log,
  })

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
  attributes?: SchoolAttributeFilters
  log?: FastifyBaseLogger
}) {
  const geoCondition: Record<string, unknown> = {
    'data.infoLokasi.location': {
      $geoWithin: {
        $centerSphere: [[params.longitude, params.latitude], params.effectiveRadius / EARTH_RADIUS_IN_METERS],
      },
    },
  }
  const attributes = params.attributes ?? {}

  // Fuzzy Atlas Search (typo tolerant + synonyms + code) within the geo radius and dropdown
  // filters, with regex fallback.
  const foundSchools = await aggregateSchoolsByName<EntitiSekolah>({
    name: params.name,
    atlasFilters: [geoWithinCircleFilter(params.longitude, params.latitude, params.effectiveRadius), ...buildAttributeFilters(attributes)],
    matchConditions: [geoCondition, ...buildAttributeMatch(attributes)],
    downstream: [{ $sort: { namaSekolah: 1 as const } }],
    log: params.log,
  })

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
      attributes: params.attributes,
      log: params.log,
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
        attributes: params.attributes,
        log: params.log,
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
        attributes: params.attributes,
        log: params.log,
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
  attributes?: SchoolAttributeFilters
  log?: FastifyBaseLogger
}) {
  if (params.grouping === MARKER_GROUP.INDIVIDUAL) {
    const query: Record<string, unknown> = {
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
    // Apply the negeri/peringkat/jenis dropdown filters to the individual markers as well.
    const attrConditions = buildAttributeMatch(params.attributes ?? {})
    if (attrConditions.length > 0) {
      query.$and = attrConditions
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
      attributes: params.attributes,
      log: params.log,
    })
    return response
  }

  if (params.grouping === MARKER_GROUP.NEGERI) {
    const response = await groupByNegeri({
      viewInfoLokasi: params.viewInfoLokasi,
      latitude: params.latitude,
      longitude: params.longitude,
      centroidCache: params.centroidCache,
      attributes: params.attributes,
      log: params.log,
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
      attributes: params.attributes,
      log: params.log,
    })
    return response
  }

  return null
}
