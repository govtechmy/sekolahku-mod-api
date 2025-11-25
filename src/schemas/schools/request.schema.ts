import { z } from 'zod'

const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

const InfoSekolahSchema = z.object({
  jenisLabel: z.string().optional().nullable(),
  jumlahPelajar: z.number().int().optional(),
  jumlahGuru: z.number().int().optional(),
})

const InfoKomunikasiSchema = z.object({
  noTelefon: z.string().optional().nullable(),
  noFax: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  alamatSurat: z.string().optional().nullable(),
  poskodSurat: z.string().optional().nullable(),
  bandarSurat: z.string().optional().nullable(),
})

const InfoPentadbiranSchema = z.object({
  negeri: z.string().optional().nullable(),
  ppd: z.string().optional().nullable(),
  parlimen: z.string().optional().nullable(),
  bantuan: z.string().optional().nullable(),
  bilSesi: z.string().optional().nullable(),
  sesi: z.string().optional().nullable(),
  prasekolah: z.boolean().optional().nullable(),
  integrasi: z.boolean().optional().nullable(),
})

const InfoLokasiSchema = z.object({
  koordinatXX: z.number().optional().nullable(),
  koordinatYY: z.number().optional().nullable(),
  location: GeoJSONPointSchema.optional().nullable(),
})

const EntitiSekolahDataSchema = z.object({
  infoSekolah: InfoSekolahSchema,
  infoKomunikasi: InfoKomunikasiSchema,
  infoPentadbiran: InfoPentadbiranSchema,
  infoLokasi: InfoLokasiSchema,
})

export const createSchoolBodySchema = z.object({
  namaSekolah: z.string().optional().nullable(),
  logoSekolah: z.string().optional,
  kodSekolah: z.string().min(1),
  data: EntitiSekolahDataSchema,
  updatedAt: z.date().optional(),
})

export type CreateSchoolBody = z.infer<typeof createSchoolBodySchema>
