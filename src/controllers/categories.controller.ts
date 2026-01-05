import type { GetCategoriesByIdParams } from '@schemas'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { CategoriesModel } from 'src/models/categories.model'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getCategories(req: FastifyRequest, rep: FastifyReply) {
  const categories = await CategoriesModel.find().lean()

  return rep.send(createSuccessResponse(categories))
}

export async function getCategoryById(req: FastifyRequest<{ Params: GetCategoriesByIdParams }>, rep: FastifyReply) {
  const { id } = req.params

  if (!id) {
    return rep.status(400).send(createErrorResponse('Invalid category ID'))
  }

  const category = await CategoriesModel.findById(id).lean()

  if (!category) {
    return rep.status(404).send(createErrorResponse('Category not found'))
  }

  return rep.send(createSuccessResponse(category))
}
