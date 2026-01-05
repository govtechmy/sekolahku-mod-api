import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { MalaysiaPolygonModel } from 'src/models'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import { SystemConfigModel } from 'src/models/system-config.model'

import { getFindNearby } from '../src/controllers/map.controller'
import { createSchool, getSchoolById, getSchoolsSearchSuggestion, listSchools } from '../src/controllers/schools.controller'
import type { CreateSchoolBody, GetNearbySchoolByLocation, ListSchoolsSearchQuery } from '../src/schemas'
import { mockedModel, mockQuery, mockQueryOne } from './mock-type'

describe('schools controller', () => {
  beforeEach(() => {
    // Mock DB connection to prevent actual DB calls
    mock.module('../src/config/db.config', () => ({
      payloadConnection: {
        model: mock(() => ({})),
      },
      sekolahkuConnection: {
        model: mock(() => ({})),
      },
    }))

    // Mock env
    mock.module('../src/config/env.config', () => ({
      env: { DATA_URL: 'http://localhost:3000' },
    }))

    // Mock geometry service
    mock.module('../src/services/geometry.svc', () => ({
      returnWithinRadius: mock(schools => schools),
      calculateLocationCenter: mock(() => ({ center: [101.5, 3.1], zoom: 20 })),
      getRadiusFromZoom: mock(() => 0),
      getZoomFromRadius: mock(() => 15),
    }))

    mock.module('../src/controllers/schools.controller', () => ({
      searchByRadius: mock(() => Promise.resolve({})),
      searchByName: mock(() => Promise.resolve({})),
      groupByWestEastMalaysia: mock(() => Promise.resolve({})),
      groupByNegeri: mock(() => Promise.resolve({})),
      groupByParlimen: mock(() => Promise.resolve({})),
    }))

    EntitiSekolahModel.find = mockedModel.find
    EntitiSekolahModel.findOne = mockedModel.findOne
    EntitiSekolahModel.create = mockedModel.create
    EntitiSekolahModel.countDocuments = mockedModel.countDocuments

    MalaysiaPolygonModel.find = mock(() => Promise.resolve({})) as unknown as typeof MalaysiaPolygonModel.findOne
    SystemConfigModel.findOne = mock(() => Promise.resolve({ value: '10000' })) as unknown as typeof SystemConfigModel.findOne
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
      mockedModel.create.mockResolvedValue(mockCreated)

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

  describe('getFindNearby', () => {
    test('should return nearby schools', async () => {
      const mockSchool = {
        kodSekolah: 'BBA8238',
        data: {
          infoLokasi: {
            location: {
              coordinates: [101.508713, 3.088043],
            },
          },
          infoPentadbiran: {
            negeri: 'SELANGOR',
            parlimen: 'SHAH_ALAM',
          },
        },
      }

      mockQuery.lean.mockResolvedValue([mockSchool])

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { latitude: 3.1, longitude: 101.5, radiusInMeter: 10000 },
        log: { error: mock(() => ({})) },
        server: { centroidCache: {} },
      } as unknown as FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>

      await getFindNearby(mockReq, mockReply)

      expect(EntitiSekolahModel.find).toHaveBeenCalledWith({
        'data.infoLokasi.location': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [101.5, 3.1],
            },
            $maxDistance: 10000,
          },
        },
      })
      const expectedResponse = {
        viewInfoLokasi: {
          koordinatXX: 101.5,
          koordinatYY: 3.1,
          zoom: 15,
        },
        markerGroups: [
          {
            markerType: 'INDIVIDUAL',
            infoLokasi: {
              koordinatXX: 101.508713,
              koordinatYY: 3.088043,
            },
            kodSekolah: 'BBA8238',
            dataUrl: 'http://localhost:3000/SELANGOR/SHAH_ALAM/BBA8238/BBA8238.json',
          },
        ],
      }
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: expectedResponse,
      })
    })

    test('should return empty data object if no schools found', async () => {
      mockQuery.lean.mockResolvedValue({})

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { latitude: 3.1, longitude: 101.5, radiusInMeter: 1000 },
        log: { error: mock(() => ({})) },
        server: { centroidCache: {} },
      } as unknown as FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>

      await getFindNearby(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 500,
        data: null,
        error: {
          code: 'ERR_500',
          details: {},
          message: 'Failed to fetch nearby schools. Please check your coordinates and try again.',
        },
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
        server: { centroidCache: {} },
      } as unknown as FastifyRequest<{ Querystring: GetNearbySchoolByLocation }>

      await getFindNearby(mockReq, mockReply)

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
      mockQuery.lean.mockResolvedValue(1)
      mockQuery.lean.mockResolvedValue(mockSchools)
      mockedModel.countDocuments = mock(() => Promise.resolve(1))

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
      mockQuery.lean.mockResolvedValue(1)
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

    test('should return search results with location', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      mockQuery.lean.mockResolvedValue(1)
      mockQuery.lean.mockResolvedValue(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { namaSekolah: 'Test', latitude: 3.1, longitude: 101.5, radiusInMeter: 1000, negeri: 'something' },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.countDocuments).toHaveBeenCalled()
      expect(EntitiSekolahModel.find).toHaveBeenCalled()
      expect(mockReply.send).toHaveBeenCalled()
    })

    test('should handle error', async () => {
      mockQuery.lean.mockRejectedValue(new Error('DB error'))

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
