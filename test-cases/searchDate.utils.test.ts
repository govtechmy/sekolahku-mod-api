import { describe, expect, test } from 'bun:test'
import { parseSearchDateRange } from 'src/utils/searchDate.utils'

describe('parseSearchDateRange', () => {
  test('parses dd/mm/yyyy into a UTC day range', () => {
    expect(parseSearchDateRange('14/09/2026')).toEqual({
      $gte: new Date('2026-09-14T00:00:00.000Z'),
      $lte: new Date('2026-09-14T23:59:59.999Z'),
    })
  })

  test('parses dd-mm-yyyy', () => {
    expect(parseSearchDateRange('14-09-2026')).toEqual({
      $gte: new Date('2026-09-14T00:00:00.000Z'),
      $lte: new Date('2026-09-14T23:59:59.999Z'),
    })
  })

  test('parses yyyy-mm-dd', () => {
    expect(parseSearchDateRange('2026-09-14')).toEqual({
      $gte: new Date('2026-09-14T00:00:00.000Z'),
      $lte: new Date('2026-09-14T23:59:59.999Z'),
    })
  })

  test('rejects an invalid calendar date instead of rolling it over', () => {
    expect(parseSearchDateRange('31/02/2026')).toBeNull()
  })

  test('rejects an out-of-range month or day', () => {
    expect(parseSearchDateRange('14/13/2026')).toBeNull()
    expect(parseSearchDateRange('32/01/2026')).toBeNull()
  })

  test('returns null for ordinary search text', () => {
    expect(parseSearchDateRange('robotics competition')).toBeNull()
    expect(parseSearchDateRange('Dato Zainal')).toBeNull()
  })
})
