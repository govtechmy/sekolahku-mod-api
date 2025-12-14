import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { revalidateSchoolEntities } from '../src/controllers/revalidate.controller'
import type { RevalidateParams } from '../src/schemas/revalidate'

describe('revalidate controller', () => {
  beforeEach(() => {
    // Mock the service
    mock.module('../src/services/dataproc.svc', () => ({
      revalidateSchoolEntitiesService: mock(() => Promise.resolve()),
    }))
  })

  describe('revalidateSchoolEntities', () => {
    test('should call revalidate service and return ok', async () => {
      const mockReply = {
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { servicePath: 'test-service' },
      } as FastifyRequest<{ Params: RevalidateParams }>

      await revalidateSchoolEntities(mockReq, mockReply)

      expect(mockReply.send).toHaveBeenCalledWith({ status: 'ok' })
    })

    test('should handle service error', async () => {
      const { revalidateSchoolEntitiesService } = await import('../src/services/dataproc.svc')
      const mockedService = revalidateSchoolEntitiesService as ReturnType<typeof mock>
      mockedService.mockRejectedValue(new Error('Service error'))

      const mockReply = {
        code: mock(() => mockReply),
        send: mock(() => ({})),
      } as unknown as FastifyReply

      const mockReq = {
        params: { servicePath: 'test-service' },
        log: { error: mock(() => ({})) },
      } as unknown as FastifyRequest<{ Params: RevalidateParams }>

      await expect(revalidateSchoolEntities(mockReq, mockReply)).rejects.toThrow('Service error')
    })
  })
})
