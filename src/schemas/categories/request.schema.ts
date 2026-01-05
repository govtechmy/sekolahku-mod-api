import z from 'zod'

export const getCategoriesByIdParamsSchema = z.object({
  id: z.string().optional(),
})

export type GetCategoriesByIdParams = z.infer<typeof getCategoriesByIdParamsSchema>
