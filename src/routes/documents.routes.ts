import type { FastifyInstance } from "fastify";
import { createDocument, getDocumentById, listDocuments } from "../controllers/documents.controller";
import { authMiddleware } from "../middleware/auth";
import { createDocumentBodySchema, authHeaderSchema, type CreateDocumentBody } from "@/types/schema";

export async function registerDocumentRoutes(app: FastifyInstance): Promise<void> {

  app.get("/documents", { preHandler: authMiddleware, schema: { headers: authHeaderSchema, tags: ["Documents"], summary: "List documents", security: [{ bearerAuth: [] }] } }, listDocuments);
  
  app.post<{ Body: CreateDocumentBody }>( "/documents",
    { preHandler: [authMiddleware], schema: { headers: authHeaderSchema, body: createDocumentBodySchema, tags: ["Documents"], summary: "Create a document", security: [{ bearerAuth: [] }] } },
    createDocument
  );
  
  app.get<{ Params: { id: string } }>("/documents/:id", { preHandler: authMiddleware, schema: { headers: authHeaderSchema, tags: ["Documents"], summary: "Get document by ID", security: [{ bearerAuth: [] }] } }, getDocumentById);
}


