import type { EntitiSekolah, EntitiSekolahData, InfoKomunikasi, InfoLokasi, InfoPentadbiran, InfoSekolah } from '@types'
import { type GeoJSONPoint } from '@types'
import { model, Schema } from 'mongoose'

const GeoJSONPointSchema = new Schema<GeoJSONPoint>(
  {
    type: { Point: Number },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
)

const InfoSekolahSchema = new Schema<InfoSekolah>(
  {
    jenisLabel: { type: String },
    jumlahPelajar: { type: Number },
    jumlahGuru: { type: Number },
  },
  { _id: false },
)

const InfoKomunikasiSchema = new Schema<InfoKomunikasi>(
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

const InfoPentadbiranSchema = new Schema<InfoPentadbiran>(
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

const InfoLokasiSchema = new Schema<InfoLokasi>(
  {
    koordinatXX: { type: Number },
    koordinatYY: { type: Number },
    location: { type: GeoJSONPointSchema },
  },
  { _id: false },
)

const EntitiSekolahDataSchema = new Schema<EntitiSekolahData>(
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
    createdAt: { type: Date },
  },
  { timestamps: false },
)

EntitiSekolahSchema.index({ geo: '2dsphere' })

export const EntitiSekolahModel = model<EntitiSekolah>('EntitiSekolah', EntitiSekolahSchema, 'EntitiSekolah')
