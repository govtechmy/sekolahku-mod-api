import type {
  EntitiSekolah,
  EntitiSekolahData,
  InfoKomunikasi,
  InfoLokasi,
  InfoPentadbiran,
  InfoSekolah,
  GeoJSONPoint,
} from '@types'
import { SEKOLAH_STATUS } from '@types'
import { model, Schema } from 'mongoose'
  
  const InfoSekolahSchema = new Schema<InfoSekolah>(
    {
      jenisLabel: { type: String, default: null },
      jumlahPelajar: { type: Number, default: 0 },
      jumlahGuru: { type: Number, default: 0 },
    },
    { _id: false }
  )
  
  const InfoKomunikasiSchema = new Schema<InfoKomunikasi>(
    {
      noTelefon: { type: String, default: null },
      noFax: { type: String, default: null },
      email: { type: String, default: null },
      alamatSurat: { type: String, default: null },
      poskodSurat: { type: String, default: null },
      bandarSurat: { type: String, default: null },
    },
    { _id: false }
  )
  
  const InfoPentadbiranSchema = new Schema<InfoPentadbiran>(
    {
      negeri: { type: String, default: null },
      ppd: { type: String, default: null },
      parlimen: { type: String, default: null },
      bantuan: { type: String, default: null },
      bilSesi: { type: String, default: null },
      sesi: { type: String, default: null },
      prasekolah: { type: Boolean, default: null },
      integrasi: { type: Boolean, default: null },
    },
    { _id: false }
  )

  const GeoJSONPointSchema = new Schema<GeoJSONPoint>(
    {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: { type: [Number], required: true },
    },
    { _id: false }
  )
  
  const InfoLokasiSchema = new Schema<InfoLokasi>(
    {
      koordinatXX: { type: Number, default: null },
      koordinatYY: { type: Number, default: null },
      location: { type: GeoJSONPointSchema, default: null },
    },
    { _id: false }
  )
  
  const EntitiSekolahDataSchema = new Schema<EntitiSekolahData>(
    {
      infoSekolah: { type: InfoSekolahSchema, required: true },
      infoKomunikasi: { type: InfoKomunikasiSchema, required: true },
      infoPentadbiran: { type: InfoPentadbiranSchema, required: true },
      infoLokasi: { type: InfoLokasiSchema, required: true },
    },
    { _id: false }
  )
  
  const EntitiSekolahSchema = new Schema<EntitiSekolah>(
    {
      namaSekolah: { type: String, default: null },
      kodSekolah: { type: String, required: true, unique: true },
      data: { type: EntitiSekolahDataSchema, required: true },
      status: { type: String, enum: Object.values(SEKOLAH_STATUS), default: null },
      createdAt: { type: Date, default: Date.now },
    },
    { timestamps: false, versionKey: false }
  )
  
  // Correct geospatial index
  EntitiSekolahSchema.index({
    'data.infoLokasi.location': '2dsphere'
  })
  
  export const EntitiSekolahModel = model<EntitiSekolah>(
    'EntitiSekolah',
    EntitiSekolahSchema,
    'EntitiSekolah'
  )
  