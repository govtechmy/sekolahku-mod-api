import type { FastifyReply, FastifyRequest } from "fastify";
import { SchoolModel } from "../models/school.model";
import type { CreateSchoolBody } from "@/types/schema";

export async function listSchools(req: FastifyRequest, reply: FastifyReply) {
  const schools = await SchoolModel.find().lean();
  req.log.info({ count: Array.isArray(schools) ? schools.length : undefined }, "schools:list");
  reply.send(schools);
}

export async function createSchool(req: FastifyRequest<{ Body: CreateSchoolBody }>, reply: FastifyReply) {
  const payload = req.body;
  const created = await SchoolModel.create(payload);
  req.log.info({ code: created.code, id: created.id }, "schools:create:success");
  reply.code(201).send(created);
}

export async function getSchoolById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = req.params;
  const doc = await SchoolModel.findById(id).lean();
  if (!doc) {
    req.log.warn({ id }, "schools:get:not-found");
    return reply.code(404).send({ message: "School not found" });
  }
  req.log.info({ id }, "schools:get:success");
  reply.send(doc);
}


