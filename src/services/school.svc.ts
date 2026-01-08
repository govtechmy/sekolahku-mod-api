import type { SchoolType } from '@types'

export type SchoolFilterCached = {
  schoolTypes: SchoolType[]
}

const schoolFilterCache: SchoolFilterCached = {
  schoolTypes: [],
}

export async function loadSchoolFilterCacheFromDB() {
  try {
    const { EntitiSekolahModel } = await import('../models/entiti-sekolah.model')
    const schoolTypes = await EntitiSekolahModel.distinct('data.infoSekolah.jenisLabel').lean()
    schoolFilterCache.schoolTypes = schoolTypes
      .filter((jenisLabel): jenisLabel is string => typeof jenisLabel === 'string')
      .map(jenisLabel => ({ jenisLabel }))
  } catch (error) {
    throw new Error('Critical cache initialization failure while loading school filter cache from DB', { cause: error as Error })
  }
}

export function getSchoolFilterCache(): SchoolFilterCached {
  return schoolFilterCache
}
