import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { getAnalitikData } from 'src/controllers/analitik.controller'
import { AnalitikSekolahModel, DatasetStatusModel } from 'src/models'
import { EntitiSekolahModel } from 'src/models/entiti-sekolah.model'

import { mockedModel, mockQueryOne } from './mock-type'

describe('analitik controller', () => {
  beforeEach(() => {
    // Mock DB connection to prevent actual DB calls
    mock.module('../src/config/db.config', () => ({
      sekolahkuConnection: {
        model: mock(() => ({})),
      },
    }))

    AnalitikSekolahModel.findOne = mockedModel.findOne
    DatasetStatusModel.findOne = mockedModel.findOne
    EntitiSekolahModel.aggregate = mockedModel.aggregate
    mockedModel.aggregate.mockClear()
  })

  describe('getAnalitikData', () => {
    test('should return analitik data', async () => {
      const taburanNegeri = [{ negeri: 'SELANGOR', total: 10 }]
      const mockAnalitikData = {
        jumlahSekolah: 100,
        jumlahGuru: 500,
        jumlahPelajar: 2000,
        data: { jenisLabel: [], bantuan: [], taburanNegeri },
        lastUpdatedAt: new Date(),
      }
      mockQueryOne.lean.mockResolvedValue(mockAnalitikData)

      const mockReply = {
        send: mock(() => ({})),
        status: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {} as FastifyRequest

      await getAnalitikData(mockReq, mockReply)

      expect(AnalitikSekolahModel.findOne).toHaveBeenCalled()
      expect(DatasetStatusModel.findOne).toHaveBeenCalled()
      // Uses the precomputed data.taburanNegeri (no live Sekolah aggregation).
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          ...mockAnalitikData,
          data: { ...mockAnalitikData.data, taburanNegeri },
          fileVersion: null,
        },
      })
    })

    test('should live-count taburanNegeri from EntitiSekolah when not precomputed', async () => {
      const mockAnalitikData = {
        jumlahSekolah: 100,
        jumlahGuru: 500,
        jumlahPelajar: 2000,
        data: { jenisLabel: [], bantuan: [] },
        lastUpdatedAt: new Date(),
      }
      mockQueryOne.lean.mockResolvedValue(mockAnalitikData)
      mockedModel.aggregate.mockResolvedValueOnce([
        { _id: 'JOHOR', total: 60 },
        { _id: 'PERAK', total: 40 },
      ])

      const mockReply = {
        send: mock(() => ({})),
        status: mock(() => mockReply),
      } as unknown as FastifyReply

      await getAnalitikData({} as FastifyRequest, mockReply)

      // Groups by the nested EntitiSekolah field, not the raw Sekolah collection's top-level negeri.
      const pipeline = mockedModel.aggregate.mock.calls[0]?.[0] as Record<string, unknown>[]
      expect(pipeline).toContainEqual({ $group: { _id: '$data.infoPentadbiran.negeri', total: { $sum: 1 } } })
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          ...mockAnalitikData,
          data: {
            ...mockAnalitikData.data,
            taburanNegeri: [
              { negeri: 'JOHOR', total: 60 },
              { negeri: 'PERAK', total: 40 },
            ],
          },
          fileVersion: null,
        },
      })
    })

    test('should return 404 when analitik data not found', async () => {
      mockQueryOne.lean.mockResolvedValue(null)

      const mockReply = {
        send: mock(() => ({})),
        status: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {} as FastifyRequest

      await getAnalitikData(mockReq, mockReply)

      expect(AnalitikSekolahModel.findOne).toHaveBeenCalled()
      expect(DatasetStatusModel.findOne).toHaveBeenCalled()
      expect(mockReply.status).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ERROR',
        statusCode: 404,
        data: null,
        error: {
          message: 'Analitik data not found',
          code: 'ERR_404',
          details: {},
        },
      })
    })
  })
})
