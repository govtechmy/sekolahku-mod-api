import { type EntitiSekolah, MARKER_GROUP } from '@types'

export function groupingFromZoom(zoom: number): MARKER_GROUP {
  if (zoom <= 7) return MARKER_GROUP.WEST_EAST_MALAYSIA
  // if (zoom > 7 && zoom <= 9) return MARKER_GROUP.NEGERI
  if (zoom <= 9) return MARKER_GROUP.NEGERI
  if (zoom > 9 && zoom <= 12) return MARKER_GROUP.PARLIMEN
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
