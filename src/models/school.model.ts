import type { EntitiSekolah, EntitiSekolahData, InfoKomunikasi, InfoLokasi, InfoPentadbiran, InfoSekolah, Sekolah } from '@types'
import { type GeoJSONPoint, SEKOLAH_STATUS } from '@types'
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
    status: { type: String, enum: Object.values(SEKOLAH_STATUS), required: true },
    updatedAt: { type: Date },
    createdAt: { type: Date },
  },
  { timestamps: false },
)

EntitiSekolahSchema.index({ geo: '2dsphere' })

export const EntitiSekolahModel = model<EntitiSekolah>('EntitiSekolah', EntitiSekolahSchema, 'EntitiSekolah')

const SekolahSchema = new Schema<Sekolah>(
  {
    negeri: { type: String },
    ppd: { type: String },
    parlimen: { type: String },
    dun: { type: String },
    peringkat: { type: String },
    jenisLabel: { type: String },
    kodSekolah: { type: String, required: true, unique: true },
    namaSekolah: { type: String },
    alamatSurat: { type: String },
    poskodSurat: { type: Number },
    bandarSurat: { type: String },
    noTelefon: { type: String },
    noFax: { type: String },
    email: { type: String },
    lokasi: { type: String },
    gred: { type: String },
    bantuan: { type: String },
    bilSesi: { type: String },
    sesi: { type: String },
    enrolmenPrasekolah: { type: Number },
    enrolmen: { type: Number },
    enrolmenKhas: { type: Number },
    guru: { type: Number },
    prasekolah: { type: Boolean },
    integrasi: { type: Boolean },
    koordinatXX: { type: Number },
    koordinatYY: { type: Number },
    skmLEQ150: { type: Boolean },
    status: { type: String, enum: Object.values(SEKOLAH_STATUS) },
    checksum: { type: String },
    location: { type: GeoJSONPointSchema },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

SekolahSchema.index({ negeri: 1 })
SekolahSchema.index({ ppd: 1 })
SekolahSchema.index({ jenisLabel: 1 })
SekolahSchema.index({ peringkat: 1 })
SekolahSchema.index({ location: '2dsphere' })

export const SekolahModel = model<Sekolah>('Sekolah', SekolahSchema, 'Sekolah')
