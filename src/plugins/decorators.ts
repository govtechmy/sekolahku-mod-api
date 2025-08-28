import type { FastifyInstance } from "fastify";
import type { JwtUserPayload } from "@/types/auth";
import type { Types } from "mongoose";
import type { DocumentEntity } from "@/types/schema";

// Centralized Fastify decorators and their typings
declare module "fastify" {
  interface FastifyRequest {
    user?: JwtUserPayload;
    document?: RequestDocument;
  }
}

export type RequestDocument = (DocumentEntity & { _id: Types.ObjectId });

export function registerDecorators(app: FastifyInstance): void {
  app.decorateRequest("user", undefined as unknown as JwtUserPayload | undefined);
  app.decorateRequest("document", undefined as unknown as RequestDocument | undefined);
}


