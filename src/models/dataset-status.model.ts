import type { DatasetStatus } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const DatasetStatusSchema = new Schema<DatasetStatus>({
  lastUpdatedAt: { type: Date, required: true },
})

export const DatasetStatusModel = payloadConnection.model<DatasetStatus>('DatasetStatus', DatasetStatusSchema, 'DatasetStatus')
