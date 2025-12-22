import type { Siaran, SiaranAttachment, SiaranContent, SiaranCategory } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const SiaranContentSchema = new Schema<SiaranContent>(
  {
    root: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
)

const SiaranAttachmentSchema = new Schema<SiaranAttachment>(
  {
    image: { type: String },
  },
  { _id: true },
)

const SiaranSchema = new Schema<Siaran>(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    readTime: { type: Number, required: true },
    articleDate: { type: Date, required: true },
    attachments: { type: [SiaranAttachmentSchema], default: [] },
    content: { type: SiaranContentSchema, required: true },
    category: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'siarans',
  },
)

// Indexes for better query performance
SiaranSchema.index({ articleDate: -1 })
SiaranSchema.index({ category: 1 })
SiaranSchema.index({ title: 'text' })

export const SiaranModel = payloadConnection.model<Siaran>('Siaran', SiaranSchema, 'siarans')

const ArticleMediaSchema = new Schema(
  {
    filename: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'articles-medias',
    strict: false,
  },
)

ArticleMediaSchema.index({ filename: 1 })

export const SiaranAttachmentModel = payloadConnection.model('SiaranAttachment', ArticleMediaSchema, 'articles-medias')

const CategorySchema = new Schema<SiaranCategory>(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'categories',
    strict: false,
  },
)

CategorySchema.index({ name: 1 })

export const SiaranCategoryModel = payloadConnection.model<SiaranCategory>('SiaranCategory', CategorySchema, 'categories')
