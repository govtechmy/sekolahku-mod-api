import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { SiaranModel, SiaranAttachmentModel, SiaranCategoryModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import type { Siaran } from 'src/types'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'
import { renderContent } from 'src/utils/content.utils'

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

  const populatedSiaranList = await Promise.all(
    siaranList.map(async (siaran): Promise<Siaran> => {
      let updatedSiaran: Partial<Siaran> = {
        ...siaran,
        image: typeof siaran.image === 'string' ? siaran.image : '',
        category: typeof siaran.category === 'string' ? siaran.category : ''
      }

      if (siaran.image) {
        try {
          const imageData = await SiaranAttachmentModel.findById(siaran.image).lean()
          if (imageData) {
            updatedSiaran.image = imageData.filename
          }
        } catch (error) {
          req.log.warn({ imageId: siaran.image, error }, 'siaran:image:lookup-failed')
        }
      }

      if (siaran.category) {
        try {
          const categoryData = await SiaranCategoryModel.findById(siaran.category).lean()
          if (categoryData) {
            updatedSiaran.category = categoryData.name
          }
        } catch (error) {
          req.log.warn({ categoryId: siaran.category, error }, 'siaran:category:lookup-failed')
        }
      }

      if (siaran.content) {
        try {
          if (siaran.content && typeof siaran.content === 'object' && 'root' in siaran.content) {
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
    })
  )

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

  const siaran = await SiaranModel.findById(id).lean()

  if (!siaran) {
    req.log.warn({ id }, 'siaran:get:not-found')
    return rep.code(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
  }

  let populatedSiaran: Partial<Siaran> = {
    ...siaran,
    image: typeof siaran.image === 'string' ? siaran.image : '',
    category: typeof siaran.category === 'string' ? siaran.category : ''
  }

  if (siaran.image) {
    try {
      const imageData = await SiaranAttachmentModel.findById(siaran.image).lean()
      if (imageData) {
        populatedSiaran.image = imageData.filename
      }
    } catch (error) {
      req.log.warn({ imageId: siaran.image, error }, 'siaran:image:lookup-failed')
    }
  }

  if (siaran.category) {
    try {
      const categoryData = await SiaranCategoryModel.findById(siaran.category).lean()
      if (categoryData) {
        populatedSiaran.category = categoryData.name
      }
    } catch (error) {
      req.log.warn({ categoryId: siaran.category, error }, 'siaran:category:lookup-failed')
    }
  }

  if (siaran.content) {
    try {
      if (siaran.content && typeof siaran.content === 'object' && 'root' in siaran.content) {
        const renderedContent = renderContent(siaran.content)
        populatedSiaran.content = renderedContent
      } else {
        populatedSiaran.content = siaran.content
      }
    } catch (error) {
      req.log.warn({ siaranId: siaran._id, error }, 'siaran:content:render-failed')
    }
  }

  return rep.send(createSuccessResponse(populatedSiaran as Siaran))
}
