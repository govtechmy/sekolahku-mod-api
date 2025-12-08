import { model, Schema } from 'mongoose'
import { type SystemConfig } from '@types'

export const SystemConfigSchema = new Schema<SystemConfig>(
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

export const SystemConfigModel = model<SystemConfig>('SystemConfig', SystemConfigSchema, 'SystemConfig')
