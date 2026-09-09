import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { MalaysiaPolygonModel } from 'src/models'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'
import { SystemConfigModel } from 'src/models/system-config.model'
import type { GetFilterSchoolTypeQuery } from 'src/schemas/schools/request.schema'

import { getFindNearby } from '../src/controllers/map.controller'
import {
  createSchool,
  getFilterSchoolType,
  getSchoolById,
  getSchoolsSearchSuggestion,
  listSchools,
} from '../src/controllers/schools.controller'
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

    mock.clearAllMocks()
  })

  EntitiSekolahModel.find = mockedModel.find
  EntitiSekolahModel.findOne = mockedModel.findOne
  EntitiSekolahModel.create = mockedModel.create
  EntitiSekolahModel.countDocuments = mockedModel.countDocuments
  EntitiSekolahModel.distinct = mockedModel.distinct
  EntitiSekolahModel.aggregate = mockedModel.aggregate

  MalaysiaPolygonModel.find = mock(() => Promise.resolve({})) as unknown as typeof MalaysiaPolygonModel.findOne
  SystemConfigModel.findOne = mock(() => Promise.resolve({ value: '10000' })) as unknown as typeof SystemConfigModel.findOne

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
      const mockBody: CreateSchoolBody = {
        kodSekolah: '001',
        namaSekolah: 'New School',
      } as CreateSchoolBody
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

      expect(EntitiSekolahModel.findOne).toHaveBeenCalledWith({
        kodSekolah: '001',
      })
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

      expect(EntitiSekolahModel.findOne).toHaveBeenCalledWith({
        kodSekolah: '001',
      })
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
      } as unknown as FastifyRequest<{
        Querystring: GetNearbySchoolByLocation
      }>

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
      } as unknown as FastifyRequest<{
        Querystring: GetNearbySchoolByLocation
      }>

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
      } as unknown as FastifyRequest<{
        Querystring: GetNearbySchoolByLocation
      }>

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

    test('with a name ranks candidates with fuzzball, then aggregates over matched codes', async () => {
      const mockSchool = {
        kodSekolah: 'BBA8238',
        namaSekolah: 'SK Gombak',
        data: {
          infoLokasi: { location: { coordinates: [101.508713, 3.088043] } },
          infoPentadbiran: { negeri: 'SELANGOR', parlimen: 'SHAH_ALAM' },
        },
      }
      // grouping resolves to INDIVIDUAL (getZoomFromRadius mock -> 15). aggregateSchoolsByName
      // fetches the geo/attribute-constrained candidates via find(), ranks them in memory, then
      // aggregates over the matched kodSekolah.
      mockQuery.lean.mockResolvedValueOnce([mockSchool]) // candidate set
      mockedModel.aggregate.mockResolvedValueOnce([mockSchool]) // $match over ranked codes

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: {
          latitude: 3.1,
          longitude: 101.5,
          radiusInMeter: 8000,
          name: 'skm gombak',
          negeri: 'SELANGOR',
          jenis: ['Sekolah Rendah'],
          peringkat: 'RENDAH',
        },
        log: { error: mock(() => ({})) },
        server: { centroidCache: {} },
      } as unknown as FastifyRequest<{
        Querystring: GetNearbySchoolByLocation
      }>

      await getFindNearby(mockReq, mockReply)

      // Candidate query carries the geo radius + dropdown filters.
      const candidateQuery = JSON.stringify(mockedModel.find.mock.calls[0]?.[0])
      expect(candidateQuery).toContain('$geoWithin')
      expect(candidateQuery).toContain('data.infoPentadbiran.negeri')
      expect(candidateQuery).toContain('data.infoSekolah.jenisLabel')
      expect(candidateQuery).toContain('data.infoPentadbiran.peringkat')

      // Ranked codes drive the aggregation's leading $match.
      const pipeline = mockedModel.aggregate.mock.calls[0]?.[0] as Record<string, unknown>[]
      const match = (pipeline[0] as { $match: { kodSekolah: { $in: string[] } } }).$match
      expect(match.kodSekolah.$in).toContain('BBA8238')

      expect(mockReply.send).toHaveBeenCalled()
    })
  })

  describe('getSchoolsSearchSuggestion', () => {
    test('should return search results without location', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      // A text query (no location) ranks candidates with fuzzball: find(candidate set) then
      // find(full docs by matched code).
      mockQuery.lean.mockResolvedValueOnce(mockSchools).mockResolvedValueOnce(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { namaSekolah: 'Test', pageSize: 1 },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.find).toHaveBeenCalledTimes(2)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: mockSchools,
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 1,
        },
      })
    })

    test('should rank candidates with fuzzball for a typo query (bufot -> Beaufort)', async () => {
      const beaufortSchool = {
        kodSekolah: 'XBA6036',
        namaSekolah: 'SEKOLAH KEBANGSAAN PEKAN BEAUFORT',
        namaRingkas: ['SK PEKAN BEAUFORT', 'SKPB'],
        data: {
          infoSekolah: {},
          infoKomunikasi: {
            alamatSurat: 'BEAUFORT',
            bandarSurat: 'BEAUFORT',
          },
          infoPentadbiran: {
            parlimen: 'BEAUFORT',
            negeri: 'SABAH',
          },
          infoLokasi: {
            location: {
              type: 'Point',
              coordinates: [115.7, 5.3],
            },
          },
        },
      }
      // find(candidate set) → fuzzball rank → find(full docs by matched code).
      mockQuery.lean.mockResolvedValueOnce([beaufortSchool]).mockResolvedValueOnce([beaufortSchool])

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { namaSekolah: 'bufot', pageSize: 12 },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.find).toHaveBeenCalledTimes(2)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: [beaufortSchool],
          totalRecords: 1,
          pageNumber: 1,
          pageSize: 12,
        },
      })
    })

    test('should return search results with location', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      // name + geo: aggregate($geoNear) for candidates, then find(full docs by matched code).
      mockedModel.aggregate.mockResolvedValueOnce(mockSchools)
      mockQuery.lean.mockResolvedValueOnce(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: {
          namaSekolah: 'Test',
          latitude: 3.1,
          longitude: 101.5,
          radiusInMeter: 1000,
          pageSize: 1,
        },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.aggregate).toHaveBeenCalledTimes(1)
      expect(mockReply.send).toHaveBeenCalled()
    })

    test('should return search results with location and negeri', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      mockedModel.aggregate.mockResolvedValueOnce(mockSchools)
      mockQuery.lean.mockResolvedValueOnce(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: {
          namaSekolah: 'Test',
          latitude: 3.1,
          longitude: 101.5,
          radiusInMeter: 1000,
          negeri: 'something',
          pageSize: 1,
        },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.aggregate).toHaveBeenCalledTimes(1)
      expect(mockReply.send).toHaveBeenCalled()
    })

    test('should sort by name for geo-only search without text query', async () => {
      const mockSchools = [{ kodSekolah: '001', namaSekolah: 'Test School' }]
      // No text query → regex list path (geo): aggregate($count) then aggregate(data pipeline).
      mockedModel.aggregate.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce(mockSchools)

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { latitude: 3.1, longitude: 101.5, radiusInMeter: 1000 },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      expect(EntitiSekolahModel.aggregate).toHaveBeenCalledTimes(2)
      const dataPipeline = mockedModel.aggregate.mock.calls[1]?.[0] as Record<string, unknown>[]
      expect(JSON.stringify(dataPipeline)).toContain('"$sort":{"namaSekolah":1}')
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

    test('should apply negeri/jenis/peringkat filters to the fuzzy candidate query', async () => {
      // No candidates match → empty result (still exercises the filtered candidate query).
      mockQuery.lean.mockResolvedValueOnce([])

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: {
          namaSekolah: 'skm gombak',
          negeri: 'SELANGOR',
          jenis: ['Sekolah Rendah'],
          peringkat: 'RENDAH',
        },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: ListSchoolsSearchQuery }>

      await getSchoolsSearchSuggestion(mockReq, mockReply)

      const queryStr = JSON.stringify(mockedModel.find.mock.calls[0]?.[0])
      expect(queryStr).toContain('data.infoPentadbiran.negeri')
      expect(queryStr).toContain('data.infoSekolah.jenisLabel')
      expect(queryStr).toContain('data.infoPentadbiran.peringkat')
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          items: [],
          totalRecords: 0,
          pageNumber: 1,
          pageSize: 25,
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

  describe('getFilterSchoolType', () => {
    test('should return list of school types', async () => {
      const mockSchoolTypes = [
        { jenisLabel: 'Sekolah Rendah', peringkats: ['RENDAH'] },
        { jenisLabel: 'Sekolah Menengah', peringkats: ['MENENGAH'] },
        {
          jenisLabel: 'Sekolah Rendah Jenis Kebangsaan (Cina)',
          peringkats: ['RENDAH'],
        },
        {
          jenisLabel: 'Sekolah Rendah Jenis Kebangsaan (Tamil)',
          peringkats: ['RENDAH'],
        },
      ]

      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: { peringkat: 'ALL' },
        log: { error: mock(() => ({})) },
        server: {
          schoolFilterCache: {
            schoolTypes: mockSchoolTypes,
          },
        },
      } as unknown as FastifyRequest<{ Querystring: GetFilterSchoolTypeQuery }>

      await getFilterSchoolType(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: ['Sekolah Rendah', 'Sekolah Menengah', 'Sekolah Rendah Jenis Kebangsaan (Cina)', 'Sekolah Rendah Jenis Kebangsaan (Tamil)'],
      })
    })

    test('should return empty array if no school types found', async () => {
      const mockReply = {
        send: mock(() => ({})),
        code: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {
        query: {},
        log: { error: mock(() => ({})) },
        server: {
          schoolFilterCache: {
            schoolTypes: [],
          },
        },
      } as unknown as FastifyRequest<{ Querystring: GetFilterSchoolTypeQuery }>

      await getFilterSchoolType(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: [],
      })
    })

    test('should handle error and return 500', async () => {
      const mockDistinct = {
        lean: mock(() => Promise.reject(new Error('DB error'))),
      }
      EntitiSekolahModel.distinct = mock(() => mockDistinct) as unknown as typeof EntitiSekolahModel.distinct

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        query: {},
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Querystring: GetFilterSchoolTypeQuery }>

      await getFilterSchoolType(mockReq, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 500,
        data: null,
        error: {
          code: 'ERR_500',
          message: 'Failed to fetch school types. Please try again later.',
          details: {},
        },
      })
    })
  })
})
