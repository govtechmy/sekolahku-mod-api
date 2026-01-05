import { z } from 'zod'

// Schema for querying siaran by ID
export const getSiaranByIdParamsSchema = z.object({
  id: z.string().optional(),
})

export type GetSiaranByIdParams = z.infer<typeof getSiaranByIdParamsSchema>

// Schema for listing siarans with optional filters
export const listSiaransQuerySchema = z.object({
  search: z.string().optional(), // Search in title field
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(12),
  sortBy: z.enum(['articleDate', 'createdAt', 'updatedAt', 'title']).default('articleDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type ListSiaransQuery = z.infer<typeof listSiaransQuerySchema>

// Schema for creating a new siaran (if needed in the future)
export const createSiaranBodySchema = z.object({
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

export type CreateSiaranBody = z.infer<typeof createSiaranBodySchema>

// Schema for updating an existing siaran (if needed in the future)
export const updateSiaranBodySchema = createSiaranBodySchema.partial()

export type UpdateSiaranBody = z.infer<typeof updateSiaranBodySchema>
