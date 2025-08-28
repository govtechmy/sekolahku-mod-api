import type { FastifyReply, FastifyRequest } from "fastify";
import { DocumentModel } from "../models/document.model";
import type { CreateDocumentBody } from "@/types/schema";

export async function listDocuments(req: FastifyRequest, reply: FastifyReply) {
  const documents = await DocumentModel.find().lean();
  req.log.info({ count: Array.isArray(documents) ? documents.length : undefined }, "documents:list");
  reply.send(documents);
}

export async function createDocument(req: FastifyRequest<{ Body: CreateDocumentBody }>, reply: FastifyReply) {
  const { title, content, tags, url } = req.body;
  const user = req.user as { userId?: string } | undefined;
  const create = await DocumentModel.create({
    title,
    content,
    tags,
    createdBy: user?.userId,
    isApproved: false,
    url,
  });
  req.log.info({ documentId: create.id }, "documents:create:success");
  reply.code(201).send(create);
}

export async function getDocumentById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = req.params;
  const doc = await DocumentModel.findById(id).lean();
  if (!doc) {
    req.log.warn({ id }, "documents:get:not-found");
    return reply.code(404).send({ message: "Document not found" });
  }
  req.log.info({ id }, "documents:get:success");
  reply.send(doc);
}


