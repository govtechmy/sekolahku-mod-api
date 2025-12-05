import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { SiaranModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getSiaranList(req: FastifyRequest<{ Querystring: ListSiaransQuery }>, rep: FastifyReply) {
  const { search, category, page, limit, sortBy, sortOrder } = req.query
  const query: Record<string, unknown> = {}

  // Search in title field only
  if (search?.trim()) {
    const escapedSearch = escapeStringRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  if (category) {
    query.category = category
  }

  const skip = (page - 1) * limit
  const siaranList = await SiaranModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  return rep.send(createSuccessResponse(siaranList))
}

export async function getSiaranById(req: FastifyRequest<{ Params: GetSiaranByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.code(400).send(createErrorResponse('Siaran ID is required', 'ERR_400', 400))
  }

  if (!Types.ObjectId.isValid(id)) {
    return rep.code(400).send(createErrorResponse('Invalid Siaran ID format', 'ERR_400', 400))
  }

  const siaran = await SiaranModel.findById(id).lean()

  if (!siaran) {
    req.log.warn({ id }, 'siaran:get:not-found')
    return rep.code(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
  }

  return rep.send(createSuccessResponse(siaran))
}
