import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { AcaraModel } from 'src/models'
import type { GetAcaraByIdParams, ListAcarasQuery } from 'src/schemas/acara'
import type { Acara } from 'src/types'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'
import { renderContent } from 'src/utils/content.utils'

function processAcaraData(acara: any, req: FastifyRequest): Acara {
  let updatedAcara: Partial<Acara> = { ...acara }

  if (acara.image && typeof acara.image === 'object' && 'filename' in acara.image) {
    updatedAcara.image = (acara.image as { filename: string }).filename
  } else {
    updatedAcara.image = typeof acara.image === 'string' ? acara.image : ''
  }

  if (acara.category && typeof acara.category === 'object' && 'name' in acara.category) {
    updatedAcara.category = (acara.category as { name: string }).name
  } else {
    updatedAcara.category = typeof acara.category === 'string' ? acara.category : ''
  }

  if (acara.content) {
    try {
      if (typeof acara.content === 'object' && 'root' in acara.content) {
        const renderedContent = renderContent(acara.content)
        updatedAcara.content = renderedContent
      } else {
        updatedAcara.content = acara.content
      }
    } catch (error) {
      req.log.warn({ acaraId: acara._id, error }, 'acara:content:render-failed')
    }
  }

  return updatedAcara as Acara
}

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
    .populate('image', 'filename')
    .populate('category', 'name')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const populatedAcaraList = acaraList.map((acara) => processAcaraData(acara, req))

  const total = await AcaraModel.countDocuments(query)

  const response = createSuccessResponse({
    items: populatedAcaraList,
    totalRecords: total,
    pageNumber: page,
    pageSize: limit,
  })

  return rep.send(response)
}

export async function getAcaraById(req: FastifyRequest<{ Params: GetAcaraByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.code(400).send(createErrorResponse('Acara ID is required', 'ERR_400', 400))
  }

  if (!Types.ObjectId.isValid(id)) {
    return rep.code(400).send(createErrorResponse('Invalid Acara ID format', 'ERR_400', 400))
  }

  const acara = await AcaraModel.findById(id)
    .populate('image', 'filename')
    .populate('category', 'name')
    .lean()

  if (!acara) {
    req.log.warn({ id }, 'acara:get:not-found')
    return rep.code(404).send(createErrorResponse('Acara not found', 'ERR_404', 404))
  }

  const populatedAcara = processAcaraData(acara, req)

  return rep.send(createSuccessResponse(populatedAcara))
}
