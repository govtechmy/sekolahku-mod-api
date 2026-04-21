import { MARKER_GROUP, RESPONSE_STATUS } from '@types'
import { z } from 'zod'

const ViewInfoLokasiSchema = z.object({
  koordinatXX: z.number().optional(),
  koordinatYY: z.number().optional(),
  zoom: z.number().optional(),
})

const MarkerItemSchema = z.object({
  infoLokasi: ViewInfoLokasiSchema.optional(),
  kodSekolah: z.string().optional(),
  dataUrl: z.string().optional(),
})

const MarkerGroupItemSchema = MarkerItemSchema.extend({
  markerType: z.enum(MARKER_GROUP).optional(),
  radiusInMeter: z.number().optional(),
  negeri: z.string().optional(),
  parlimen: z.string().optional(),
  total: z.number().optional(),
  items: z.array(MarkerItemSchema).optional(),
})

export const FindNearbyResponseSchema = z.object({
  viewInfoLokasi: ViewInfoLokasiSchema,
  markerGroups: z.array(MarkerGroupItemSchema),
})

export const schoolTypesResponseSchema = z.object({
  status: z.literal(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number(),
  data: z.array(z.string()),
})

export const peringkatResponseSchema = z.object({
  status: z.literal(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number(),
  data: z.array(z.string()),
})

export type FindNearbyResponse = z.infer<typeof FindNearbyResponseSchema>

export type SchoolTypesResponse = z.infer<typeof schoolTypesResponseSchema>
