import { z } from 'zod'

export const createSchoolBodySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  level: z.string().optional(),
  typeLabel: z.string().optional(),
  admin: z
    .object({
      state: z.string().optional(),
      ppd: z.string().optional(),
      parliament: z.string().optional(),
      dun: z.string().optional(),
    })
    .optional(),
  mailingAddress: z
    .object({
      line: z.string().optional(),
      postcode: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
  contacts: z
    .object({
      phones: z.array(z.string()).optional(),
      fax: z.array(z.string()).optional(),
      emails: z.array(z.string()).optional(),
    })
    .optional(),
  grade: z.string().optional(),
  assistance: z.string().optional(),
  sessions: z
    .object({
      count: z.number().int().optional(),
      labels: z.array(z.string()).optional(),
    })
    .optional(),
  enrolment: z
    .object({
      preschool: z.number().int().optional(),
      total: z.number().int().optional(),
      specialNeeds: z.number().int().optional(),
    })
    .optional(),
  staffing: z
    .object({
      teachers: z.number().int().optional(),
    })
    .optional(),
  facilities: z
    .object({
      hasPreschool: z.boolean().optional(),
      integration: z.boolean().optional(),
    })
    .optional(),
  geo: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  skmLe150: z.boolean().optional(),
  meta: z
    .object({
      raw: z.record(z.string(), z.unknown()).optional(),
      sourceRowId: z.string().optional(),
      ingestedAt: z.coerce.date().optional(),
    })
    .optional(),
})

export type CreateSchoolBody = z.infer<typeof createSchoolBodySchema>
