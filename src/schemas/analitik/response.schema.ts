import { z } from 'zod'

import { baseResponseSchema } from '../base'

export const AnalitikResponseSchema = z.object({
  jumlahSekolah: z.number(),
  jumlahGuru: z.number(),
  jumlahPelajar: z.number(),
  data: z.object({
    jenisLabel: z.array(
      z.object({
        jenis: z.string(),
        peratus: z.number(),
        total: z.number(),
      }),
    ),
    bantuan: z.array(
      z.object({
        jenis: z.string(),
        peratus: z.number(),
        total: z.number(),
      }),
    ),
  }),
  lastUpdatedAt: z.union([z.string(), z.date()]),
})

export const getAnalitikResponseSchema = baseResponseSchema.extend({
  data: AnalitikResponseSchema,
})
