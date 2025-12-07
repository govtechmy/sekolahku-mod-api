import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'

import {
  createSchool,
  getNearbySchools,
  getSchoolById,
  getSchoolsSearchSuggestion,
  listSchools,
} from '../src/controllers/schools.controller'
import { EntitiSekolahModel } from '../src/models/school.model'
import type { CreateSchoolBody, GetNearbySchoolByLocation, ListSchoolsSearchQuery } from '../src/schemas'

describe('schools controller', () => {
  type MockQueryType = {
    lean: ReturnType<typeof mock>
    skip: ReturnType<typeof mock>
    limit: ReturnType<typeof mock>
  }
  type MockQueryOneType = {
    lean: ReturnType<typeof mock>
  }

  let mockQuery: MockQueryType
  let mockQueryOne: MockQueryOneType

  beforeEach(() => {
    mockQuery = {
      lean: mock(() => Promise.resolve([])),
      skip: mock(() => mockQuery),
      limit: mock(() => mockQuery),
    }
    mockQueryOne = {
      lean: mock(() => Promise.resolve(null)),
    }
    ;(EntitiSekolahModel.find as unknown) = mock(() => mockQuery)
    ;(EntitiSekolahModel.findOne as unknown) = mock(() => mockQueryOne)
    ;(EntitiSekolahModel.create as unknown) = mock(() => Promise.resolve({}))
    ;(EntitiSekolahModel.countDocuments as unknown) = mock(() => Promise.resolve(0))
  })
  describe('listSchools', () => {
    test('should return list of schools', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      mockQuery.lean.mockResolvedValue(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {} as FastifyRequest

      await listSchools(mockReq, mockReply)

      expect(EntitiSekolahModel.find).toHaveBeenCalledWith()
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: mockSchools,
      })
    })
  })

  describe('createSchool', () => {
    test('should create a school and return 201', async () => {
      const mockBody: CreateSchoolBody = { kodSekolah: '001', namaSekolah: 'New School' } as CreateSchoolBody
      const mockCreated = { ...mockBody, _id: '123' }
      ;(EntitiSekolahModel.create as ReturnType<typeof mock>).mockResolvedValue(mockCreated)

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        body: mockBody,
      } as FastifyRequest<{ Body: CreateSchoolBody }>

      await createSchool(mockReq, mockReply)

      expect(EntitiSekolahModel.create).toHaveBeenCalledWith(mockBody)
      expect(mockReply.code).toHaveBeenCalledWith(201)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 201,
        data: mockCreated,
      })
    })
  })

  describe('getSchoolById', () => {
    test('should return school if found', async () => {
      const mockSchool = { kodSekolah: '001', namaSekolah: 'Test School' }
      mockQueryOne.lean.mockResolvedValue(mockSchool)

      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '001' },
        log: { warn: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Params: { id: string } }>

      await getSchoolById(mockReq, mockReply)

      expect(EntitiSekolahModel.findOne).toHaveBeenCalledWith({ kodSekolah: '001' })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: mockSchool,
      })
    })

    test('should return 404 if school not found', async () => {
      mockQueryOne.lean.mockResolvedValue(null)

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { id: '001' },
        log: { warn: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Params: { id: string } }>

      await getSchoolById(mockReq, mockReply)

      expect(EntitiSekolahModel.findOne).toHaveBeenCalledWith({ kodSekolah: '001' })
      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 404,
        data: null,
        error: {
          code: 'ERR_404',
          message: 'School not found',
          details: {},
        },
      })
    })
  })

  describe('getNearbySchools', () => {
    test('should return nearby schools', async () => {
      const mockSchools = [
        {
          kodSekolah: '001',
          data: { infoLokasi: { location: { coordinates: [101.5, 3.1] } } },
        },
      ]
      mockQuery.lean.mockResolvedValue(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { latitude: 3.1, longitude: 101.5, radiusInMeter: 1000 },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>

      await getNearbySchools(mockReq, mockReply)

      expect(EntitiSekolahModel.find).toHaveBeenCalledWith({
        'data.infoLokasi.location': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [101.5, 3.1],
            },
            $maxDistance: 1000,
          },
        },
      })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: [{ kodSekolah: '001', location: [101.5, 3.1] }],
      })
    })

    test('should return empty array if no schools found', async () => {
      mockQuery.lean.mockResolvedValue([])

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { latitude: 3.1, longitude: 101.5, radiusInMeter: 1000 },
      } as unknown as FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>

      await getNearbySchools(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: [],
      })
    })

    test('should handle error', async () => {
      mockQuery.lean.mockRejectedValue(new Error('DB error'))

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: { latitude: 3.1, longitude: 101.5, radiusInMeter: 1000 },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>

      await getNearbySchools(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 500,
        data: null,
        error: {
          code: 'ERR_500',
          message: 'Failed to fetch nearby schools. Please check your coordinates and try again.',
          details: {},
        },
      })
    })
  })

  describe('getSchoolsSearchSuggestion', () => {
    test('should return search results without location', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      ;(EntitiSekolahModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)
      mockQuery.lean.mockResolvedValue(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { namaSekolah: 'Test' },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.countDocuments).toHaveBeenCalledWith({
        namaSekolah: { $regex: 'Test', $options: 'i' },
      })
      expect(EntitiSekolahModel.find).toHaveBeenCalledWith({ namaSekolah: { $regex: 'Test', $options: 'i' } })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockSchools,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 25,
        },
      })
    })

    test('should return search results with location', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      ;(EntitiSekolahModel.countDocuments as ReturnType<typeof mock>).mockResolvedValue(1)
      mockQuery.lean.mockResolvedValue(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { namaSekolah: 'Test', latitude: 3.1, longitude: 101.5, radiusInMeter: 1000 },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.countDocuments).toHaveBeenCalled()
      expect(EntitiSekolahModel.find).toHaveBeenCalled()
      expect(mockReply.send).toHaveBeenCalled()
    })

    test('should handle error', async () => {
      ;(EntitiSekolahModel.countDocuments as ReturnType<typeof mock>).mockRejectedValue(new Error('DB error'))

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: {},
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 500,
        data: null,
        error: {
          code: 'ERR_500',
          message: 'Failed to fetch school search suggestions. Please try again later.',
          details: {},
        },
      })
    })
  })
})
