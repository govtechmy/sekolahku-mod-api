import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { getAnalitikData } from 'src/controllers/analitik.controller'
import { AnalitikSekolahModel, DatasetStatusModel } from 'src/models'

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
  })

  describe('getAnalitikData', () => {
    test('should return analitik data', async () => {
      const mockAnalitikData = { jumlahSekolah: 100, jumlahGuru: 500, jumlahPelajar: 2000, lastUpdatedAt: new Date() }
      mockQueryOne.lean.mockResolvedValue(mockAnalitikData)

      const mockReply = {
        send: mock(() => ({})),
        status: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {} as FastifyRequest

      await getAnalitikData(mockReq, mockReply)

      expect(AnalitikSekolahModel.findOne).toHaveBeenCalled()
      expect(DatasetStatusModel.findOne).toHaveBeenCalled()
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          ...mockAnalitikData,
          lastUpdatedAt: expect.any(Date),
          fileVersion: null,
        },
      })
    })

    test('should return fileVersion from dataset when it exists', async () => {
      const mockAnalitikData = { jumlahSekolah: 100, jumlahGuru: 500, jumlahPelajar: 2000 }
      const mockDatasetData = { lastUpdatedAt: new Date('2026-01-01'), fileVersion: 'v2.5.0' }

      let callCount = 0
      mockQueryOne.lean.mockImplementation(() => {
        callCount++
        return Promise.resolve(callCount === 1 ? mockAnalitikData : mockDatasetData)
      })

      const mockReply = {
        send: mock(() => ({})),
        status: mock(() => mockReply),
      } as unknown as FastifyReply

      const mockReq = {} as FastifyRequest

      await getAnalitikData(mockReq, mockReply)

      expect(AnalitikSekolahModel.findOne).toHaveBeenCalled()
      expect(DatasetStatusModel.findOne).toHaveBeenCalled()
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'SUCCESS',
        statusCode: 200,
        data: {
          ...mockAnalitikData,
          lastUpdatedAt: mockDatasetData.lastUpdatedAt,
          fileVersion: 'v2.5.0',
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
