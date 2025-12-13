import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AcaraModel } from 'src/models/acara.model'

import { getAcaraById, getAcaraList } from '../src/controllers/acara.controller'
import type { GetAcaraByIdParams, ListAcarasQuery } from '../src/schemas/acara'

describe('acara controller', () => {
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
    ;(AcaraModel.find as unknown) = mock(() => mockQuery)
    ;(AcaraModel.findById as unknown) = mock(() => ({
      lean: mock(() => Promise.resolve(null)),
    }))
    ;(AcaraModel.countDocuments as unknown) = mock(() => Promise.resolve(0))
  })

  describe('getAcaraList', () => {
    test('should return list of acaras', async () => {
      const mockAcaras = [{ title: 'Test Acara', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockAcaras)
      ;(AcaraModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { page: 1, limit: 10 },
      } as FastifyRequest<{ Querystring: ListAcarasQuery }>

      await getAcaraList(mockReq, mockReply)

      expect(AcaraModel.find).toHaveBeenCalledWith({})
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockAcaras,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('should filter by search', async () => {
      const mockAcaras = [{ title: 'Test Acara', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockAcaras)
      ;(AcaraModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { search: 'Test', page: 1, limit: 10 },
      } as FastifyRequest<{ Querystring: ListAcarasQuery }>

      await getAcaraList(mockReq, mockReply)

      expect(AcaraModel.find).toHaveBeenCalledWith({ title: { $regex: 'Test', $options: 'i' } })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockAcaras,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })

    test('should filter by category', async () => {
      const mockAcaras = [{ title: 'Test Acara', category: 'news' }]
      mockQuery.lean.mockResolvedValue(mockAcaras)
      ;(AcaraModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { category: 'news', page: 1, limit: 10 },
      } as FastifyRequest<{ Querystring: ListAcarasQuery }>

      await getAcaraList(mockReq, mockReply)

      expect(AcaraModel.find).toHaveBeenCalledWith({ category: 'news' })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockAcaras,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 10,
        },
      })
    })
  })

  describe('getAcaraById', () => {
    test('should return acara if found', async () => {
      const mockAcara = { title: 'Test Acara', category: 'news' }
      ;(AcaraModel.findById as ReturnType<typeof mock>).mockReturnValue({
        lean: mock(() => Promise.resolve(mockAcara)),
      })

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
      } as unknown as FastifyRequest<{ Params: GetAcaraByIdParams }>

      await getAcaraById(mockReq, mockReply)

      expect(AcaraModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: mockAcara,
      })
    })

    test('should return 400 if id is missing', async () => {
      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: {},
      } as unknown as FastifyRequest<{ Params: GetAcaraByIdParams }>

      await getAcaraById(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 400,
        data: null,
        error: {
          code: 'ERR_400',
          message: 'Acara ID is required',
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
      } as unknown as FastifyRequest<{ Params: GetAcaraByIdParams }>

      await getAcaraById(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(400)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 400,
        data: null,
        error: {
          code: 'ERR_400',
          message: 'Invalid Acara ID format',
          details: {},
        },
      })
    })

    test('should return 404 if acara not found', async () => {
      ;(AcaraModel.findById as ReturnType<typeof mock>).mockReturnValue({
        lean: mock(() => Promise.resolve(null)),
      })

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '507f1f77bcf86cd799439011' },
        log: { warn: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Params: GetAcaraByIdParams }>

      await getAcaraById(mockReq, mockReply)

      expect(AcaraModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 404,
        data: null,
        error: {
          code: 'ERR_404',
          message: 'Acara not found',
          details: {},
        },
      })
    })
  })
})
