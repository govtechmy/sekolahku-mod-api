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
    schoolFilterCache.schoolTypes = schoolTypes.filter(Boolean).map(jenisLabel => ({ jenisLabel: jenisLabel as string }))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading school filter cache from DB:', error)
    throw error
  }
}

export function getSchoolFilterCache(): SchoolFilterCached {
  return schoolFilterCache
}
