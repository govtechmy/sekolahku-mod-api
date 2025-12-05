import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { AcaraModel } from 'src/models'
import type { GetAcaraByIdParams, ListAcarasQuery } from 'src/schemas/acara'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getAcaraList(req: FastifyRequest<{ Querystring: ListAcarasQuery }>, rep: FastifyReply) {
  const { search, category, page, limit, sortBy, sortOrder } = req.query
  const query: Record<string, unknown> = {}

  if (search?.trim()) {
    const escapedSearch = escapeStringRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  if (category) {
    query.category = category
  }

  const skip = (page - 1) * limit
  const acaraList = await AcaraModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  return rep.send(createSuccessResponse(acaraList))
}

export async function getAcaraById(req: FastifyRequest<{ Params: GetAcaraByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.code(400).send(createErrorResponse('Acara ID is required', 'ERR_400', 400))
  }

  const acara = await AcaraModel.findById(id).lean()

  if (!acara) {
    req.log.warn({ id }, 'acara:get:not-found')
    return rep.code(404).send(createErrorResponse('Acara not found', 'ERR_404', 404))
  }

  if (!Types.ObjectId.isValid(id)) {
    return rep.code(400).send(createErrorResponse('Invalid Acara ID format', 'ERR_400', 400))
  }

  return rep.send(createSuccessResponse(acara))
}
