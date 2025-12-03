import type { FastifyReply, FastifyRequest } from 'fastify'
import { AcaraModel } from 'src/models'
import type { GetAcaraByIdParams, ListAcarasQuery } from 'src/schemas/acara'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

// Utility function to escape special characters in regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function getAcaraList(req: FastifyRequest<{ Querystring: ListAcarasQuery }>, rep: FastifyReply) {
  const { search } = req.query
  const query: Record<string, unknown> = {}

  // Search in title field only
  if (search?.trim()) {
    const escapedSearch = escapeRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  const acaraList = await AcaraModel.find(query).lean()
  return rep.send(createSuccessResponse(acaraList))
}

export async function getAcaraById(req: FastifyRequest<{ Params: GetAcaraByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.status(400).send(createErrorResponse('Acara ID is required', 'ERR_400', 400))
  }

  const acara = await AcaraModel.findById(id).lean()

  if (!acara) {
    req.log.warn({ id }, 'acara:get:not-found')
    return rep.status(404).send(createErrorResponse('Acara not found', 'ERR_404', 404))
  }

  return rep.send(createSuccessResponse(acara))
}
