import type { PipelineStage } from 'mongoose'
import type { EntitiSekolah } from 'src/types/entities'
import { escapeStringRegex } from 'src/utils/escape-string-regex'

// Atlas Search index name (see atlas/search-indexes/sekolah_search.json).
export const SCHOOL_SEARCH_INDEX = 'sekolah_search'
// Atlas Search synonym mapping name (source collection: school_synonyms).
// Handles abbreviations like "smk" -> "sekolah menengah kebangsaan".
export const SCHOOL_SYNONYMS = 'school_synonyms'

// Text fields searched for a school name query. Kept in one place so /schools/search
// and /schools/find-nearby stay in sync.
export const SCHOOL_NAME_SEARCH_PATHS = [
  'namaSekolah',
  'namaRingkas',
  'data.infoKomunikasi.alamatSurat',
  'data.infoKomunikasi.bandarSurat',
  'data.infoPentadbiran.parlimen',
  'data.infoPentadbiran.negeri',
] as const

// Port of fuzzy_api_v2.py (v2.3): BM25 over a per-school token corpus, with a
// character n-gram TF-IDF cosine fallback for typos. Exact AND across every
// query token wins; fuzzy expansion only runs when no school has them all.
const BM25_K1 = 1.2
const BM25_B = 0.75
const MIN_CHAR_TFIDF_SIMILARITY = 0.1
const MAX_EXPANSIONS_PER_TOKEN = 100
const SCORE_THRESHOLD = 55

export type RankedFuzzySchool = {
  school: EntitiSekolah
  score: number
}

function normalizeSearchText(value: unknown): string {
  return (
    String(value ?? '')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toUpperCase()
      .replace(/&/g, ' DAN ')
      .match(/[A-Z0-9]+/g)
      ?.join(' ') ?? ''
  )
}

function normalizeCompact(value: unknown): string {
  return normalizeSearchText(value).replace(/ /g, '')
}

function whitespacePieces(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

function queryTokens(value: string): string[] {
  return [...new Set(whitespacePieces(value).map(normalizeCompact).filter(Boolean))]
}

function corpusTokens(value: string, includeCompact: boolean): string[] {
  const tokens = normalizeSearchText(value)
    .split(' ')
    .filter(token => token.length > 1 || /^[0-9]+$/.test(token))
  for (const piece of whitespacePieces(value)) {
    const compact = normalizeCompact(piece)
    if (compact && !tokens.includes(compact)) tokens.push(compact)
  }
  if (includeCompact) {
    const compact = normalizeCompact(value)
    if (compact && !tokens.includes(compact)) tokens.push(compact)
  }
  return tokens
}

function characterNgrams(value: string): Map<string, number> {
  const padded = `^${value}$`
  const counts = new Map<string, number>()
  for (let size = 1; size <= 4; size++) {
    for (let index = 0; index + size <= padded.length; index++) {
      const ngram = padded.slice(index, index + size)
      counts.set(ngram, (counts.get(ngram) ?? 0) + 1)
    }
  }
  return counts
}

// Searchable fields (value, includeCompact), mirroring the v2 CSV columns:
// KODSEKOLAH, JENIS/LABEL, NAMA_PENUH, BANDARSURAT, CALON_* (= namaRingkas).
function searchableValues(school: EntitiSekolah): [string, boolean][] {
  return [
    [String(school.kodSekolah ?? ''), true],
    [String(school.data?.infoSekolah?.jenisLabel ?? ''), true],
    [String(school.namaSekolah ?? ''), false],
    [String(school.data?.infoKomunikasi?.bandarSurat ?? ''), true],
    ...(school.namaRingkas ?? []).map((alias): [string, boolean] => [alias, true]),
  ]
}

// Minimal fields {@link rankFuzzySchools} reads (see searchableValues). Fetch a lightweight
// candidate set with this projection before ranking in memory. Keep in sync with searchableValues.
export const FUZZY_CANDIDATE_PROJECTION = {
  kodSekolah: 1,
  namaSekolah: 1,
  namaRingkas: 1,
  'data.infoSekolah.jenisLabel': 1,
  'data.infoKomunikasi.bandarSurat': 1,
} as const

type Expansion = { token: string; similarity: number; exact: boolean }

class SchoolCorpusIndex {
  private readonly postings = new Map<string, [number, number][]>()
  private readonly documentLengths: number[] = []
  private readonly averageDocumentLength: number
  private readonly ngramsByToken = new Map<string, Map<string, number>>()
  private readonly ngramIdf = new Map<string, number>()
  private readonly ngramNormByToken = new Map<string, number>()
  private readonly tokensByNgram = new Map<string, string[]>()
  readonly indexByCode = new Map<string, number>()

  constructor(private readonly schools: EntitiSekolah[]) {
    const ngramDocumentFrequency = new Map<string, number>()
    schools.forEach((school, schoolIndex) => {
      this.indexByCode.set(school.kodSekolah, schoolIndex)
      const terms = new Map<string, number>()
      for (const [value, includeCompact] of searchableValues(school)) {
        for (const token of corpusTokens(value, includeCompact)) {
          terms.set(token, (terms.get(token) ?? 0) + 1)
        }
      }
      let length = 0
      const documentNgrams = new Set<string>()
      for (const [token, frequency] of terms) {
        length += frequency
        let tokenPostings = this.postings.get(token)
        if (!tokenPostings) {
          tokenPostings = []
          this.postings.set(token, tokenPostings)
          this.ngramsByToken.set(token, characterNgrams(token))
        }
        tokenPostings.push([schoolIndex, frequency])
        for (const ngram of this.ngramsByToken.get(token)!.keys()) documentNgrams.add(ngram)
      }
      this.documentLengths.push(length)
      for (const ngram of documentNgrams) {
        ngramDocumentFrequency.set(ngram, (ngramDocumentFrequency.get(ngram) ?? 0) + 1)
      }
    })

    const documentCount = schools.length
    for (const [ngram, frequency] of ngramDocumentFrequency) {
      this.ngramIdf.set(ngram, Math.log((documentCount + 1) / (frequency + 1)) + 1)
    }
    for (const [token, counts] of this.ngramsByToken) {
      let squares = 0
      for (const [ngram, count] of counts) {
        squares += (count * this.ngramIdf.get(ngram)!) ** 2
        let tokens = this.tokensByNgram.get(ngram)
        if (!tokens) {
          tokens = []
          this.tokensByNgram.set(ngram, tokens)
        }
        tokens.push(token)
      }
      this.ngramNormByToken.set(token, Math.sqrt(squares))
    }
    this.averageDocumentLength = this.documentLengths.reduce((sum, length) => sum + length, 0) / Math.max(1, documentCount)
  }

  private idf(token: string): number {
    const frequency = this.postings.get(token)?.length ?? 0
    return Math.log(1 + (this.schools.length - frequency + 0.5) / (frequency + 0.5))
  }

  private bm25(token: string, schoolIndex: number, termFrequency: number): number {
    const length = this.documentLengths[schoolIndex]!
    const denominator = termFrequency + BM25_K1 * (1 - BM25_B + (BM25_B * length) / this.averageDocumentLength)
    return (this.idf(token) * termFrequency * (BM25_K1 + 1)) / denominator
  }

  private expansions(token: string): Expansion[] {
    const queryCounts = characterNgrams(token)
    const unseenIdf = Math.log(this.schools.length + 1) + 1
    const weight = (ngram: string) => this.ngramIdf.get(ngram) ?? unseenIdf
    let querySquares = 0
    const candidateTokens = new Set<string>()
    for (const [ngram, count] of queryCounts) {
      querySquares += (count * weight(ngram)) ** 2
      for (const candidate of this.tokensByNgram.get(ngram) ?? []) candidateTokens.add(candidate)
    }
    const queryNorm = Math.sqrt(querySquares)

    const expansions: Expansion[] = []
    for (const vocabularyToken of candidateTokens) {
      const vocabularyCounts = this.ngramsByToken.get(vocabularyToken)!
      let dotProduct = 0
      for (const [ngram, queryCount] of queryCounts) {
        dotProduct += queryCount * (vocabularyCounts.get(ngram) ?? 0) * weight(ngram) ** 2
      }
      const denominator = queryNorm * this.ngramNormByToken.get(vocabularyToken)!
      const similarity = denominator ? dotProduct / denominator : 0
      if (similarity < MIN_CHAR_TFIDF_SIMILARITY) continue
      expansions.push({ token: vocabularyToken, similarity, exact: vocabularyToken === token })
    }
    return expansions
      .sort(
        (left, right) =>
          right.similarity - left.similarity ||
          this.idf(right.token) - this.idf(left.token) ||
          (left.token < right.token ? -1 : left.token > right.token ? 1 : 0),
      )
      .slice(0, MAX_EXPANSIONS_PER_TOKEN)
  }

  /**
   * Ranked school indices (into the array the index was built from) with scores, considering only
   * schools in `allowed` — the request's filtered/geo candidate set. IDF stays corpus-wide, as in
   * v2 (which indexes every school).
   */
  search(query: string, allowed: Set<number>): { schoolIndex: number; score: number }[] {
    const tokens = queryTokens(query)
    if (tokens.length === 0) return []

    // Exact AND across all query tokens wins. Fuzzy is a fallback only
    // when no school contains every token in the combined corpus.
    let exactCandidates = new Set(
      (this.postings.get(tokens[0]!) ?? []).map(([schoolIndex]) => schoolIndex).filter(schoolIndex => allowed.has(schoolIndex)),
    )
    for (const token of tokens.slice(1)) {
      const withToken = new Set((this.postings.get(token) ?? []).map(([schoolIndex]) => schoolIndex))
      exactCandidates = new Set([...exactCandidates].filter(schoolIndex => withToken.has(schoolIndex)))
    }
    const exactMode = exactCandidates.size > 0

    // Per query token: best (contribution, similarity, expansion) for each school.
    const perQueryMatches = tokens.map(token => {
      const expansions = exactMode ? [{ token, similarity: 1, exact: true }] : this.expansions(token)
      const documentMatches = new Map<number, { contribution: number; similarity: number; exact: boolean }>()
      for (const expansion of expansions) {
        for (const [schoolIndex, termFrequency] of this.postings.get(expansion.token) ?? []) {
          if (!allowed.has(schoolIndex) || (exactMode && !exactCandidates.has(schoolIndex))) continue
          const contribution = expansion.similarity * this.bm25(expansion.token, schoolIndex, termFrequency)
          const current = documentMatches.get(schoolIndex)
          if (
            !current ||
            expansion.similarity > current.similarity ||
            (expansion.similarity === current.similarity && contribution > current.contribution)
          ) {
            documentMatches.set(schoolIndex, { contribution, similarity: expansion.similarity, exact: expansion.exact })
          }
        }
      }
      return documentMatches
    })

    const candidateSchools = [...perQueryMatches[0]!.keys()].filter(schoolIndex =>
      perQueryMatches.every(documentMatches => documentMatches.has(schoolIndex)),
    )

    const rawResults = candidateSchools.map(schoolIndex => {
      const matches = perQueryMatches.map(documentMatches => documentMatches.get(schoolIndex)!)
      return {
        schoolIndex,
        bm25Total: matches.reduce((sum, match) => sum + match.contribution, 0),
        lexicalScore: matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length,
        exactMatches: matches.filter(match => match.exact).length,
      }
    })
    const maximumBm25 = Math.max(0, ...rawResults.map(result => result.bm25Total))

    return rawResults
      .map(result => ({
        ...result,
        score: 100 * (0.9 * result.lexicalScore + 0.1 * (maximumBm25 ? result.bm25Total / maximumBm25 : 0)),
      }))
      .filter(result => result.score >= SCORE_THRESHOLD)
      .sort((left, right) => {
        const leftName = String(this.schools[left.schoolIndex]!.namaSekolah ?? '')
        const rightName = String(this.schools[right.schoolIndex]!.namaSekolah ?? '')
        return (
          right.score - left.score || right.exactMatches - left.exactMatches || (leftName < rightName ? -1 : leftName > rightName ? 1 : 0)
        )
      })
      .map(({ schoolIndex, score }) => ({ schoolIndex, score }))
  }
}

// Building the index over all ~10k schools costs ~450ms and ~140MB, so keep ONE index and reuse it
// for any candidate set it covers: the first unfiltered search builds the full corpus, after which
// filtered and map (geo-radius) searches are subsets and hit the cache.
// ponytail: TTL bounds staleness after a data import; add explicit invalidation if imports need
// to show up immediately.
const INDEX_CACHE_TTL_MS = 10 * 60 * 1000
let cachedIndex: { index: SchoolCorpusIndex; size: number; expiresAt: number } | null = null

function getCorpusIndex(schools: EntitiSekolah[]): SchoolCorpusIndex {
  const now = Date.now()
  if (cachedIndex && cachedIndex.expiresAt > now && schools.every(school => cachedIndex!.index.indexByCode.has(school.kodSekolah))) {
    return cachedIndex.index
  }
  const index = new SchoolCorpusIndex(schools)
  // Keep the larger corpus so a small filtered set can't evict the full one.
  if (!cachedIndex || cachedIndex.expiresAt <= now || schools.length >= cachedIndex.size) {
    cachedIndex = { index, size: schools.length, expiresAt: now + INDEX_CACHE_TTL_MS }
  }
  return index
}

/**
 * Ranks a bounded school candidate set in memory (v2 algorithm, see SchoolCorpusIndex).
 * Every query token must match (exactly, or via a fuzzy expansion) for a school to be returned.
 */
export function rankFuzzySchools(query: string, schools: EntitiSekolah[]): RankedFuzzySchool[] {
  // Results map back onto this request's objects by code: the cached index holds an earlier
  // request's copies, whose per-request fields such as geo `distance` would be stale.
  const index = getCorpusIndex(schools)
  const candidateByIndex = new Map<number, EntitiSekolah>()
  for (const school of schools) candidateByIndex.set(index.indexByCode.get(school.kodSekolah)!, school)
  return index
    .search(query, new Set(candidateByIndex.keys()))
    .map(({ schoolIndex, score }) => ({ school: candidateByIndex.get(schoolIndex)!, score }))
}

/**
 * Fuzzy + synonym + code clauses for a school name query, combined with OR semantics.
 *  - fuzzy (typo tolerant) across the name/address/parlimen/negeri paths
 *  - synonyms for abbreviations (e.g. "smk gombak" -> "sekolah menengah kebangsaan gombak").
 *    synonyms cannot be combined with fuzzy in the same text operator, so it is a separate clause.
 *  - kodSekolah exact/analyzed match (no fuzzy), boosted so a code match ranks first.
 */
export function buildFuzzyNameShould(name: string): Record<string, unknown>[] {
  return [
    {
      text: {
        query: name,
        path: [...SCHOOL_NAME_SEARCH_PATHS],
        fuzzy: { maxEdits: 2, prefixLength: 1 },
      },
    },
    {
      text: {
        query: name,
        path: 'namaSekolah',
        synonyms: SCHOOL_SYNONYMS,
      },
    },
    {
      text: {
        query: name,
        path: 'kodSekolah',
        score: { boost: { value: 5 } },
      },
    },
  ]
}

/**
 * Mandatory name clause for a compound query. Wraps {@link buildFuzzyNameShould} in a nested
 * compound with `minimumShouldMatch: 1` so it can be placed in a `must` array (a text query is
 * required, and cannot be satisfied by a geo/proximity clause alone).
 */
export function buildFuzzyNameMust(name: string): Record<string, unknown> {
  return {
    compound: { should: buildFuzzyNameShould(name), minimumShouldMatch: 1 },
  }
}

/** Atlas Search `geoWithin` circle filter (hard radius limit, meters). */
export function geoWithinCircleFilter(longitude: number, latitude: number, radiusMeters: number): Record<string, unknown> {
  return {
    geoWithin: {
      circle: {
        center: { type: 'Point', coordinates: [longitude, latitude] },
        radius: radiusMeters,
      },
      path: 'data.infoLokasi.location',
    },
  }
}

/** Atlas Search filter requiring the school to have a location (mirrors the legacy existence check). */
export function locationExistsFilter(): Record<string, unknown> {
  return { exists: { path: 'data.infoLokasi.location' } }
}

/**
 * Builds the leading `$search` aggregation stage for a fuzzy school name query.
 * `filters` are placed in the compound `filter` clause (e.g. geo radius, location existence).
 */
export function buildNameSearchStage(name: string, filters: Record<string, unknown>[] = []): PipelineStage {
  const compound: Record<string, unknown> = {
    must: [buildFuzzyNameMust(name)],
  }
  if (filters.length > 0) {
    compound.filter = filters
  }
  return {
    $search: { index: SCHOOL_SEARCH_INDEX, compound },
  } as unknown as PipelineStage
}

/**
 * Regex fallback for a school name query, mirroring the legacy behaviour. Used when Atlas
 * Search is unavailable so the endpoints degrade gracefully instead of failing.
 */
export function regexNameOr(name: string): Record<string, unknown> {
  const regexObj = { $regex: escapeStringRegex(name), $options: 'i' }
  return {
    $or: SCHOOL_NAME_SEARCH_PATHS.map(path => ({ [path]: regexObj })),
  }
}

// Dropdown filters shared by /schools/search and /schools/find-nearby. `'ALL'` (or empty)
// means "no filter". Kept here so the sidebar list and the map markers filter identically.
export type SchoolAttributeFilters = {
  negeri?: string
  peringkat?: string
  jenis?: string[]
}

/**
 * Atlas Search `equals` filters for the negeri / peringkat / jenis dropdowns. These paths are
 * indexed as `token` in sekolah_search.json so `equals` matches exactly. Placed in a compound
 * `filter` clause (no scoring impact — they only narrow the result set).
 */
export function buildAttributeFilters({ negeri, peringkat, jenis }: SchoolAttributeFilters): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = []

  if (negeri && negeri !== 'ALL') {
    filters.push({
      equals: { path: 'data.infoPentadbiran.negeri', value: negeri },
    })
  }

  if (jenis && jenis.length > 0 && !jenis.includes('ALL')) {
    filters.push({
      compound: {
        should: jenis.map(j => ({
          equals: { path: 'data.infoSekolah.jenisLabel', value: j },
        })),
        minimumShouldMatch: 1,
      },
    })
  }

  if (peringkat && peringkat !== 'ALL') {
    filters.push({
      equals: { path: 'data.infoPentadbiran.peringkat', value: peringkat },
    })
  }

  return filters
}

/**
 * Equivalent Mongo `$match` conditions for the negeri / peringkat / jenis dropdowns, used on the
 * regex fallback / non-Atlas path. Returned as an array so callers can combine them with other
 * conditions under `$and` (multiple `$or` clauses cannot share one object).
 */
export function buildAttributeMatch({ negeri, peringkat, jenis }: SchoolAttributeFilters): Record<string, unknown>[] {
  const conditions: Record<string, unknown>[] = []

  if (negeri && negeri !== 'ALL') {
    conditions.push({ 'data.infoPentadbiran.negeri': negeri })
  }

  if (jenis && jenis.length > 0 && !jenis.includes('ALL')) {
    conditions.push({
      $or: jenis.map(j => ({ 'data.infoSekolah.jenisLabel': j })),
    })
  }

  if (peringkat && peringkat !== 'ALL') {
    conditions.push({ 'data.infoPentadbiran.peringkat': peringkat })
  }

  return conditions
}
