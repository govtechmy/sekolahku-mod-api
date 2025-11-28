import type { FastifyRequest } from 'fastify'

export function getSingleQueryParam(req: FastifyRequest, key: string) {
  const raw = (req.query as Record<string, unknown>)[String(key)]
  if (Array.isArray(raw)) {
    req.log.warn({ [key]: raw }, `schools:nearby:duplicate-${key}`)
    return { error: { status: 400, message: `Duplicate query parameter: ${key} must not be repeated.` } }
  }
  if (raw == null || String(raw).trim() === '') {
    req.log.warn({ [key]: raw }, `schools:nearby:missing-${key}`)
    return { error: { status: 400, message: `Missing query parameter: ${key} is required.` } }
  }
  return { value: raw as string | number }
}

export function parseNumberParam(req: FastifyRequest, key: string, raw: string | number) {
  const num = Number(raw)
  if (isNaN(num)) {
    req.log.warn({ [key]: raw }, `schools:nearby:invalid-${key}`)
    return { error: { status: 400, message: `Invalid query parameter: ${key} must be a valid number.` } }
  }
  return { value: num }
}

export function validateLongitudeRange(
  req: FastifyRequest,
  longitude: number,
): { ok: true } | { error: { status: number; message: string } } {
  if (longitude < -180 || longitude > 180) {
    req.log.warn({ longitude }, 'schools:nearby:longitude-out-of-range')
    return { error: { status: 400, message: 'Invalid query parameter: longitude must be between -180 and 180.' } }
  }
  return { ok: true }
}

export function validateLatitudeRange(
  req: FastifyRequest,
  latitude: number,
): { ok: true } | { error: { status: number; message: string } } {
  if (latitude < -90 || latitude > 90) {
    req.log.warn({ latitude }, 'schools:nearby:latitude-out-of-range')
    return { error: { status: 400, message: 'Invalid query parameter: latitude must be between -90 and 90.' } }
  }
  return { ok: true }
}
