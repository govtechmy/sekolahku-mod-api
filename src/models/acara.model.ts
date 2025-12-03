import type { Acara, AcaraAttachment, AcaraContent } from '@types'
import { model, Schema } from 'mongoose'

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

export const AcaraModel = model<Acara>('Acara', AcaraSchema, 'acaras')
