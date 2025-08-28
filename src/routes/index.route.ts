import type { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { registerDocumentRoutes } from "./documents.routes";
import { registerAuthRoutes } from "./auth.routes";
import { registerSchoolRoutes } from "./schools.routes";

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", { schema: { tags: ["System"], summary: "Healthcheck" } }, async () => {
    const dbReady = mongoose.connection.readyState === 1;
    return { status: "ok", db: dbReady ? "connected" : "disconnected" };
  });

  await registerDocumentRoutes(app);
  await registerAuthRoutes(app);
  await registerSchoolRoutes(app);
}


