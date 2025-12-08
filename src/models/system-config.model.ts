import { model, Schema } from 'mongoose'
import { type SystemConfig } from '@types'

export interface ISystemConfigDocument extends SystemConfig{}

export const SystemConfigSchema = new Schema<SystemConfigDocument>(
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

export const SystemConfigModel = model<SystemConfigDocument>('SystemConfig', SystemConfigSchema, 'SystemConfig')
