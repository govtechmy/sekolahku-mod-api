import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { SiaranModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import { CategoryService } from 'src/services/category.svc'
import { ImageService } from 'src/services/image.svc'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getSiaranList(req: FastifyRequest<{ Querystring: ListSiaransQuery }>, rep: FastifyReply) {
  const { search, category, page = 1, pageSize = 12, sortBy, sortOrder, startDate, endDate } = req.query
  const categorySvc = new CategoryService()
  const query: Record<string, unknown> = {}

  // Search in title field only
  if (search?.trim()) {
    const escapedSearch = escapeStringRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  if (category) {
    const categoryIds = await categorySvc.searchCategory(category)
    if (categoryIds.length > 0) query.category = { $in: categoryIds.map(cat => cat._id) }
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
  const siaranList = await SiaranModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  const total = await SiaranModel.countDocuments(query)
  const imageSvc = new ImageService()

  const imageIds = siaranList.map(siaran => siaran.image).filter(img => img) as string[]
  const attachmentIds = siaranList.flatMap(siaran => siaran.attachments?.map(att => att.image) || []).filter(img => img) as string[]

  const categoryIds = siaranList.map(siaran => siaran.category.toString()).filter(cat => cat) as string[]
  if (categoryIds.length > 0) {
    const categoryList = await categorySvc.listCategory(categoryIds)
    const categoryMap = new Map(categoryList.map(cat => [cat._id.toString(), cat]))

    siaranList.forEach(siaran => {
      if (siaran.category) {
        const category = categoryMap.get(siaran.category.toString())
        Object.assign(siaran, { categoryInfo: category })
      }
    })
  }

  if (imageIds.length > 0) {
    const imageList = await imageSvc.listImages(imageIds)
    const imageMap = new Map(imageList.map(img => [img._id.toString(), img]))

    siaranList.forEach(siaran => {
      if (siaran.image) {
        const image = imageMap.get(siaran.image.toString())
        Object.assign(siaran, { imageHero: image })
      }
    })
  }

  if (attachmentIds.length > 0) {
    const attachmentImages = await imageSvc.listImages(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    siaranList.forEach(siaran => {
      if (siaran.attachments && siaran.attachments.length > 0) {
        siaran.attachments.forEach(att => {
          if (att.image) {
            const attImage = attachmentImageMap.get(att.image.toString())
            Object.assign(att, { ...attImage })
          }
        })
      }
    })
  }

  const response = createSuccessResponse({
    items: siaranList,
    totalRecords: total,
    pageNumber: page,
    pageSize,
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

  const imageSvc = new ImageService()
  const categorySvc = new CategoryService()
  const siaran = await SiaranModel.findById(id).lean()

  if (!siaran) {
    req.log.warn({ id }, 'siaran:get:not-found')
    return rep.code(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
  }

  if (siaran?.image) {
    const imageList = await imageSvc.listImages([siaran.image])
    Object.assign(siaran, { imageHero: imageList[0] })
  }

  if (siaran?.attachments && siaran?.attachments?.length > 0) {
    const attachmentIds = siaran.attachments.map(att => att.image).filter(img => img) as string[]
    const attachmentImages = await imageSvc.listImages(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    siaran.attachments.forEach(att => {
      if (att.image) {
        const attImage = attachmentImageMap.get(att.image.toString())
        Object.assign(att, { ...attImage })
      }
    })
  }

  if (siaran?.category) {
    const categoryList = await categorySvc.listCategory([siaran.category.toString()])
    if (categoryList.length > 0) {
      Object.assign(siaran, { categoryInfo: categoryList[0] })
    }
  }

  return rep.send(createSuccessResponse(siaran))
}
