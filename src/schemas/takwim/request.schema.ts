import { z } from 'zod'

export const getTakwimByIdParamsSchema = z.object({
  id: z.string().optional(),
})

export type GetTakwimByIdParams = z.infer<typeof getTakwimByIdParamsSchema>

// Schema for listing takwims with optional filters
export const listTakwimsQuerySchema = z
  .object({
    search: z.string().optional(), // Search in title field
    category: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(12),
    sortBy: z.enum(['articleDate', 'createdAt', 'updatedAt', 'title']).default('articleDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(({ startDate, endDate }) => !startDate || !endDate || endDate >= startDate, {
    message: 'endDate must be >= startDate',
  })

export type ListTakwimsQuery = z.infer<typeof listTakwimsQuerySchema>

// Schema for creating a new takwim (if needed in the future)
export const createTakwimBodySchema = z.object({
  title: z.string().optional(),
  image: z.string().optional(),
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

export type CreateTakwimBody = z.infer<typeof createTakwimBodySchema>

// Schema for updating an existing takwim (if needed in the future)
export const updateTakwimBodySchema = createTakwimBodySchema.partial()

export type UpdateTakwimBody = z.infer<typeof updateTakwimBodySchema>
