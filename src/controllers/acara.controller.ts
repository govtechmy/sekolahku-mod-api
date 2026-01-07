import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { AcaraModel } from 'src/models'
import type { GetAcaraByIdParams, ListAcarasQuery } from 'src/schemas/acara'
import { ImageService } from 'src/services/image.svc'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getAcaraList(req: FastifyRequest<{ Querystring: ListAcarasQuery }>, rep: FastifyReply) {
  const { search, category, page = 1, pageSize = 12, sortBy, sortOrder, startDate, endDate } = req.query
  const query: Record<string, unknown> = {}

  if (search?.trim()) {
    const escapedSearch = escapeStringRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  if (category) {
    query.category = category
  }

  const dateQuery: { $gte?: Date; $lte?: Date } = {}
  if (startDate) {
    dateQuery.$gte = new Date(startDate)
  }

  if (endDate) {
    dateQuery.$lte = new Date(endDate)
  }

  if (Object.keys(dateQuery).length > 0) {
    query.articleDate = dateQuery
  }

  const skip = (page - 1) * pageSize
  const acaraList = await AcaraModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  const total = await AcaraModel.countDocuments(query)
  const imageSvc = new ImageService()
  const imageIds = acaraList.map(acara => acara.image).filter(img => img) as string[]
  const attachmentIds = acaraList.flatMap(acr => acr.attachments?.map(att => att.image) || []).filter(img => img) as string[]

  if (imageIds.length > 0) {
    const imageList = await imageSvc.listImages(imageIds)
    const imageMap = new Map(imageList.map(img => [img._id.toString(), img]))

    acaraList.forEach(acara => {
      if (acara.image) {
        const image = imageMap.get(acara.image.toString())
        Object.assign(acara, { imageHero: image })
      }
    })
  }

  if (attachmentIds.length > 0) {
    const attachmentImages = await imageSvc.listImages(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    acaraList.forEach(acr => {
      if (acr.attachments && acr.attachments.length > 0) {
        acr.attachments.forEach(att => {
          if (att.image) {
            const attImage = attachmentImageMap.get(att.image.toString())
            Object.assign(att, { ...attImage })
          }
        })
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

  const imageSvc = new ImageService()
  const acara = await AcaraModel.findById(id).lean()

  if (acara?.image) {
    const imageList = await imageSvc.listImages([acara.image])
    Object.assign(acara, { imageHero: imageList[0] })
  }

  if (acara?.attachments && acara?.attachments?.length > 0) {
    const attachmentIds = acara.attachments.map(att => att.image).filter(img => img) as string[]
    const attachmentImages = await imageSvc.listImages(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    acara.attachments.forEach(att => {
      if (att.image) {
        const attImage = attachmentImageMap.get(att.image.toString())
        Object.assign(att, { ...attImage })
      }
    })
  }

  if (!acara) {
    req.log.warn({ id }, 'acara:get:not-found')
    return rep.code(404).send(createErrorResponse('Acara not found', 'ERR_404', 404))
  }

  return rep.send(createSuccessResponse(acara))
}
