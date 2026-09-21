// Parses the free-text "search" query param as a calendar date so the
// Carian box can match articles by date, alongside title/description text.
// Only unambiguous numeric formats are accepted (dd/mm/yyyy, dd-mm-yyyy,
// yyyy-mm-dd) so ordinary search text never accidentally parses as a date.
export function parseSearchDateRange(search: string): { $gte: Date; $lte: Date } | null {
  const trimmed = search.trim()

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)

  let year: number
  let month: number
  let day: number

  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (dmy) {
    day = Number(dmy[1])
    month = Number(dmy[2])
    year = Number(dmy[3])
  } else {
    return null
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  // Reject invalid calendar dates (e.g. 31/02) that Date rolls into the next month.
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) {
    return null
  }

  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  return { $gte: start, $lte: end }
}
