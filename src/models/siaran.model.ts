import type { Siaran, SiaranAttachment, SiaranContent } from '@types'
import { model, Schema } from 'mongoose'

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

export const SiaranModel = model<Siaran>('Siaran', SiaranSchema, 'siarans')
