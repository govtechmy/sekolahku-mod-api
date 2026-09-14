import type { FastifyReply, FastifyRequest } from 'fastify'
import { AnalitikSekolahModel, DatasetStatusModel, SekolahModel } from 'src/models'
import type { FilterSchoolTypeWithPeringkatQuery } from 'src/schemas/analitik/response.schema'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getAnalitikData(req: FastifyRequest, res: FastifyReply) {
  const result = await AnalitikSekolahModel.findOne().lean()
  if (!result) {
    const errResponse = createErrorResponse('Analitik data not found', 'ERR_404', 404)
    return res.status(404).send(errResponse)
  }

  // School count per state, highest first. Prefer the precomputed breakdown on
  // the analitik doc (kept consistent with jumlahSekolah); only live-count the
  // Sekolah collection as a fallback for docs generated before this field.
  let taburanNegeri = result.data?.taburanNegeri ?? []
  if (taburanNegeri.length === 0) {
    const taburanNegeriRaw = await SekolahModel.aggregate<{ _id: string; total: number }>([
      { $match: { negeri: { $ne: null } } },
      { $group: { _id: '$negeri', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ])
    taburanNegeri = taburanNegeriRaw.map(({ _id, total }) => ({ negeri: _id, total }))
  }

  const dataset = await DatasetStatusModel.findOne().lean()
  const data = {
    ...result,
    data: {
      ...result.data,
      taburanNegeri,
    },
    lastUpdatedAt: dataset?.lastUpdatedAt ?? new Date(),
    fileVersion: dataset?.fileVersion ?? null,
  }

  const response = createSuccessResponse(data)
  return res.send(response)
}

export async function getFilterSchoolTypeWithPeringkat(
  req: FastifyRequest<{ Querystring: FilterSchoolTypeWithPeringkatQuery }>,
  res: FastifyReply,
) {
  const { peringkat } = req.query

  const result = await AnalitikSekolahModel.findOne().lean()
  if (!result) {
    const errResponse = createErrorResponse('Analitik data not found', 'ERR_404', 404)
    return res.status(404).send(errResponse)
  }

  const jenisLabel = result.data.jenisLabel

  if (!peringkat) {
    const data = jenisLabel.map(item => ({
      jenis: item.jenis,
      peringkatBreakdown: item.peringkatBreakdown,
    }))
    return res.send(createSuccessResponse(data))
  }

  const filtered = jenisLabel
    .filter(item => item.peringkatBreakdown?.some(pb => pb.peringkat === peringkat))
    .map(item => ({
      jenis: item.jenis,
      peringkatBreakdown: item.peringkatBreakdown?.filter(pb => pb.peringkat === peringkat) ?? [],
    }))

  return res.send(createSuccessResponse(filtered))
}
