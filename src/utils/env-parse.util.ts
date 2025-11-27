import { z, type ZodType } from 'zod'

export function parseWithSchemaOrThrow<T>(schema: ZodType<T>, source: unknown): T {
  const result = schema.safeParse(source)
  if (!result.success) {
    const flat = z.treeifyError(result.error)
    throw new Error(`Invalid environment configuration: ${JSON.stringify(flat)}`)
  }
  return result.data
}
