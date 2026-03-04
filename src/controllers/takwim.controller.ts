import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { TakwimModel } from 'src/models'
import type { GetTakwimByIdParams, ListTakwimsQuery } from 'src/schemas/takwim'
import { AttachmentService } from 'src/services/attachment.svc'
import { ImageService } from 'src/services/image.svc'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getTakwimList(req: FastifyRequest<{ Querystring: ListTakwimsQuery }>, rep: FastifyReply) {
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
  const takwimList = await TakwimModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  const imageSvc = new ImageService()
  const attachmentSvc = new AttachmentService()

  const total = await TakwimModel.countDocuments(query)
  const imageIds = takwimList.map(takwim => takwim.image).filter(img => img) as string[]
  const attachmentIds = takwimList.flatMap(tkwm => tkwm.attachments?.map(att => att.file) || []).filter(img => img) as string[]

  if (imageIds.length > 0) {
    const imageList = await imageSvc.listImages(imageIds)
    const imageMap = new Map(imageList.map(img => [img._id.toString(), img]))

    takwimList.forEach(takwim => {
      if (takwim.image) {
        const image = imageMap.get(takwim.image.toString())
        Object.assign(takwim, { imageHero: image })
      }
    })
  }

  if (attachmentIds.length > 0) {
    const attachmentImages = await attachmentSvc.listFiles(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    takwimList.forEach(takwim => {
      if (takwim.attachments && takwim.attachments.length > 0) {
        takwim.attachments.forEach(att => {
          if (att.file) {
            const attImage = attachmentImageMap.get(att.file.toString())
            Object.assign(att, { ...attImage })
            att.file = att.file.toString()
          }
        })
      }
    })
  }

  const response = createSuccessResponse({
    items: takwimList,
    totalRecords: total,
    pageNumber: page,
    pageSize,
  })

  return rep.send(response)
}

export async function getTakwimById(req: FastifyRequest<{ Params: GetTakwimByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.code(400).send(createErrorResponse('Takwim ID is required', 'ERR_400', 400))
  }

  if (!Types.ObjectId.isValid(id)) {
    return rep.code(400).send(createErrorResponse('Invalid Takwim ID format', 'ERR_400', 400))
  }

  const imageSvc = new ImageService()
  const attachmentSvc = new AttachmentService()
  const takwim = await TakwimModel.findById(id).lean()

  if (takwim?.image) {
    const imageList = await imageSvc.listImages([takwim.image])
    Object.assign(takwim, { imageHero: imageList[0] })
  }

  if (takwim?.attachments && takwim?.attachments?.length > 0) {
    const attachmentIds = takwim.attachments.map(att => att.file).filter(img => img) as string[]
    const attachmentImages = await attachmentSvc.listFiles(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    takwim.attachments.forEach(att => {
      if (att.file) {
        const attImage = attachmentImageMap.get(att.file.toString())
        Object.assign(att, { ...attImage })
        att.file = att.file.toString()
      }
    })
  }

  if (!takwim) {
    req.log.warn({ id }, 'takwim:get:not-found')
    return rep.code(404).send(createErrorResponse('Takwim not found', 'ERR_404', 404))
  }

  return rep.send(createSuccessResponse(takwim))
}
