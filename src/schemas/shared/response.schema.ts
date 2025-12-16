import { RESPONSE_STATUS } from '@types'
import z from 'zod'

export const standardListResponseSchema = z.object({
  items: z.array(z.any()),
  totalRecords: z.number(),
  pageNumber: z.number(),
  pageSize: z.number(),
})

export const errorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string(), z.any()).optional(),
})

export const standardResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS),
  statusCode: z.number(),
  data: z.union([standardListResponseSchema, z.any()]).optional(),
})

export const standardErrorResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.ERROR),
  statusCode: z.number(),
  data: z.null().optional(),
  error: errorResponseSchema.optional(),
})
