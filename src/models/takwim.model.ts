import type { Takwim, TakwimAttachment, TakwimContent } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const TakwimContentSchema = new Schema<TakwimContent>(
  {
    root: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
)

const TakwimAttachmentSchema = new Schema<TakwimAttachment>(
  {
    image: { type: String },
  },
  { _id: true },
)

const TakwimSchema = new Schema<Takwim>(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    readTime: { type: Number, required: true },
    articleDate: { type: Date, required: true },
    attachments: { type: [TakwimAttachmentSchema], default: [] },
    content: { type: TakwimContentSchema, required: true },
    category: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'takwims',
  },
)

// Indexes for better query performance
TakwimSchema.index({ articleDate: -1 })
TakwimSchema.index({ category: 1 })
TakwimSchema.index({ title: 'text' })

export const TakwimModel = payloadConnection.model<Takwim>('Takwim', TakwimSchema, 'takwims')
