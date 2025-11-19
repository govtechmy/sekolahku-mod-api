import { z } from 'zod'

export const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+.+$/),
})

export type AuthHeader = z.infer<typeof authHeaderSchema>
