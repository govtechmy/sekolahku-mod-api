import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { SiaranModel } from 'src/models/siaran.model'

import { getSiaranById, getSiaranList } from '../src/controllers/siaran.controller'
import type { GetSiaranByIdParams, ListSiaransQuery } from '../src/schemas/siaran'

describe('siaran controller', () => {
  type MockQueryType = {
    lean: ReturnType<typeof mock>
    skip: ReturnType<typeof mock>
    limit: ReturnType<typeof mock>
    sort: ReturnType<typeof mock>
  }

  let mockQuery: MockQueryType

  beforeEach(() => {
    // Mock DB connection to prevent actual DB calls
    mock.module('../src/config/db.config', () => ({
      payloadConnection: {
        model: mock(() => ({})),
      },
    }))

    mockQuery = {
      lean: mock(() => Promise.resolve([])),
      skip: mock(() => mockQuery),
      limit: mock(() => mockQuery),
      sort: mock(() => mockQuery),
    }
    ;(SiaranModel.find as unknown) = mock(() => mockQuery)
    ;(SiaranModel.findById as unknown) = mock(() => ({
      lean: mock(() => Promise.resolve(null)),
    }))
    ;(SiaranModel.countDocuments as unknown) = mock(() => Promise.resolve(0))
  })

  describe('getSiaranList', () => {
    test('should return list of siarans', async () => {
      const mockSiarans = [{ title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      ;(SiaranModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { page: 1, limit: 10 },
      } as FastifyRequest<{ Querystring: ListSiaransQuery }>

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

    test('should filter by search', async () => {
      const mockSiarans = [{ title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      ;(SiaranModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { search: 'Test', page: 1, limit: 10 },
      } as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(SiaranModel.find).toHaveBeenCalledWith({ title: { $regex: 'Test', $options: 'i' } })
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

    test('should filter by category', async () => {
      const mockSiarans = [{ title: 'Test Siaran', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockSiarans)
      ;(SiaranModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { category: 'news', page: 1, limit: 10 },
      } as FastifyRequest<{ Querystring: ListSiaransQuery }>

      await getSiaranList(mockReq, mockReply)

      expect(SiaranModel.find).toHaveBeenCalledWith({ category: 'news' })
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
  })

  describe('getSiaranById', () => {
    test('should return siaran if found', async () => {
      const mockSiaran = { title: 'Test Siaran', category: 'news' }
      ;(SiaranModel.findById as ReturnType<typeof mock>).mockReturnValue({
        lean: mock(() => Promise.resolve(mockSiaran)),
      })

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
      } as unknown as FastifyRequest<{ Params: GetSiaranByIdParams }>

      await getSiaranById(mockReq, mockReply)

      expect(SiaranModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: mockSiaran,
      })
    })

    test('should return 400 if id is missing', async () => {
      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: {},
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
      ;(SiaranModel.findById as ReturnType<typeof mock>).mockReturnValue({
        lean: mock(() => Promise.resolve(null)),
      })

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
        log: { warn: mock(() => ({})) },
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
