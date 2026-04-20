import type { DatasetStatus } from '@types'
import { Schema } from 'mongoose'

import { sekolahkuConnection } from '../config/db.config'

const DatasetStatusSchema = new Schema<DatasetStatus>({
  lastUpdatedAt: { type: Date, required: true },
  fileVersion: { type: String, default: null },
})

export const DatasetStatusModel = sekolahkuConnection.model<DatasetStatus>('DatasetStatus', DatasetStatusSchema, 'DatasetStatus')
