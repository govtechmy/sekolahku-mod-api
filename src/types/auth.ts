import type { Role } from './enum'

export interface JwtUserPayload {
  userId: string
  idNumber: string
  role: Role
  iat?: number
  exp?: number
}

export interface AccessPayload {
  userId: string
  idNumber: string
  role: Role
}
