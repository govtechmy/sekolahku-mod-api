import type { EntitiSekolah } from 'src/types/entities'

// Port of fuzzy_api_v2.py: BM25 over a per-school token corpus. Each query token first matches
// strictly (exact, or contained in a longer word: GAMBUT -> SEGAMBUT); only when no school matches
// every token that way does the character n-gram TF-IDF cosine fallback for typos run.
const BM25_K1 = 1.2
const BM25_B = 0.75
const MIN_CHAR_TFIDF_SIMILARITY = 0.1
const MAX_EXPANSIONS_PER_TOKEN = 100
const TOKEN_PARTIAL_THRESHOLD = 95
const PARTIAL_SIMILARITY_CAP = 0.95
const SCORE_THRESHOLD = 55

export type RankedFuzzySchool = {
  school: EntitiSekolah
  score: number
  /** Query tokens matched as a whole word in any searchable field (GAMBUT in "SK GAMBUT", not in "SEGAMBUT"). */
  exactMatches: number
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

function longestCommonSubsequence(left: string, right: string): number {
  let previous = new Array<number>(right.length + 1).fill(0)
  for (const leftChar of left) {
    const current = [0]
    for (let index = 0; index < right.length; index++) {
      current.push(leftChar === right[index] ? previous[index]! + 1 : Math.max(previous[index + 1]!, current[index]!))
    }
    previous = current
  }
  return previous[right.length]!
}

// Best indel ratio of `needle` against the haystack windows that can reach TOKEN_PARTIAL_THRESHOLD:
// every window of the needle's length plus the shorter prefixes/suffixes at either edge. A window of
// length L scores at most 200L/(n+L), so edge windows shorter than 95n/105 are skipped.
function windowScan(needle: string, haystack: string): number {
  const n = needle.length
  const minEdge = Math.ceil((TOKEN_PARTIAL_THRESHOLD * n) / (200 - TOKEN_PARTIAL_THRESHOLD))
  const score = (window: string) => (200 * longestCommonSubsequence(needle, window)) / (n + window.length)
  let best = 0
  for (let end = minEdge; end < n; end++) best = Math.max(best, score(haystack.slice(0, end)))
  for (let start = 0; start + n <= haystack.length; start++) best = Math.max(best, score(haystack.slice(start, start + n)))
  for (let start = haystack.length - n + 1; start <= haystack.length - minEdge; start++) {
    best = Math.max(best, score(haystack.slice(start)))
  }
  return best
}

/**
 * rapidfuzz `fuzz.partial_ratio(needle, haystack)` for `needle.length <= haystack.length`. Exact at
 * or above TOKEN_PARTIAL_THRESHOLD; below it the result may be lower than rapidfuzz's (only the
 * threshold comparison matters).
 */
function partialRatio(needle: string, haystack: string): number {
  if (haystack.includes(needle)) return 100
  // Without a full substring, a window scores at most 2(n-1)/(2n-1), below 95 for n <= 10.
  if (needle.length <= 10) return 0
  // rapidfuzz also scans with the roles swapped when both strings are the same length.
  if (needle.length === haystack.length) return Math.max(windowScan(needle, haystack), windowScan(haystack, needle))
  return windowScan(needle, haystack)
}

type MatchMethod = 'EXACT' | 'PARTIAL' | 'CHAR_TFIDF'
type Expansion = { token: string; similarity: number; method: MatchMethod }
type DocumentMatch = { contribution: number; similarity: number; method: MatchMethod }

class SchoolCorpusIndex {
  private readonly postings = new Map<string, [number, number][]>()
  private readonly documentLengths: number[] = []
  private readonly averageDocumentLength: number
  private readonly ngramsByToken = new Map<string, Map<string, number>>()
  private readonly ngramIdf = new Map<string, number>()
  private readonly ngramNormByToken = new Map<string, number>()
  private readonly tokensByNgram = new Map<string, string[]>()
  private readonly partialVocabulary: string[]
  readonly indexByCode = new Map<string, number>()

  constructor(private readonly schools: EntitiSekolah[]) {
    const ngramDocumentFrequency = new Map<string, number>()
    const partialTokens = new Set<string>()
    schools.forEach((school, schoolIndex) => {
      this.indexByCode.set(school.kodSekolah, schoolIndex)
      const terms = new Map<string, number>()
      for (const [value, includeCompact] of searchableValues(school)) {
        for (const token of normalizeSearchText(value).split(' ')) {
          if (token.length > 1 || /^[0-9]+$/.test(token)) partialTokens.add(token)
        }
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

    this.partialVocabulary = [...partialTokens]
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
      expansions.push({ token: vocabularyToken, similarity, method: vocabularyToken === token ? 'EXACT' : 'CHAR_TFIDF' })
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

  private partialExpansions(token: string): Expansion[] {
    const expansions: Expansion[] = []
    for (const vocabularyToken of this.partialVocabulary) {
      if (vocabularyToken.length < token.length || vocabularyToken === token) continue
      const score = partialRatio(token, vocabularyToken)
      if (score >= TOKEN_PARTIAL_THRESHOLD) {
        expansions.push({ token: vocabularyToken, similarity: Math.min(score / 100, PARTIAL_SIMILARITY_CAP), method: 'PARTIAL' })
      }
    }
    if (this.postings.has(token)) expansions.push({ token, similarity: 1, method: 'EXACT' })
    return expansions
  }

  /** Per school in `allowed`: the best (contribution, similarity, method) over `expansions`. */
  private documentMatches(expansions: Expansion[], allowed: Set<number>): Map<number, DocumentMatch> {
    const documentMatches = new Map<number, DocumentMatch>()
    for (const expansion of expansions) {
      for (const [schoolIndex, termFrequency] of this.postings.get(expansion.token) ?? []) {
        if (!allowed.has(schoolIndex)) continue
        const contribution = expansion.similarity * this.bm25(expansion.token, schoolIndex, termFrequency)
        const current = documentMatches.get(schoolIndex)
        if (
          !current ||
          expansion.similarity > current.similarity ||
          (expansion.similarity === current.similarity && expansion.method === 'EXACT' && current.method !== 'EXACT') ||
          (expansion.similarity === current.similarity && expansion.method === current.method && contribution > current.contribution)
        ) {
          documentMatches.set(schoolIndex, { contribution, similarity: expansion.similarity, method: expansion.method })
        }
      }
    }
    return documentMatches
  }

  /**
   * Ranked school indices (into the array the index was built from) with scores, considering only
   * schools in `allowed` — the request's filtered/geo candidate set. IDF stays corpus-wide, as in
   * v2 (which indexes every school).
   */
  search(query: string, allowed: Set<number>): { schoolIndex: number; score: number; exactMatches: number }[] {
    const tokens = queryTokens(query)
    if (tokens.length === 0) return []

    const inEvery = (perToken: Map<number, DocumentMatch>[]) =>
      [...perToken[0]!.keys()].filter(schoolIndex => perToken.every(matches => matches.has(schoolIndex)))

    // Strict (exact/partial) matching wins when some school matches every token that way; fuzzy
    // expansion is only the fallback.
    const strictMatches = tokens.map(token => this.documentMatches(this.partialExpansions(token), allowed))
    let candidateSchools = inEvery(strictMatches)
    let perQueryMatches = strictMatches
    if (candidateSchools.length === 0) {
      perQueryMatches = tokens.map(token => this.documentMatches(this.expansions(token), allowed))
      candidateSchools = inEvery(perQueryMatches)
    }

    const rawResults = candidateSchools.map(schoolIndex => {
      const matches = perQueryMatches.map(documentMatches => documentMatches.get(schoolIndex)!)
      return {
        schoolIndex,
        bm25Total: matches.reduce((sum, match) => sum + match.contribution, 0),
        lexicalScore: matches.reduce((sum, match) => sum + match.similarity, 0) / matches.length,
        exactMatches: matches.filter(match => match.method === 'EXACT').length,
      }
    })
    const maximumBm25 = Math.max(0, ...rawResults.map(result => result.bm25Total))

    // Exact token matches always rank above partial/fuzzy ones, then by score.
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
          right.exactMatches - left.exactMatches || right.score - left.score || (leftName < rightName ? -1 : leftName > rightName ? 1 : 0)
        )
      })
      .map(({ schoolIndex, score, exactMatches }) => ({ schoolIndex, score, exactMatches }))
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
 * Every query token must match (exactly, as part of a longer word, or via a fuzzy expansion) for a
 * school to be returned; schools with more exact token matches rank first.
 */
export function rankFuzzySchools(query: string, schools: EntitiSekolah[]): RankedFuzzySchool[] {
  // Results map back onto this request's objects by code: the cached index holds an earlier
  // request's copies, whose per-request fields such as geo `distance` would be stale.
  const index = getCorpusIndex(schools)
  const candidateByIndex = new Map<number, EntitiSekolah>()
  for (const school of schools) candidateByIndex.set(index.indexByCode.get(school.kodSekolah)!, school)
  return index
    .search(query, new Set(candidateByIndex.keys()))
    .map(({ schoolIndex, score, exactMatches }) => ({ school: candidateByIndex.get(schoolIndex)!, score, exactMatches }))
}

// Dropdown filters shared by /schools/search and /schools/find-nearby. `'ALL'` (or empty)
// means "no filter". Kept here so the sidebar list and the map markers filter identically.
export type SchoolAttributeFilters = {
  negeri?: string
  peringkat?: string
  jenis?: string[]
}

/**
 * Mongo `$match` conditions for the negeri / peringkat / jenis dropdowns. Returned as an array so
 * callers can combine them with other conditions under `$and` (multiple `$or` clauses cannot share one object).
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
