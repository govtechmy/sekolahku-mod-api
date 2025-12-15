import { type EntitiSekolah, MARKER_GROUP } from '@types'

export function groupingFromRadius(radius: number): MARKER_GROUP {
  if (radius >= 150_000) return MARKER_GROUP.NEGERI
  if (radius >= 50_000) return MARKER_GROUP.PARLIMEN
  return MARKER_GROUP.INDIVIDUAL
}

export function makeSchoolObject(school: EntitiSekolah, dataUrlBase: string) {
  const koordinatXX = school.data.infoLokasi.location?.coordinates[0]
  const koordinatYY = school.data.infoLokasi.location?.coordinates[1]
  return {
    kodSekolah: school.kodSekolah,
    infoLokasi: {
      koordinatXX,
      koordinatYY,
    },
    dataUrl: `${dataUrlBase}/${school.data?.infoPentadbiran?.negeri}/${school.data?.infoPentadbiran?.parlimen}/${school.kodSekolah}/${school.kodSekolah}.json`,
  }
}
