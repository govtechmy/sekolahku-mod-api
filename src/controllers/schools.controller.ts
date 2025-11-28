import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ListSchoolsSearchQuery } from 'src/schemas/schools/request.schema'

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

export async function getSchoolsSearchSuggestion(req: FastifyRequest, reply: FastifyReply) {
  const { namaSekolah, negeri, jenis } = req.query as ListSchoolsSearchQuery
  const schools = await EntitiSekolahModel.find({
    ...(namaSekolah ? { namaSekolah: { $regex: namaSekolah, $options: 'i' } } : {}),
    ...(negeri ? { 'data.infoPentadbiran.negeri': { $regex: negeri, $options: 'i' } } : {}),
    ...(jenis ? { 'data.infoSekolah.jenisLabel': { $regex: jenis, $options: 'i' } } : {}),
  }).lean()
  // if (!schools || schools.length === 0) {
  //   req.log.warn({ schools }, 'schools:get:not-found')
  //   return reply.code(404).send({ message: 'School not found' })
  // }
  req.log.info(
    {
      count: Array.isArray(schools) ? schools.length : undefined,
      filters: { namaSekolah, negeri, jenis },
    },
    'schools:search',
  )
  reply.send(schools)
}
