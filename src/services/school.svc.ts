export type SchoolFilterCached = {
  schoolTypes: {
    jenisLabel: string
    peringkats?: string[]
  }[]
}

const schoolFilterCache: SchoolFilterCached = {
  schoolTypes: [],
}

export async function loadSchoolFilterCacheFromDB() {
  try {
    const { AnalitikSekolahModel } = await import('../models/analitik-sekolah.model')
    const schoolTypes = await AnalitikSekolahModel.find().lean()
    const list = schoolTypes.flatMap(doc =>
      doc.data.jenisLabel
        .filter(jenis => typeof jenis.jenis === 'string' && jenis.jenis !== 'TIADA MAKLUMAT')
        .map(jenis => ({ jenisLabel: jenis.jenis, peringkats: jenis.peringkatBreakdown?.map(x => x.peringkat) })),
    )
    schoolFilterCache.schoolTypes = list
  } catch (error) {
    throw new Error('Critical cache initialization failure while loading school filter cache from DB', { cause: error as Error })
  }
}

export function getSchoolFilterCache(): SchoolFilterCached {
  return schoolFilterCache
}
