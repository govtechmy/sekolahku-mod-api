import { type Document, model, Schema } from 'mongoose'

export interface ISystemConfig {
  key: string
  value: string | number | boolean
  description?: string
  updatedAt: Date
}

export interface ISystemConfigDocument extends ISystemConfig, Document {}

export const SystemConfigSchema = new Schema<ISystemConfigDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'system_config',
    timestamps: false,
  },
)

export const SystemConfigModel = model<ISystemConfigDocument>('SystemConfig', SystemConfigSchema)
