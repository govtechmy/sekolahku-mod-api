import { z } from 'zod'

import { baseListResponseSchema, baseResponseSchema } from '../base'

export const CategorySchema = z.object({
  _id: z.string(),
  name: z.string(),
  value: z.string(),
  colors: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
})

export const ArticleCategoriesResponseSchema = baseResponseSchema.extend({
  data: z.array(CategorySchema),
})

export type ArticleCategory = z.infer<typeof CategorySchema>

export const SiaranListItemSchema = z.object({
  _id: z.string(),

  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),

  title: z.string().optional(),
  image: z.string().optional(),
  readTime: z.number().optional(),
  articleDate: z.union([z.string(), z.date()]).optional(),

  attachments: z
    .array(
      z.object({
        image: z.string().optional(),
        id: z.string().optional(),
        _id: z.string().optional(),
        createdAt: z.union([z.string(), z.date()]).optional(),
        updatedAt: z.union([z.string(), z.date()]).optional(),
        alt: z.string().optional(),
        filename: z.string().optional(),
        mimeType: z.string().optional(),
        filesize: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        focalX: z.number().optional(),
        focalY: z.number().optional(),
        __v: z.number().optional(),
        url: z.string().optional(),
      }),
    )
    .optional(),

  content: z.unknown().optional(),

  category: z.string().optional(),
  __v: z.number().optional(),

  imageHero: z.unknown().optional(),
  categoryDetails: z.unknown().optional(),
})

export type SiaranListItem = z.infer<typeof SiaranListItemSchema>

export const SiaranListDataResponseSchema = baseListResponseSchema.extend({
  items: z.array(SiaranListItemSchema),
})

export const SiaranListResponseSchema = baseResponseSchema.extend({
  data: SiaranListDataResponseSchema,
})

export const SiaranByIdResponseSchema = z.object({
  status: z.string(),
  statusCode: z.number(),
  data: SiaranListItemSchema,
})
