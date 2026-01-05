import type { ArticleMedia } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const ArticleMediaSchema = new Schema<ArticleMedia>(
  {
    alt: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: Number, required: true },
    filesize: { type: Date, required: true },
  },
  { timestamps: true },
)

// Indexes for better query performance
ArticleMediaSchema.index({ filename: 'text' })

export const ArticleMediaModel = payloadConnection.model<ArticleMedia>('ArticleMedia', ArticleMediaSchema, 'articles-medias')
