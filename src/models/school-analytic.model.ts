import type { AnalitikItem, AnalitikSekolahData, EntitiAnalitikSekolah } from '@types'
import { Schema } from 'mongoose'

import { sekolahkuConnection } from '../config/db.config'

const AnalitikItemSchema = new Schema<AnalitikItem>(
  {
    jenis: { type: String, required: true },
    peratus: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
)

const AnalitikSekolahDataSchema = new Schema<AnalitikSekolahData>(
  {
    jenisLabel: { type: [AnalitikItemSchema], required: true },
    bantuan: { type: [AnalitikItemSchema], required: true },
  },
  { _id: false },
)

const EntitiAnalitikSekolahSchema = new Schema<EntitiAnalitikSekolah>(
  {
    _id: { type: Number, default: 1 },
    jumlahSekolah: { type: Number, required: true },
    jumlahGuru: { type: Number, required: true },
    jumlahPelajar: { type: Number, required: true },
    data: { type: AnalitikSekolahDataSchema, required: true },
  },
  { timestamps: true },
)

export const EntitiAnalitikSekolahModel = sekolahkuConnection.model<EntitiAnalitikSekolah>('EntitiAnalitikSekolah', EntitiAnalitikSekolahSchema)
