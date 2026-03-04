import type { Media } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const MediaSchema = new Schema<Media>(
  {
    alt: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: Number, required: true },
    filesize: { type: Date, required: true },
  },
  { timestamps: true },
)

// Indexes for better query performance
MediaSchema.index({ filename: 'text' })

export const MediaModel = payloadConnection.model<Media>('Media', MediaSchema, 'media')
