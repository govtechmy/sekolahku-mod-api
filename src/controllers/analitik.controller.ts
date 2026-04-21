import type { FastifyReply, FastifyRequest } from 'fastify'
import { AnalitikSekolahModel, DatasetStatusModel } from 'src/models'
import type { FilterSchoolTypeWithPeringkatQuery } from 'src/schemas/analitik/response.schema'
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
    fileVersion: dataset?.fileVersion ?? null,
  }

  const response = createSuccessResponse(data)
  return res.send(response)
}

export async function getFilterSchoolTypeWithPeringkat(req: FastifyRequest<{ Querystring: FilterSchoolTypeWithPeringkatQuery }>, res: FastifyReply) {
  const { peringkat } = req.query

  const result = await AnalitikSekolahModel.findOne().lean()
  if (!result) {
    const errResponse = createErrorResponse('Analitik data not found', 'ERR_404', 404)
    return res.status(404).send(errResponse)
  }

  const jenisLabel = result.data.jenisLabel

  if (!peringkat) {
    const data = jenisLabel.map((item) => ({
      jenis: item.jenis,
      peringkatBreakdown: item.peringkatBreakdown,
    }))
    return res.send(createSuccessResponse(data))
  }

  const filtered = jenisLabel
    .filter((item) => item.peringkatBreakdown?.some((pb) => pb.peringkat === peringkat))
    .map((item) => ({
      jenis: item.jenis,
      peringkatBreakdown: item.peringkatBreakdown?.filter((pb) => pb.peringkat === peringkat) ?? [],
    }))

  return res.send(createSuccessResponse(filtered))
}