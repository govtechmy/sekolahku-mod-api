import type { Categories } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const CategorySchema = new Schema<Categories>(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    colors: { type: String },
  },
  { timestamps: true },
)

export const CategoryModel = payloadConnection.model<Categories>('Category', CategorySchema, 'categories')
