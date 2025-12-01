import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'

import type { CreateSchoolBody } from '@/schemas'

import { EntitiSekolahModel } from '../models/school.model'
import { getSingleQueryParam, parseNumberParam, validateLatitudeRange, validateLongitudeRange } from '../utils/validation.util'

export async function listSchools(req: FastifyRequest, reply: FastifyReply) {
  const schools = await EntitiSekolahModel.find().lean()
  req.log.info({ count: Array.isArray(schools) ? schools.length : undefined }, 'schools:list')
  reply.send(schools)
}

export async function createSchool(req: FastifyRequest<{ Body: CreateSchoolBody }>, reply: FastifyReply) {
  const payload = req.body
  const created = await EntitiSekolahModel.create(payload)
  req.log.info({ kodSekolah: created.kodSekolah, id: created._id }, 'schools:create:success')
  reply.code(201).send(created)
}

export async function getSchoolById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = req.params
  const doc = await EntitiSekolahModel.findById(id).lean()
  if (!doc) {
    req.log.warn({ id }, 'schools:get:not-found')
    return reply.code(404).send({ message: 'School not found' })
  }
  req.log.info({ id }, 'schools:get:success')
  reply.send(doc)
}

// the function is to list all schools within the radius
export async function getNearbySchools(req: FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>, reply: FastifyReply) {
  //validation
  const latitudeParam = getSingleQueryParam(req, 'latitude')
  if (latitudeParam.error) return reply.code(latitudeParam.error.status).send({ message: latitudeParam.error.message })
  const longitudeParam = getSingleQueryParam(req, 'longitude')
  if (longitudeParam.error) return reply.code(longitudeParam.error.status).send({ message: longitudeParam.error.message })
  const radiusInMeterParam = getSingleQueryParam(req, 'radiusInMeter')
  if (radiusInMeterParam.error) return reply.code(radiusInMeterParam.error.status).send({ message: radiusInMeterParam.error.message })

  const latitudeParsed = parseNumberParam(req, 'latitude', latitudeParam.value)
  if (latitudeParsed.error) return reply.code(latitudeParsed.error.status).send({ message: latitudeParsed.error.message })
  const longitudeParsed = parseNumberParam(req, 'longitude', longitudeParam.value)
  if (longitudeParsed.error) return reply.code(longitudeParsed.error.status).send({ message: longitudeParsed.error.message })
  const radiusInMeterParsed = parseNumberParam(req, 'radiusInMeter', radiusInMeterParam.value)
  if (radiusInMeterParsed.error) return reply.code(radiusInMeterParsed.error.status).send({ message: radiusInMeterParsed.error.message })

  const longitude = longitudeParsed.value
  const latitude = latitudeParsed.value
  const radiusInMeter = radiusInMeterParsed.value

  const longitudeRange = validateLongitudeRange(req, longitude)
  if ('error' in longitudeRange) {
    return reply.code(longitudeRange.error.status).send({ message: longitudeRange.error.message })
  }
  const latitudeRange = validateLatitudeRange(req, latitude)
  if ('error' in latitudeRange) {
    return reply.code(latitudeRange.error.status).send({ message: latitudeRange.error.message })
  }

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
      req.log.info({ latitude, longitude, radiusInMeter }, 'schools:nearby:no-results')
      return reply.code(200).send({ message: 'No schools found within the specified radius.', data: [] })
    }

    const data = foundSchools.map(school => ({
      kodSekolah: school.kodSekolah,
      location: [school.data.infoLokasi.location?.coordinates[0], school.data.infoLokasi.location?.coordinates[1]],
    }))

    reply.send(data)
  } catch (error) {
    req.log.error({ err: error }, 'schools:getNearby:error')
    reply.code(500).send({ message: 'Failed to fetch nearby schools. Please check your coordinates and try again.' })
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function getSchoolsSearchSuggestion(req: FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>, reply: FastifyReply) {
  const { namaSekolah, negeri, jenis } = req.query
  const schools = await EntitiSekolahModel.find({
    ...(namaSekolah ? { namaSekolah: { $regex: escapeRegExp(namaSekolah), $options: 'i' } } : {}),
    ...(negeri ? { 'data.infoPentadbiran.negeri': negeri } : {}),
    ...(jenis ? { 'data.infoSekolah.jenisLabel': { $regex: escapeRegExp(jenis), $options: 'i' } } : {}),
  }).lean()
  req.log.info(
    {
      count: Array.isArray(schools) ? schools.length : undefined,
      filters: { namaSekolah, negeri, jenis },
    },
    'schools:search',
  )
  reply.send(schools)
}
