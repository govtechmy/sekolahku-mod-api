import { z } from 'zod'

export const authHeaderSchema = z.object({
  'api-key': z.string().min(1, 'API key is required'),
})

export type AuthHeader = z.infer<typeof authHeaderSchema>
