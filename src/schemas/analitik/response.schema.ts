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
        peringkatBreakdown: z
          .array(
            z.object({
              peringkat: z.string(),
              total: z.number(),
            }),
          )
          .optional(),
      }),
    ),
    bantuan: z.array(
      z.object({
        jenis: z.string(),
        peratus: z.number(),
        total: z.number(),
        peringkatBreakdown: z
          .array(
            z.object({
              peringkat: z.string(),
              total: z.number(),
            }),
          )
          .optional(),
      }),
    ),
  }),
  lastUpdatedAt: z.union([z.string(), z.date()]),
  fileVersion: z.string(),
})

export const getAnalitikResponseSchema = baseResponseSchema.extend({
  data: AnalitikResponseSchema,
})
