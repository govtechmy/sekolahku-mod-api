import { timingSafeEqual } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { env } from '../config/env.config'

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const apiKey = req.headers['sekolahku-x-api-key'] as string

  if (!apiKey) {
    req.log.warn({ path: req.url }, 'auth:missing-api-key')
    return reply.code(401).send({ message: 'Missing API key' })
  }

  let isValid = false

  try {
    isValid = timingSafeEqual(Buffer.from(apiKey), Buffer.from(env.API_KEY))
  } catch {
    isValid = false
  }

  if (!isValid) {
    req.log.warn({ path: req.url }, 'auth:invalid-api-key')
    return reply.code(401).send({ message: 'Invalid API key' })
  }

  req.log.debug({ path: req.url }, 'auth:valid-api-key')
  return true
}
