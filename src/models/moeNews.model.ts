import type { MoeNewsArticle } from '@types'
import { Schema } from 'mongoose'

import { sekolahkuConnection } from '../config/db.config'

const MoeNewsImageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String },
  },
  { _id: false },
)

const MoeNewsSchema = new Schema<MoeNewsArticle>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: { type: [MoeNewsImageSchema], default: [] },
    sourceUrl: { type: String, required: true, unique: true },
    datePosted: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: 'moe_news',
  },
)

MoeNewsSchema.index({ datePosted: -1 })

export const MoeNewsModel = sekolahkuConnection.model<MoeNewsArticle>('MoeNews', MoeNewsSchema, 'moe_news')
