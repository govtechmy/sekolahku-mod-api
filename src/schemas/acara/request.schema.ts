import { z } from 'zod'

// Schema for querying acara by ID
export const getAcaraByIdParamsSchema = z.object({
  id: z.string().optional(),
})

export type GetAcaraByIdParams = z.infer<typeof getAcaraByIdParamsSchema>

// Schema for listing acaras with optional filters
export const listAcarasQuerySchema = z.object({
  search: z.string().optional(), // Search in title field
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(12),
  sortBy: z.enum(['articleDate', 'createdAt', 'updatedAt', 'title']).default('articleDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type ListAcarasQuery = z.infer<typeof listAcarasQuerySchema>

// Schema for creating a new acara (if needed in the future)
export const createAcaraBodySchema = z.object({
  title: z.string().optional(),
  image: z.string().optional(),
  readTime: z.number().int().positive().optional(),
  articleDate: z.coerce.date().optional(),
  attachments: z
    .array(
      z.object({
        image: z.string().optional(),
      }),
    )
    .optional(),
  content: z
    .object({
      root: z.any(), // Flexible Lexical content structure
    })
    .optional(),
  category: z.string().optional(),
})

export type CreateAcaraBody = z.infer<typeof createAcaraBodySchema>

// Schema for updating an existing acara (if needed in the future)
export const updateAcaraBodySchema = createAcaraBodySchema.partial()

export type UpdateAcaraBody = z.infer<typeof updateAcaraBodySchema>
