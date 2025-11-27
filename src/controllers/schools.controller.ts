import type { FastifyReply, FastifyRequest } from 'fastify'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'

import type { CreateSchoolBody } from '@/schemas'

import { EntitiSekolahModel } from '../models/school.model'

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
  const { latitude, longitude, radiusInMeter } = req.query
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
  const data = foundSchools.map(school => ({
    kodSekolah: school.kodSekolah,
    location: school.data.infoLokasi.location,
  }))
  reply.send(data)
}

// give mongodb central point = current location
// 2nd params is find nearest school within the cental point radius
// get a list of the school within the radius

//todo: create a controller
// get info from the user -- radius and coordinate of location
// use this coordinate and find the radius of the available school in the radius using mongodb
// return the list of available school based on the nearest radius [[school code , coordinate]],
