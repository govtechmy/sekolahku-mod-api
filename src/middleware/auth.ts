import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "@/types/schema";
import type { JwtUserPayload } from "@/types/auth";
import { verifyAccessToken } from "../utils/jwt";

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers["authorization"] ?? "";
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  if (!token) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  try {
    const decoded = verifyAccessToken(token) as JwtUserPayload;
    req.user = decoded;
  } catch {
    return reply.code(401).send({ message: "Invalid or expired token" });
  }
}

export function requireRole(required: Role) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as JwtUserPayload | undefined;
    if (!user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    if (user.role !== required) {
      return reply.code(403).send({ message: `Forbidden: requires role ${required}` });
    }
  };
}


