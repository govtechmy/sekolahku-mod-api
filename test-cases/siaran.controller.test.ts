import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ArticleMediaModel } from 'src/models/article-media.model'
import { CategoryModel } from 'src/models/category.model'
import { SiaranModel } from 'src/models/siaran.model'

import { getSiaranById, getSiaranList } from '../src/controllers/siaran.controller'
import type { GetSiaranByIdParams, ListSiaransQuery } from '../src/schemas/siaran'
import { mockedModel, mockQuery, mockQueryOne } from './mock-type'

const mockedMoeNewsSvc = {
  refreshMoeNewsIfStale: mock(() => Promise.resolve()),
  getMoeNewsPage: mock((): Promise<Record<string, unknown>[]> => Promise.resolve([])),
  getMoeNewsById: mock((): Promise<Record<string, unknown> | null> => Promise.resolve(null)),
  countMoeNews: mock(() => Promise.resolve(0)),
  buildLexicalContentFromPlainText: mock((text: string) => ({ __mockLexicalFrom: text })),
}

describe('siaran controller', () => {
  beforeEach(() => {
    // Mock DB connection to prevent actual DB calls
    mock.module('../src/config/db.config', () => ({
      payloadConnection: {
        model: mock(() => ({})),
      },
    }))

    // Mock CategoryService
    mock.module('../src/services/category.svc', () => ({
      CategoryService: mock(() => ({
        listCategory: mock(() => Promise.resolve([{ _id: 'mockId', name: 'news' }])),
        searchCategory: mock(() => Promise.resolve([{ value: 'news' }])),
      })),
    }))

    mock.module('src/services/moeNews.svc', () => mockedMoeNewsSvc)
    mockedMoeNewsSvc.refreshMoeNewsIfStale.mockClear()
    mockedMoeNewsSvc.refreshMoeNewsIfStale.mockResolvedValue(undefined)
    mockedMoeNewsSvc.getMoeNewsPage.mockClear()
    mockedMoeNewsSvc.getMoeNewsPage.mockResolvedValue([])
    mockedMoeNewsSvc.getMoeNewsById.mockClear()
    mockedMoeNewsSvc.getMoeNewsById.mockResolvedValue(null)
    mockedMoeNewsSvc.countMoeNews.mockClear()
    mockedMoeNewsSvc.countMoeNews.mockResolvedValue(0)
    mockedMoeNewsSvc.buildLexicalContentFromPlainText.mockClear()

    SiaranModel.find = mockedModel.find
    SiaranModel.findById = mockedModel.findOne
    SiaranModel.countDocuments = mockedModel.countDocuments

    CategoryModel.find = mockedModel.find
    ArticleMediaModel.find = mockedModel.find

    // Reset mocks to default behavior
    mockQuery.lean = mock(() => Promise.resolve([]))
    mockQueryOne.lean = mock(() => Promise.resolve(null))
  })

  describe('getSiaranList', () => {
    test('should return list of siarans', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      mockedModel.countDocuments = mock(() => Promise.resolve(1))

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { page: 1, pageSize: 10 },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(SiaranModel.find).toHaveBeenCalledWith({})
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockSiarans,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('should filter by search (title, description, or date match)', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        // sortBy/sortOrder unset defaults are applied by the zod schema in real
        // requests, so set them explicitly here for the [sortBy] sort key.
        query: { search: 'Test', page: 1, pageSize: 10, sortBy: 'articleDate', sortOrder: 'desc' },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      // Search matching (title/description/date) happens in JS against the
      // full category-filtered candidate set, not as a Mongo query filter.
      expect(SiaranModel.find).toHaveBeenCalledWith({})
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockSiarans,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('matches a Siaran article by its Lexical content description', async () => {
      const mockSiarans = [
        {
          _id: 'mockId',
          title: 'Unrelated title',
          category: 'news',
          content: { root: { children: [{ children: [{ text: 'robotics competition' }] }] } },
        },
      ]
      mockQuery.lean.mockResolvedValue(mockSiarans)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { search: 'robotics', page: 1, pageSize: 10, sortBy: 'articleDate', sortOrder: 'desc' },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ items: mockSiarans, totalRecords: 1 }),
        }),
      )
    })

    test('matches a Siaran article by a date typed in the search box', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'Unrelated title', category: 'news', articleDate: new Date('2026-09-14T03:00:00.000Z') }]
      mockQuery.lean.mockResolvedValue(mockSiarans)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { search: '14/09/2026', page: 1, pageSize: 10, sortBy: 'articleDate', sortOrder: 'desc' },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ items: mockSiarans, totalRecords: 1 }),
        }),
      )
    })

    test('should filter by category', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      mockedModel.countDocuments = mock(() => Promise.resolve(1))

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { category: 'news', page: 1, pageSize: 10 },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(SiaranModel.find).toHaveBeenCalledWith({ category: { $in: ['mockId'] } })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockSiarans,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('merges MOE news into the unfiltered, articleDate-sorted browse view', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'CMS Article', category: 'news', articleDate: new Date('2026-01-10') }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      mockedModel.countDocuments = mock(() => Promise.resolve(1))

      const mockMoeDoc = {
        _id: { toString: () => 'moeId' },
        title: 'MOE Article',
        description: 'MOE article body',
        sourceUrl: 'https://www.moe.gov.my/moe-article',
        datePosted: new Date('2026-01-15'),
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
        images: [{ url: 'https://moe.gov.my/img.jpg', alt: 'alt' }],
      }
      mockedMoeNewsSvc.getMoeNewsPage.mockResolvedValue([mockMoeDoc])
      mockedMoeNewsSvc.countMoeNews.mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { page: 1, pageSize: 10, sortBy: 'articleDate', sortOrder: 'desc' },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(mockedMoeNewsSvc.refreshMoeNewsIfStale).toHaveBeenCalled()
      expect(mockedMoeNewsSvc.getMoeNewsPage).toHaveBeenCalledWith(0, 10, {})
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: [
            {
              _id: 'moeId',
              createdAt: mockMoeDoc.createdAt,
              updatedAt: mockMoeDoc.updatedAt,
              title: 'MOE Article',
              articleDate: mockMoeDoc.datePosted,
              content: { __mockLexicalFrom: 'MOE article body' },
              source: 'moe',
              sourceUrl: 'https://www.moe.gov.my/moe-article',
              imageHero: { url: 'https://moe.gov.my/img.jpg', alt: 'alt' },
            },
            mockSiarans[0],
          ],
          totalRecords: 2,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('excludes MOE news when a category filter is active, even when sorted by articleDate', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      mockedModel.countDocuments = mock(() => Promise.resolve(1))

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { category: 'news', page: 1, pageSize: 10, sortBy: 'articleDate', sortOrder: 'desc' },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(mockedMoeNewsSvc.refreshMoeNewsIfStale).not.toHaveBeenCalled()
      expect(mockedMoeNewsSvc.getMoeNewsPage).not.toHaveBeenCalled()
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockSiarans,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('still filters MOE news by search and date range instead of excluding it', async () => {
      const mockSiarans = [{ _id: 'mockId', title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      mockedModel.countDocuments = mock(() => Promise.resolve(1))
      mockedMoeNewsSvc.getMoeNewsPage.mockResolvedValue([])
      mockedMoeNewsSvc.countMoeNews.mockResolvedValue(0)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: {
          search: 'Test',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
          page: 1,
          pageSize: 10,
          sortBy: 'articleDate',
          sortOrder: 'desc',
        },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(mockedMoeNewsSvc.refreshMoeNewsIfStale).toHaveBeenCalled()
      expect(mockedMoeNewsSvc.getMoeNewsPage).toHaveBeenCalledWith(0, 10, {
        datePosted: { $gte: new Date('2026-01-01'), $lte: new Date('2026-01-31') },
        $or: [{ title: { $regex: 'Test', $options: 'i' } }, { description: { $regex: 'Test', $options: 'i' } }],
      })
      expect(mockedMoeNewsSvc.countMoeNews).toHaveBeenCalledWith({
        datePosted: { $gte: new Date('2026-01-01'), $lte: new Date('2026-01-31') },
        $or: [{ title: { $regex: 'Test', $options: 'i' } }, { description: { $regex: 'Test', $options: 'i' } }],
      })
    })
  })

  describe('getSiaranById', () => {
    test('should return siaran if found', async () => {
      const mockSiaran = { _id: '507f1f77bcf86cd799439011', title: 'Test Siaran', category: 'news' }
      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => ({
          send: mock(() => ({})),
        })),
      } as unknown as FastifyReply
      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
        log: { warn: mock(() => ({})) },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Params: GetSiaranByIdParams }>

      mockQueryOne.lean.mockResolvedValue(mockSiaran)

      await getSiaranById(mockReq, mockReply)

      expect(SiaranModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: mockSiaran,
      })
    })

    test('falls back to the MOE article when not found in Siaran', async () => {
      const mockMoeArticle = {
        _id: { toString: () => '507f1f77bcf86cd799439099' },
        title: 'MOE Article',
        description: 'MOE article body',
        sourceUrl: 'https://www.moe.gov.my/moe-article',
        datePosted: new Date('2026-01-15'),
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
        images: [
          { url: 'https://moe.gov.my/img1.jpg', alt: 'first' },
          { url: 'https://moe.gov.my/img2.jpg', alt: 'second' },
        ],
      }
      mockedMoeNewsSvc.getMoeNewsById.mockResolvedValue(mockMoeArticle)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => ({
          send: mock(() => ({})),
        })),
      } as unknown as FastifyReply
      const mockReq = {
        params: { id: '507f1f77bcf86cd799439099' },
        log: { warn: mock(() => ({})) },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Params: GetSiaranByIdParams }>

      mockQueryOne.lean.mockResolvedValue(null)

      await getSiaranById(mockReq, mockReply)

      expect(mockedMoeNewsSvc.getMoeNewsById).toHaveBeenCalledWith('507f1f77bcf86cd799439099')
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          _id: '507f1f77bcf86cd799439099',
          createdAt: mockMoeArticle.createdAt,
          updatedAt: mockMoeArticle.updatedAt,
          title: 'MOE Article',
          articleDate: mockMoeArticle.datePosted,
          content: { __mockLexicalFrom: 'MOE article body' },
          source: 'moe',
          sourceUrl: 'https://www.moe.gov.my/moe-article',
          imageHero: { url: 'https://moe.gov.my/img1.jpg', alt: 'first' },
          images: [
            { url: 'https://moe.gov.my/img1.jpg', alt: 'first' },
            { url: 'https://moe.gov.my/img2.jpg', alt: 'second' },
          ],
        },
      })
    })

    test('should return 400 if id is missing', async () => {
      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: {},
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Params: GetSiaranByIdParams }>

      await getSiaranById(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 400,
        data: null,
        error: {
          code: 'ERR_400',
          message: 'Siaran ID is required',
          details: {},
        },
      })
    })

    test('should return 400 if id is invalid', async () => {
      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: 'invalid' },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Params: GetSiaranByIdParams }>

      await getSiaranById(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 400,
        data: null,
        error: {
          code: 'ERR_400',
          message: 'Invalid Siaran ID format',
          details: {},
        },
      })
    })

    test('should return 404 if siaran not found', async () => {
      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
        log: { warn: mock(() => ({})) },
        server: { categoriesCache: [{ _id: 'mockId', name: 'news', value: 'news' }] },
      } as unknown as FastifyRequest<{ Params: GetSiaranByIdParams }>

      await getSiaranById(mockReq, mockReply)

      expect(SiaranModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 404,
        data: null,
        error: {
          code: 'ERR_404',
          message: 'Siaran not found',
          details: {},
        },
      })
    })
  })
})
