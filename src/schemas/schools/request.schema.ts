import { z } from 'zod'

import { NEGERI } from '../../types/enum'

const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

const InfoSekolahSchema = z.object({
  jenisLabel: z.string().optional(),
  jumlahPelajar: z.number().int().optional(),
  jumlahGuru: z.number().int().optional(),
})

const InfoKomunikasiSchema = z.object({
  noTelefon: z.string().optional(),
  noFax: z.string().optional(),
  email: z.string().email().optional(),
  alamatSurat: z.string().optional(),
  poskodSurat: z.string().optional(),
  bandarSurat: z.string().optional(),
})

const InfoPentadbiranSchema = z.object({
  negeri: z.enum(NEGERI).optional(),
  ppd: z.string().optional(),
  parlimen: z.string().optional(),
  bantuan: z.string().optional(),
  bilSesi: z.string().optional(),
  sesi: z.string().optional(),
  prasekolah: z.boolean().optional(),
  integrasi: z.boolean().optional(),
})

const InfoLokasiSchema = z.object({
  koordinatXX: z.number().optional(),
  koordinatYY: z.number().optional(),
  location: GeoJSONPointSchema.optional(),
})

const EntitiSekolahDataSchema = z.object({
  infoSekolah: InfoSekolahSchema,
  infoKomunikasi: InfoKomunikasiSchema,
  infoPentadbiran: InfoPentadbiranSchema,
  infoLokasi: InfoLokasiSchema,
})

export const createSchoolBodySchema = z.object({
  namaSekolah: z.string().optional(),
  logoSekolah: z.string().optional(),
  kodSekolah: z.string().min(1),
  data: EntitiSekolahDataSchema,
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
})

export const listSchoolsSearchQuerySchema = z.object({
  namaSekolah: z.string().optional(),
  negeri: z.enum(NEGERI).optional(),
  jenis: z.string().optional(),
})

export type ListSchoolsSearchQuery = z.infer<typeof listSchoolsSearchQuerySchema>

export type CreateSchoolBody = z.infer<typeof createSchoolBodySchema>

export const getNearbySchoolByLocationSchema = z.object({
  radiusInMeter: z.number(),
  latitude: z.number(),
  longitude: z.number(),
})

export type GetNearbySchoolByLocation = z.infer<typeof getNearbySchoolByLocationSchema>
