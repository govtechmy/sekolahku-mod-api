import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { AcaraModel } from 'src/models'
import type { GetAcaraByIdParams, ListAcarasQuery } from 'src/schemas/acara'
import { ImageService } from 'src/services/image.svc'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getAcaraList(req: FastifyRequest<{ Querystring: ListAcarasQuery }>, rep: FastifyReply) {
  const { search, category, page = 1, pageSize = 12, sortBy, sortOrder } = req.query
  const query: Record<string, unknown> = {}

  if (search?.trim()) {
    const escapedSearch = escapeStringRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  if (category) {
    query.category = category
  }

  const skip = (page - 1) * pageSize
  const acaraList = await AcaraModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  const total = await AcaraModel.countDocuments(query)

  const imageIds = acaraList.map(acara => acara.image).filter(img => img) as string[]
  if (imageIds.length > 0) {
    const imageSvc = new ImageService()
    const imageList = await imageSvc.listImages(imageIds)
    const imageMap = new Map(imageList.map(img => [img._id.toString(), img]))

    acaraList.forEach(acara => {
      if (acara.image) {
        const image = imageMap.get(acara.image.toString())
        Object.assign(acara, { imageHero: image })
      }
    })
  }

  const response = createSuccessResponse({
    items: acaraList,
    totalRecords: total,
    pageNumber: page,
    pageSize,
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

  const acara = await AcaraModel.findById(id).lean()
  if (acara?.image) {
    const imageSvc = new ImageService()
    const imageList = await imageSvc.listImages([acara.image])
    Object.assign(acara, { imageHero: imageList[0] })
  }

  if (!acara) {
    req.log.warn({ id }, 'acara:get:not-found')
    return rep.code(404).send(createErrorResponse('Acara not found', 'ERR_404', 404))
  }

  return rep.send(createSuccessResponse(acara))
}
