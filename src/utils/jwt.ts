import jwt from "jsonwebtoken";
import type { AccessPayload } from "@/types/auth";
import { env } from "../config/env";

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AccessPayload;
  return decoded;
}

export function verifyRefreshToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as AccessPayload;
  return decoded;
}


