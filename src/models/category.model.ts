import type { Category } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const CategorySchema = new Schema<Category>(
  {
    name: { type: String, required: true },
    value: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    colors: { type: String },
  },
  { timestamps: true },
)

export const CategoryModel = payloadConnection.model<Category>('Category', CategorySchema, 'categories')
