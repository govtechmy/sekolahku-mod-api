import type { FastifyInstance } from "fastify";
import { login, refresh, logout } from "../controllers/auth.controller";
import type { LoginBody } from "@/types/auth";
import { loginBodySchema, refreshBodySchema } from "@/types/schema";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>("/auth/login", { schema: { body: loginBodySchema, tags: ["Auth"], summary: "Login with credentials" } }, login);
  app.post("/auth/refresh", { schema: { body: refreshBodySchema, tags: ["Auth"], summary: "Refresh access token" } }, refresh);
  app.post("/auth/logout", { schema: { tags: ["Auth"], summary: "Logout user" } }, logout);
}


