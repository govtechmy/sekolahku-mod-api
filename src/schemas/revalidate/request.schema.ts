import { z } from 'zod'

export const revalidateRequestSchema = z.object({})

export const revalidateResponseSchema = z.object({
  status: z.literal('ok'),
})

export type RevalidateRequest = z.infer<typeof revalidateRequestSchema>
export type RevalidateResponse = z.infer<typeof revalidateResponseSchema>
