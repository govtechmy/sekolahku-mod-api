import type { FastifyReply, FastifyRequest } from 'fastify'

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  //eslint-disable-next-line no-console
  console.debug(req, reply)
  return true
}
