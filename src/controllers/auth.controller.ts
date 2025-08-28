import type { FastifyReply, FastifyRequest } from "fastify";
import { UserModel } from "../models/user.model";
import type { Role } from "@/types/schema";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import bcrypt from "bcrypt";
import type { LoginBody, RefreshBody, AccessPayload } from "@/types/auth";

// token signing moved to utils/jwt

export async function login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
  const { username, password } = (request.body ?? {}) as LoginBody;
  if (!username || !password) {
    request.log.warn("auth:login:missing-credentials");
    return reply.code(400).send({ message: "username and password are required" });
  }
  request.log.info("auth:login:attempt");

  const user = await UserModel.findOne({ username });
  const isValid = user ? await bcrypt.compare(password, user.password) : false;
  if (!user || !isValid) {
    request.log.warn("auth:login:invalid-credentials");
    return reply.code(401).send({ message: "Invalid credentials" });
  }

  const payload: AccessPayload = { userId: user._id.toString(), idNumber: user.idNumber, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  request.log.info({ userId: payload.userId }, "auth:login:success");
  return reply.send({ accessToken, refreshToken, user: { id: payload.userId, name: user.name, idNumber: user.idNumber, role: user.role } });
}

export async function refresh(request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) {
  const token = request.body?.refreshToken;
  if (!token) {
    request.log.warn("auth:refresh:missing-token");
    return reply.code(400).send({ message: "refreshToken is required" });
  }
  try {
    const decoded = verifyRefreshToken(token) as { userId: string; idNumber: string; role: Role };
    const accessToken = signAccessToken(decoded);
    request.log.info({ userId: decoded.userId }, "auth:refresh:success");
    return reply.send({ accessToken });
  } catch {
    request.log.warn("auth:refresh:invalid-token");
    return reply.code(401).send({ message: "Invalid or expired refresh token" });
  }
}

export async function logout(_request: FastifyRequest, reply: FastifyReply) {
  _request.log.info("auth:logout");
  return reply.code(204).send();
  // we will implement mydigitalID logout mechanism
}


