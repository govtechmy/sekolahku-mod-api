import type { Sekolah } from '@types'
import { NEGERI, SEKOLAH_STATUS } from '@types'
import { model, Schema } from 'mongoose'

const SekolahSchema = new Schema<Sekolah>(
  {
    negeri: { type: String, enum: Object.values(NEGERI), default: null },
    ppd: { type: String, default: null },
    parlimen: { type: String, default: null },
    dun: { type: String, default: null },
    peringkat: { type: String, default: null },
    jenisLabel: { type: String, default: null },
    kodSekolah: { type: String, required: true, unique: true },
    namaSekolah: { type: String, default: null },

    alamatSurat: { type: String, default: null },
    poskodSurat: { type: Number, default: null },
    bandarSurat: { type: String, default: null },

    noTelefon: { type: String, default: null },
    noFax: { type: String, default: null },
    email: { type: String, default: null }, // Python EmailStr -> string

    lokasi: { type: String, default: null },
    gred: { type: String, default: null },
    bantuan: { type: String, default: null },
    bilSesi: { type: String, default: null },
    sesi: { type: String, default: null },

    enrolmenPrasekolah: { type: Number, default: null },
    enrolmen: { type: Number, default: null },
    enrolmenKhas: { type: Number, default: null },
    guru: { type: Number, default: null },

    prasekolah: { type: Boolean, default: null },
    integrasi: { type: Boolean, default: null },

    koordinatXX: { type: Number, default: null },
    koordinatYY: { type: Number, default: null },

    skmLEQ150: { type: Boolean, default: null },

    status: { type: String, enum: Object.values(SEKOLAH_STATUS), default: null },
    checksum: { type: String, default: null },

    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false, versionKey: false }
)

SekolahSchema.index({ negeri: 1 })
SekolahSchema.index({ ppd: 1 })
SekolahSchema.index({ jenisLabel: 1 })
SekolahSchema.index({ peringkat: 1 })
SekolahSchema.index({ location: '2dsphere' })

export const SekolahModel = model<Sekolah>('Sekolah', SekolahSchema, 'Sekolah')
