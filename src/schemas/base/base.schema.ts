import { RESPONSE_STATUS } from '@types'
import z from 'zod'

export const baseResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS),
  statusCode: z.number(),
})

export const baseListResponseSchema = z.object({
  totalRecords: z.number(),
  pageNumber: z.number(),
  pageSize: z.number(),
})

export const baseUploadResponseSchema = z.object({
  presignedUrl: z.string(),
  s3Url: z.string(),
  baseUrl: z.string(),
})
