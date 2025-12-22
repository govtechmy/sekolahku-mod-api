import type { Acara, AcaraAttachment, AcaraContent, AcaraCategory } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const AcaraContentSchema = new Schema<AcaraContent>(
  {
    root: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
)

const AcaraAttachmentSchema = new Schema<AcaraAttachment>(
  {
    image: { type: String },
  },
  { _id: true },
)

const AcaraSchema = new Schema<Acara>(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    readTime: { type: Number, required: true },
    articleDate: { type: Date, required: true },
    attachments: { type: [AcaraAttachmentSchema], default: [] },
    content: { type: AcaraContentSchema, required: true },
    category: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'acaras',
  },
)

// Indexes for better query performance
AcaraSchema.index({ articleDate: -1 })
AcaraSchema.index({ category: 1 })
AcaraSchema.index({ title: 'text' })

export const AcaraModel = payloadConnection.model<Acara>('Acara', AcaraSchema, 'acaras')

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

export const AcaraAttachmentModel = payloadConnection.model('AcaraAttachment', ArticleMediaSchema, 'articles-medias')

const CategorySchema = new Schema<AcaraCategory>(
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

export const AcaraCategoryModel = payloadConnection.model<AcaraCategory>('AcaraCategory', CategorySchema, 'categories')
