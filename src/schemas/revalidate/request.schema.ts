import { z } from 'zod'

export const revalidateRequestSchema = z.object({})

export const revalidateParamsSchema = z.object({
  servicePath: z.string().min(1, 'Service path is required'),
})

export const revalidateResponseSchema = z.object({
  status: z.literal('ok'),
})

export type RevalidateRequest = z.infer<typeof revalidateRequestSchema>
export type RevalidateParams = z.infer<typeof revalidateParamsSchema>
export type RevalidateResponse = z.infer<typeof revalidateResponseSchema>
