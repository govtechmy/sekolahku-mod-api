import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { SiaranModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import type { ArticleCategory, SiaranListItem } from 'src/schemas/siaran/response.schema'
import { ImageService } from 'src/services/image.svc'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getSiaranList(req: FastifyRequest<{ Querystring: ListSiaransQuery }>, rep: FastifyReply) {
  const { search, category, page = 1, pageSize = 12, sortBy, sortOrder, startDate, endDate } = req.query
  const query: Record<string, unknown> = {}
  const cachedCategories = req.server.categoriesCache
  const categoryMap = new Map(cachedCategories.filter(cat => cat._id).map(cat => [cat._id!.toString(), cat] as const))

  // Search in title field only
  if (search?.trim()) {
    const escapedSearch = escapeStringRegex(search.trim())
    query.title = { $regex: escapedSearch, $options: 'i' }
  }

  if (category && category.length > 3) {
    const matchedCategories = cachedCategories.filter(cat => cat.value && cat.value.toLowerCase().includes(category.toLowerCase()))
    if (matchedCategories.length > 0) {
      query.category = { $in: matchedCategories.map(cat => cat._id) }
    }
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
  const queryResult = await SiaranModel.find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(pageSize)
    .lean()

  const siaranList: SiaranListItem[] = []
  queryResult.forEach(siaran => {
    const item = {
      _id: siaran._id.toString(),
      createdAt: siaran.createdAt,
      updatedAt: siaran.updatedAt,
      title: siaran.title,
      image: siaran.image?.toString(),
      readTime: siaran.readTime,
      articleDate: siaran.articleDate,
      content: siaran.content,
      category: siaran.category.toString(),
      __v: siaran.__v,
    } as SiaranListItem

    if (siaran.attachments && siaran.attachments.length > 0) {
      item.attachments = siaran.attachments.map(att => ({
        ...att,
        image: att.image?.toString(),
      }))
    }

    if (item.category) {
      const categoryDetails = categoryMap.get(item.category)
      if (categoryDetails) {
        item.categoryDetails = {
          _id: categoryDetails._id.toString(),
          name: categoryDetails.name,
          value: categoryDetails.value,
          colors: categoryDetails.colors,
          createdAt: categoryDetails.createdAt,
          updatedAt: categoryDetails.updatedAt,
        }
      }
    }

    siaranList.push(item)
  })

  const total = await SiaranModel.countDocuments(query)
  const imageSvc = new ImageService()

  const imageIds = siaranList.map(siaran => siaran.image).filter(img => img) as string[]
  const attachmentIds = siaranList.flatMap(siaran => siaran.attachments?.map(att => att.image) || []).filter(img => img) as string[]

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
    pageSize: pageSize,
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

  const siaran = await SiaranModel.findById(id).lean()

  if (!siaran) {
    req.log.warn({ id }, 'siaran:get:not-found')
    return rep.code(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
  }

  const imageSvc = new ImageService()
  const cachedCategories = req.server.categoriesCache
  const categoryMap = new Map(cachedCategories.filter(cat => cat._id).map(cat => [cat._id!.toString(), cat] as const))

  const item: SiaranListItem = {
    _id: siaran._id.toString(),
    createdAt: siaran.createdAt,
    updatedAt: siaran.updatedAt,
    title: siaran.title,
    image: siaran.image?.toString(),
    readTime: siaran.readTime,
    articleDate: siaran.articleDate,
    content: siaran.content,
    category: siaran.category.toString(),
    __v: siaran.__v,
  }

  if (siaran.attachments && siaran.attachments.length > 0) {
    item.attachments = siaran.attachments.map(att => ({
      ...att,
      image: att.image?.toString(),
    }))
  }

  if (item.category) {
    const categoryDetails = categoryMap.get(item.category)
    if (categoryDetails) {
      item.categoryDetails = {
        _id: categoryDetails._id.toString(),
        name: categoryDetails.name,
        value: categoryDetails.value,
        colors: categoryDetails.colors,
        createdAt: categoryDetails.createdAt,
        updatedAt: categoryDetails.updatedAt,
      }
    }
  }

  if (siaran.image) {
    const imageList = await imageSvc.listImages([siaran.image.toString()])
    if (imageList.length > 0) {
      Object.assign(item, { imageHero: imageList[0] })
    }
  }

  if (item.attachments && item.attachments.length > 0) {
    const attachmentIds = item.attachments.map(att => att.image).filter(img => img) as string[]
    if (attachmentIds.length > 0) {
      const attachmentImages = await imageSvc.listImages(attachmentIds)
      const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

      item.attachments.forEach(att => {
        if (att.image) {
          const attImage = attachmentImageMap.get(att.image.toString())
          if (attImage) {
            Object.assign(att, { ...attImage })
          }
        }
      })
    }
  }

  return rep.send(createSuccessResponse(item))
}

export async function getSiaranCategories(req: FastifyRequest, rep: FastifyReply) {
  const cachedCategories = req.server.categoriesCache
  const categories: ArticleCategory[] = []

  cachedCategories.forEach(cat => {
    const item = {
      _id: cat._id.toString(),
      name: cat.name,
      value: cat.value,
      colors: cat.colors,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    } as ArticleCategory

    categories.push(item)
  })

  return rep.send(createSuccessResponse(categories))
}
