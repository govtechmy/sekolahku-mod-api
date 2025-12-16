import type { FastifyReply, FastifyRequest } from 'fastify'
import { AnalitikSekolahModel } from 'src/models'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getAnalitikData(req: FastifyRequest, res: FastifyReply) {
  const result = await AnalitikSekolahModel.findOne().lean()
  if (!result) {
    const errResponse = createErrorResponse('Analitik data not found', 'ERR_404', 404)
    return res.status(404).send(errResponse)
  }

  const response = createSuccessResponse(result)
  return res.send(response)
}
