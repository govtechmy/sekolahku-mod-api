import type { Role } from "./schema";

export interface JwtUserPayload {
  userId: string;
  idNumber: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AccessPayload {
  userId: string;
  idNumber: string;
  role: Role;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}


