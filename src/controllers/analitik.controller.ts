import type { FastifyReply, FastifyRequest } from 'fastify'
import { AnalitikSekolahModel, DatasetStatusModel } from 'src/models'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getAnalitikData(req: FastifyRequest, res: FastifyReply) {
  const result = await AnalitikSekolahModel.findOne().lean()
  if (!result) {
    const errResponse = createErrorResponse('Analitik data not found', 'ERR_404', 404)
    return res.status(404).send(errResponse)
  }

  const dataset = await DatasetStatusModel.findOne().lean()
  const data = {
    ...result,
    lastUpdatedAt: dataset?.lastUpdatedAt ?? new Date(),
  }

  const response = createSuccessResponse(data)
  return res.send(response)
}
