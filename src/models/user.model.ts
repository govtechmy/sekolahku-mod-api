import { ROLES, type UserEntity } from '@types'
import { Schema } from 'mongoose'

import { payloadConnection } from '../config/db.config'

const UserSchema = new Schema<UserEntity>(
  {
    name: { type: String, required: true },
    idNumber: { type: String, required: true, unique: true },
    role: { type: String, required: true, enum: ROLES },
    email: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
)

export const UserModel = payloadConnection.model<UserEntity>('User', UserSchema)
