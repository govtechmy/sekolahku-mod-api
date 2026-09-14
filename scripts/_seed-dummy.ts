/* eslint-disable no-console */
// Dummy data seed for local development. Re-runnable (clears its own dummy rows
// first). Delete this script after use. Populates: analitik stat + charts,
// per-state school counts (taburan negeri), and takwim events.
import { connectToDatabase } from '../src/config/db.config'
import { AnalitikSekolahModel, SekolahModel, TakwimModel } from '../src/models'

await connectToDatabase()

// ---- Analitik (sekolahku DB): drives stat cards + Peringkat + Bantuan ----
await AnalitikSekolahModel.deleteMany({})
await AnalitikSekolahModel.create({
  jumlahSekolah: 10258,
  jumlahGuru: 420367,
  jumlahPelajar: 5145163,
  data: {
    // jenis keys must exist in the FE SCHOOL_TYPE_LABELS map so the chart can
    // label them. RENDAH totals (7796) + MENENGAH totals (2462) = 10258.
    jenisLabel: [
      // RENDAH
      { jenis: 'SK', peratus: 57, total: 5842, peringkatBreakdown: [{ peringkat: 'RENDAH', total: 5842 }] },
      { jenis: 'SJKC', peratus: 13, total: 1302, peringkatBreakdown: [{ peringkat: 'RENDAH', total: 1302 }] },
      { jenis: 'SJKT', peratus: 5, total: 526, peringkatBreakdown: [{ peringkat: 'RENDAH', total: 526 }] },
      { jenis: 'SR SABK', peratus: 1, total: 96, peringkatBreakdown: [{ peringkat: 'RENDAH', total: 96 }] },
      { jenis: 'SK KHAS', peratus: 0, total: 28, peringkatBreakdown: [{ peringkat: 'RENDAH', total: 28 }] },
      { jenis: 'K9', peratus: 0, total: 2, peringkatBreakdown: [{ peringkat: 'RENDAH', total: 2 }] },
      // MENENGAH
      { jenis: 'SMK', peratus: 20, total: 2036, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 2036 }] },
      { jenis: 'SMKA', peratus: 2, total: 158, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 158 }] },
      { jenis: 'SMT', peratus: 1, total: 90, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 90 }] },
      { jenis: 'SBP', peratus: 1, total: 69, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 69 }] },
      { jenis: 'KV', peratus: 1, total: 63, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 63 }] },
      { jenis: 'SM SABK', peratus: 0, total: 34, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 34 }] },
      { jenis: 'SM KHAS', peratus: 0, total: 8, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 8 }] },
      { jenis: 'SUKAN', peratus: 0, total: 2, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 2 }] },
      { jenis: 'SENI', peratus: 0, total: 2, peringkatBreakdown: [{ peringkat: 'MENENGAH', total: 2 }] },
    ],
    bantuan: [
      { jenis: 'Sekolah Kerajaan', peratus: 81, total: 8335 },
      { jenis: 'Bantuan Kerajaan', peratus: 19, total: 1923 },
    ],
    // Per-state breakdown, sorted desc. Sums to jumlahSekolah (10258) so the
    // chart stays consistent with the headline total.
    taburanNegeri: [
      { negeri: 'SARAWAK', total: 1861 },
      { negeri: 'SABAH', total: 1298 },
      { negeri: 'JOHOR', total: 1049 },
      { negeri: 'PERAK', total: 981 },
      { negeri: 'SELANGOR', total: 883 },
      { negeri: 'KEDAH', total: 702 },
      { negeri: 'KELANTAN', total: 683 },
      { negeri: 'PAHANG', total: 641 },
      { negeri: 'TERENGGANU', total: 528 },
      { negeri: 'NEGERI SEMBILAN', total: 468 },
      { negeri: 'PULAU PINANG', total: 431 },
      { negeri: 'MELAKA', total: 281 },
      { negeri: 'KUALA LUMPUR', total: 279 },
      { negeri: 'PERLIS', total: 118 },
      { negeri: 'LABUAN', total: 31 },
      { negeri: 'PUTRAJAYA', total: 24 },
    ],
  },
})

// Taburan Sekolah Mengikut Negeri now reads the precomputed data.taburanNegeri
// on the analitik doc above, so no per-state Sekolah rows are seeded here.
// Clean up rows any earlier version of this script may have inserted.
await SekolahModel.deleteMany({ kodSekolah: { $regex: '^DUMMY-' } })

// ---- Takwim (payload DB): drives Kalendar Aktiviti Persekolahan ----
// Raw collection insert so we control createdAt (the UI derives the date badge
// from it) instead of it defaulting to "now".
const takwimCol = TakwimModel.collection
await takwimCol.deleteMany({ _seedDummy: true })
await takwimCol.insertMany([
  {
    _seedDummy: true,
    title: 'Hari Pertama Pembukaan Sesi Persekolahan Penggal 2',
    image: '000000000000000000000000',
    category: 'Akademik',
    articleDate: new Date('2026-04-20'),
    createdAt: new Date('2026-04-20'),
    updatedAt: new Date('2026-04-20'),
    attachments: [],
    content: { root: { children: [], type: 'root', version: 1 } },
  },
  {
    _seedDummy: true,
    title: 'Sambutan Hari Guru Peringkat Kebangsaan Ke-55',
    image: '000000000000000000000000',
    category: 'Kenaikan Kebangsaan',
    articleDate: new Date('2026-05-16'),
    createdAt: new Date('2026-05-16'),
    updatedAt: new Date('2026-05-16'),
    attachments: [],
    content: { root: { children: [], type: 'root', version: 1 } },
  },
  {
    _seedDummy: true,
    title: 'Cuti Penggal 1 Sesi 2026/2027 Bermula',
    image: '000000000000000000000000',
    category: 'Cuti Sekolah',
    articleDate: new Date('2026-06-05'),
    createdAt: new Date('2026-06-05'),
    updatedAt: new Date('2026-06-05'),
    attachments: [],
    content: { root: { children: [], type: 'root', version: 1 } },
  },
])

const [analitikN, takwimN] = await Promise.all([
  AnalitikSekolahModel.countDocuments({}),
  takwimCol.countDocuments({ _seedDummy: true }),
])
console.log('SEEDED', JSON.stringify({ analitik: analitikN, takwim: takwimN }))
process.exit(0)
