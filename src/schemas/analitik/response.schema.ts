import { PERINGKAT } from '@types'
import { z } from 'zod'

import { baseResponseSchema } from '../base'

const PeringkatBreakdownSchema = z.object({
  peringkat: z.string(),
  total: z.number(),
})

const SchoolTypeWithPeringkatSchema = z.object({
  jenis: z.string(),
  peringkatBreakdown: z.array(PeringkatBreakdownSchema).optional(),
})

export const filterSchoolTypeWithPeringkatQuerySchema = z.object({
  peringkat: z.enum(PERINGKAT).optional(),
})

export type FilterSchoolTypeWithPeringkatQuery = z.infer<typeof filterSchoolTypeWithPeringkatQuerySchema>

export const getFilterSchoolTypeWithPeringkatResponseSchema = baseResponseSchema.extend({
  data: z.array(SchoolTypeWithPeringkatSchema),
})

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
    // School count grouped by state, sorted desc. Prefers the precomputed
    // data.taburanNegeri on the analitik doc; falls back to a live count over
    // the Sekolah collection for docs generated before that field existed.
    taburanNegeri: z.array(
      z.object({
        negeri: z.string(),
        total: z.number(),
      }),
    ),
  }),
  lastUpdatedAt: z.union([z.string(), z.date()]),
  fileVersion: z.string().nullable(),
})

export const getAnalitikResponseSchema = baseResponseSchema.extend({
  data: AnalitikResponseSchema,
})
