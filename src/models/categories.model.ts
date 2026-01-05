import type { Categories } from '@types'
import { Schema } from 'mongoose'
import { payloadConnection } from 'src/config/db.config'

const CategoriesSchema = new Schema<Categories>(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    colors: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'categories',
  },
)

export const CategoriesModel = payloadConnection.model<Categories>('Categories', CategoriesSchema, 'categories')
