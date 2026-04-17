import type { AnalitikItem, AnalitikSekolah, AnalitikSekolahData, PeringkatBreakdown } from '@types'
import { Schema } from 'mongoose'

import { sekolahkuConnection } from '../config/db.config'

const PeringkatBreakdownSchema = new Schema<PeringkatBreakdown>(
  {
    peringkat: { type: String, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
)

const AnalitikItemSchema = new Schema<AnalitikItem>(
  {
    jenis: { type: String, required: true },
    peratus: { type: Number, required: true },
    total: { type: Number, required: true },
    peringkatBreakdown: { type: [PeringkatBreakdownSchema] },
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

const AnalitikSekolahSchema = new Schema<AnalitikSekolah>(
  {
    jumlahSekolah: { type: Number, required: true },
    jumlahGuru: { type: Number, required: true },
    jumlahPelajar: { type: Number, required: true },
    data: { type: AnalitikSekolahDataSchema, required: true },
  },
  { timestamps: true },
)

export const AnalitikSekolahModel = sekolahkuConnection.model<AnalitikSekolah>('AnalitikSekolah', AnalitikSekolahSchema, 'AnalitikSekolah')
