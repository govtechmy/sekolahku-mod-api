import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

import type { CreateSchoolBody } from '@/schemas'

import { EntitiSekolahModel, SekolahModel } from '../models/school.model'
import { escapeStringRegex } from 'src/utils/escape-string-regex'
import { env } from 'src/config/env.config'
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
  const doc = await SekolahModel.findById(id).lean()
  if (!doc) {
    req.log.warn({ id }, 'schools:get:not-found')
    return reply.code(404).send(createErrorResponse('School not found', 'ERR_404', 404))
  }
  return reply.send(createSuccessResponse(doc))
}

// the function is to list all schools within the radius
export async function getNearbySchools(req: FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>, reply: FastifyReply) {
  // All query validation handled by Zod via route schema
  const { latitude, longitude, radiusInMeter } = req.query

  //Querying to find school in db
  try {
    const foundSchools = await EntitiSekolahModel.find({
      'data.infoLokasi.location': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInMeter,
        },
      },
    }).lean()

    if (!Array.isArray(foundSchools) || foundSchools.length === 0) {
      return reply.send(createSuccessResponse([]))
    }

    const data = foundSchools.map(school => ({
      kodSekolah: school.kodSekolah,
      location: [school.data.infoLokasi.location?.coordinates[0], school.data.infoLokasi.location?.coordinates[1]],
      //origins : my.gov.digital.sekolahku-public-dev.s3.ap-southeast-5.amazonaws.com
      dataUrl: `${env.DATA_URL}/sekolah/${school.kodSekolah}.json`
    }))

    return reply.send(createSuccessResponse(data))
  } catch (error) {
    req.log.error({ err: error }, 'schools:getNearby:error')
    const errResponse = createErrorResponse('Failed to fetch nearby schools. Please check your coordinates and try again.', 'ERR_500', 500)

    return reply.code(500).send(errResponse)
  }
}

export async function getSchoolsSearchSuggestion(req: FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>, reply: FastifyReply) {
  const { namaSekolah, negeri, jenis } = req.query
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

  const schools = await EntitiSekolahModel.find(query).lean()
  req.log.info(
    {
      count: Array.isArray(schools) ? schools.length : undefined,
      filters: { namaSekolah, negeri, jenis },
    },
    'schools:search',
  )
  return reply.send(createSuccessResponse(schools))
}
