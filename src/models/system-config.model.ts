import { type SystemConfig } from '@types'
import { Schema } from 'mongoose'
import { sekolahkuConnection } from 'src/config/db.config'

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

export const SystemConfigModel = sekolahkuConnection.model<SystemConfig>('SystemConfig', SystemConfigSchema, 'SystemConfig')
