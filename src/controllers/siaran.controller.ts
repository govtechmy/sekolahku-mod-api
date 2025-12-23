import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { SiaranModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import type { Siaran } from 'src/types'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'
import { renderContent } from 'src/utils/content.utils'

function processSiaranData(siaran: any, req: FastifyRequest): Siaran {
  let updatedSiaran: Partial<Siaran> = { ...siaran }

  // Handle populated image
  if (siaran.image && typeof siaran.image === 'object' && 'filename' in siaran.image) {
    updatedSiaran.image = (siaran.image as { filename: string }).filename
  } else {
    updatedSiaran.image = typeof siaran.image === 'string' ? siaran.image : ''
  }

  // Handle populated category
  if (siaran.category && typeof siaran.category === 'object' && 'name' in siaran.category) {
    updatedSiaran.category = (siaran.category as { name: string }).name
  } else {
    updatedSiaran.category = typeof siaran.category === 'string' ? siaran.category : ''
  }

  // Handle content rendering
  if (siaran.content) {
    try {
      if (typeof siaran.content === 'object' && 'root' in siaran.content) {
        const renderedContent = renderContent(siaran.content)
        updatedSiaran.content = renderedContent
      } else {
        updatedSiaran.content = siaran.content
      }
    } catch (error) {
      req.log.warn({ siaranId: siaran._id, error }, 'siaran:content:render-failed')
    }
  }

  return updatedSiaran as Siaran
}

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
    .populate('image', 'filename')
    .populate('category', 'name')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const populatedSiaranList = siaranList.map((siaran) => processSiaranData(siaran, req))

  const total = await SiaranModel.countDocuments(query)

  const response = createSuccessResponse({
    items: populatedSiaranList,
    totalRecords: total,
    pageNumber: page,
    pageSize: limit,
  })

  return rep.send(response)
}

export async function getSiaranById(req: FastifyRequest<{ Params: GetSiaranByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.code(400).send(createErrorResponse('Siaran ID is required', 'ERR_400', 400))
  }

  if (!Types.ObjectId.isValid(id)) {
    return rep.code(400).send(createErrorResponse('Invalid Siaran ID format', 'ERR_400', 400))
  }

  const siaran = await SiaranModel.findById(id)
    .populate('image', 'filename')
    .populate('category', 'name')
    .lean()

  if (!siaran) {
    req.log.warn({ id }, 'siaran:get:not-found')
    return rep.code(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
  }

  const populatedSiaran = processSiaranData(siaran, req)

  return rep.send(createSuccessResponse(populatedSiaran))
}
