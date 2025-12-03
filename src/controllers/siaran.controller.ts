import type { FastifyReply, FastifyRequest } from 'fastify'
import { SiaranModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

// Utility function to escape special characters in regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function getSiaranList(req: FastifyRequest<{ Querystring: ListSiaransQuery }>, rep: FastifyReply) {
  const { search } = req.query
  const query: Record<string, unknown> = {}

  // Search in title field only
  if (search?.trim()) {
    const escapedSearch = escapeRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  const siaranList = await SiaranModel.find(query).lean()
  return rep.send(createSuccessResponse(siaranList))
}

export async function getSiaranById(req: FastifyRequest<{ Params: GetSiaranByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.status(400).send(createErrorResponse('Siaran ID is required', 'ERR_400', 400))
  }

  const siaran = await SiaranModel.findById(id).lean()

  if (!siaran) {
    return rep.status(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
  }

  return rep.send(createSuccessResponse(siaran))
}
