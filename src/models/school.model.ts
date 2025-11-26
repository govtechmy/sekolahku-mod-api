import { model, Schema } from 'mongoose'

import type { EntitiSekolah } from '@/types/entities'

const GeoJSONPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
)

const InfoSekolahSchema = new Schema(
  {
    jenisLabel: { type: String },
    jumlahPelajar: { type: Number, default: 0 },
    jumlahGuru: { type: Number, default: 0 },
  },
  { _id: false },
)

const InfoKomunikasiSchema = new Schema(
  {
    noTelefon: { type: String },
    noFax: { type: String },
    email: { type: String },
    alamatSurat: { type: String },
    poskodSurat: { type: String },
    bandarSurat: { type: String },
  },
  { _id: false },
)

const InfoPentadbiranSchema = new Schema(
  {
    negeri: { type: String },
    ppd: { type: String },
    parlimen: { type: String },
    bantuan: { type: String },
    bilSesi: { type: String },
    sesi: { type: String },
    prasekolah: { type: Boolean },
    integrasi: { type: Boolean },
  },
  { _id: false },
)

const InfoLokasiSchema = new Schema(
  {
    koordinatXX: { type: Number },
    koordinatYY: { type: Number },
    location: { type: GeoJSONPointSchema },
  },
  { _id: false },
)

const EntitiSekolahDataSchema = new Schema(
  {
    infoSekolah: { type: InfoSekolahSchema, required: true },
    infoKomunikasi: { type: InfoKomunikasiSchema, required: true },
    infoPentadbiran: { type: InfoPentadbiranSchema, required: true },
    infoLokasi: { type: InfoLokasiSchema, required: true },
  },
  { _id: false },
)

const EntitiSekolahSchema = new Schema<EntitiSekolah>(
  {
    namaSekolah: { type: String },
    logoSekolah: { type: String },
    kodSekolah: { type: String, required: true, unique: true },
    data: { type: EntitiSekolahDataSchema, required: true },
    updatedAt: { type: Date },
  },
  { timestamps: false },
)

EntitiSekolahSchema.index({ geo: '2dsphere' })

export const EntitiSekolahModel = model<EntitiSekolah>('EntitiSekolah', EntitiSekolahSchema)
