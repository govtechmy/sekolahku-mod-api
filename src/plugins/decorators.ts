import type { FastifyInstance } from "fastify";
import type { JwtUserPayload } from "@/types/auth";

// Centralized Fastify decorators and their typings
declare module "fastify" {
  interface FastifyRequest {
    user?: JwtUserPayload;
  }
}

export function registerDecorators(app: FastifyInstance): void {
  app.decorateRequest("user", undefined as unknown as JwtUserPayload | undefined);
}


