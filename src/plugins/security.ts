import type { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import { env } from "../config/env";

export async function registerSecurityPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  if (isProduction) {
    await app.register(fastifyCors, { origin: env.FRONTEND_ORIGIN! });
  } else {
    await app.register(fastifyCors, { origin: true });
  }
  await app.register(fastifyHelmet);
}


