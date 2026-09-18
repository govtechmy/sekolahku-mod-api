import type { Siaran, SiaranContent } from '@types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { Types } from 'mongoose'
import { SiaranModel } from 'src/models'
import type { GetSiaranByIdParams, ListSiaransQuery } from 'src/schemas/siaran'
import type { ArticleCategory, SiaranListItem } from 'src/schemas/siaran/response.schema'
import { AttachmentService } from 'src/services/attachment.svc'
import { ImageService } from 'src/services/image.svc'
import {
  buildLexicalContentFromPlainText,
  countMoeNews,
  getMoeNewsById,
  getMoeNewsPage,
  refreshMoeNewsIfStale,
} from 'src/services/moeNews.svc'
import { extractLexicalPlainText } from 'src/utils/lexicalText.utils'
import { escapeStringRegex } from 'src/utils/regex.utils'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'
import { parseSearchDateRange } from 'src/utils/searchDate.utils'

export async function getSiaranList(req: FastifyRequest<{ Querystring: ListSiaransQuery }>, rep: FastifyReply) {
  const { search, category, page = 1, pageSize = 12, sortBy, sortOrder, startDate, endDate } = req.query
  const query: Record<string, unknown> = {}
  const cachedCategories = req.server.categoriesCache
  const categoryMap = new Map(cachedCategories.filter(cat => cat._id).map(cat => [cat._id!.toString(), cat] as const))

  // Search matches title, description, or a date typed in the search box
  // (dd/mm/yyyy, dd-mm-yyyy, or yyyy-mm-dd). Siaran (CMS) content has no
  // stored plain-text field - only a Lexical tree - so its description match
  // is done in JS below via extractLexicalPlainText, not pushed into `query`.
  const trimmedSearch = search?.trim()
  const searchTestRegex = trimmedSearch ? new RegExp(escapeStringRegex(trimmedSearch), 'i') : null
  const searchMongoRegex = trimmedSearch ? { $regex: escapeStringRegex(trimmedSearch), $options: 'i' } : undefined
  const searchDateRange = trimmedSearch ? parseSearchDateRange(trimmedSearch) : null

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

  // MOE news is synced locally (see moeNews.svc), so search/date filters can
  // run against it same as Siaran. Category is Siaran-only taxonomy though,
  // so a category filter can never match a MOE article - exclude MOE then.
  // MOE's `description` is a plain field, so it's matched at the DB level.
  const moeQuery: Record<string, unknown> = {}
  if (Object.keys(dateQuery).length > 0) {
    moeQuery.datePosted = dateQuery
  }
  if (trimmedSearch) {
    const moeOr: Record<string, unknown>[] = [{ title: searchMongoRegex }, { description: searchMongoRegex }]
    if (searchDateRange) moeOr.push({ datePosted: searchDateRange })
    moeQuery.$or = moeOr
  }

  const hasCategoryFilter = Boolean(category && category.length > 3)
  const includeMoe = !hasCategoryFilter && sortBy === 'articleDate'

  const skip = (page - 1) * pageSize

  // Matches a Siaran (CMS) doc against the search term: title text, the
  // Lexical content walked into plain text, or a date typed in the box.
  // ponytail: full-collection JS scan per search request (no stored
  // plaintext/index for content) - move to an indexed excerpt field if the
  // Siaran collection grows large enough for this to matter.
  const matchesSearch = (doc: { title?: string; content?: SiaranContent; articleDate?: Date }): boolean => {
    if (searchTestRegex) {
      if (doc.title && searchTestRegex.test(doc.title)) return true
      if (searchTestRegex.test(extractLexicalPlainText(doc.content))) return true
    }
    if (searchDateRange && doc.articleDate) {
      const time = new Date(doc.articleDate).getTime()
      if (time >= searchDateRange.$gte.getTime() && time <= searchDateRange.$lte.getTime()) return true
    }
    return false
  }

  let queryResult: (Siaran & { _id: Types.ObjectId; __v: number })[]
  let total: number
  if (trimmedSearch) {
    const candidates = await SiaranModel.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .lean()
    const matched = candidates.filter(matchesSearch)
    total = matched.length
    queryResult = includeMoe ? matched.slice(0, skip + pageSize) : matched.slice(skip, skip + pageSize)
  } else {
    const sortedSiaranQuery = SiaranModel.find(query).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    queryResult = includeMoe
      ? await sortedSiaranQuery.limit(skip + pageSize).lean()
      : await sortedSiaranQuery.skip(skip).limit(pageSize).lean()
    total = await SiaranModel.countDocuments(query)
  }

  const siaranList: SiaranListItem[] = []
  queryResult.forEach(siaran => {
    const item = {
      _id: siaran._id.toString(),
      createdAt: siaran.createdAt,
      updatedAt: siaran.updatedAt,
      title: siaran.title,
      image: siaran.image?.toString(),
      articleDate: siaran.articleDate,
      content: siaran.content,
      category: siaran.category.toString(),
      __v: siaran.__v,
    } as SiaranListItem

    if (siaran.attachments && siaran.attachments.length > 0) {
      item.attachments = siaran.attachments.map(att => ({
        ...att,
        image: att.image?.toString(),
        file: att.file?.toString(),
      }))
    }

    if (item.category) {
      const categoryDetails = categoryMap.get(item.category)
      if (categoryDetails) {
        item.categoryInfo = {
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

  const imageSvc = new ImageService()
  const attachmentSvc = new AttachmentService()

  const imageIds = siaranList.map(siaran => siaran.image).filter(img => img) as string[]
  const attachmentIds = siaranList.flatMap(siaran => siaran.attachments?.map(att => att.file) || []).filter(img => img) as string[]

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
    const attachmentImages = await attachmentSvc.listFiles(attachmentIds)
    const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

    siaranList.forEach(siaran => {
      if (siaran.attachments && siaran.attachments.length > 0) {
        siaran.attachments.forEach(att => {
          if (att.file) {
            const attImage = attachmentImageMap.get(att.file.toString())
            Object.assign(att, { ...attImage })
            att.file = att.file.toString()
          }
        })
      }
    })
  }

  let items: SiaranListItem[] = siaranList

  if (includeMoe) {
    await refreshMoeNewsIfStale().catch(err => req.log.error({ err }, 'moe-news:sync-failed'))

    const moeDocs = await getMoeNewsPage(0, skip + pageSize, moeQuery)
    const moeItems: SiaranListItem[] = moeDocs.map(doc => ({
      _id: doc._id.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      title: doc.title,
      articleDate: doc.datePosted,
      content: buildLexicalContentFromPlainText(doc.description),
      source: 'moe',
      sourceUrl: doc.sourceUrl,
      imageHero: doc.images?.[0],
    }))

    items = [...siaranList, ...moeItems]
      .sort((a, b) => new Date(b.articleDate ?? 0).getTime() - new Date(a.articleDate ?? 0).getTime())
      .slice(skip, skip + pageSize)

    total += await countMoeNews(moeQuery)
  }

  const response = createSuccessResponse({
    items,
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
    const moeArticle = await getMoeNewsById(id)

    if (!moeArticle) {
      req.log.warn({ id }, 'siaran:get:not-found')
      return rep.code(404).send(createErrorResponse('Siaran not found', 'ERR_404', 404))
    }

    const moeItem: SiaranListItem = {
      _id: moeArticle._id.toString(),
      createdAt: moeArticle.createdAt,
      updatedAt: moeArticle.updatedAt,
      title: moeArticle.title,
      articleDate: moeArticle.datePosted,
      content: buildLexicalContentFromPlainText(moeArticle.description),
      source: 'moe',
      sourceUrl: moeArticle.sourceUrl,
      imageHero: moeArticle.images?.[0],
      images: moeArticle.images,
    }

    return rep.send(createSuccessResponse(moeItem))
  }

  const imageSvc = new ImageService()
  const attachmentSvc = new AttachmentService()

  const cachedCategories = req.server.categoriesCache
  const categoryMap = new Map(cachedCategories.filter(cat => cat._id).map(cat => [cat._id!.toString(), cat] as const))

  const item: SiaranListItem = {
    _id: siaran._id.toString(),
    createdAt: siaran.createdAt,
    updatedAt: siaran.updatedAt,
    title: siaran.title,
    image: siaran.image?.toString(),
    articleDate: siaran.articleDate,
    content: siaran.content,
    category: siaran.category.toString(),
    __v: siaran.__v,
  }

  if (siaran.attachments && siaran.attachments.length > 0) {
    item.attachments = siaran.attachments.map(att => ({
      ...att,
      image: att.image?.toString(),
      file: att.file?.toString(),
    }))
  }

  if (item.category) {
    const categoryDetails = categoryMap.get(item.category)
    if (categoryDetails) {
      item.categoryInfo = {
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
    const attachmentIds = item.attachments.map(att => att.file).filter(img => img) as string[]
    if (attachmentIds.length > 0) {
      const attachmentImages = await attachmentSvc.listFiles(attachmentIds)
      const attachmentImageMap = new Map(attachmentImages.map(img => [img._id.toString(), img]))

      item.attachments.forEach(att => {
        if (att.file) {
          const attImage = attachmentImageMap.get(att.file.toString())
          if (attImage) {
            Object.assign(att, { ...attImage })
            att.file = att.file.toString()
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
