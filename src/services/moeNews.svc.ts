import type { LexicalElementNode, MoeNewsArticle, SiaranContent } from '@types'
import type { FilterQuery } from 'mongoose'
import { env } from 'src/config/env.config'
import { MoeNewsModel } from 'src/models/moeNews.model'
import { SystemConfigModel } from 'src/models/system-config.model'

const MOE_NEWS_API_URL = env.MOE_NEWS_API_URL
const SYNC_TTL_MS = 60 * 60 * 1000
const SYNC_CONFIG_KEY = 'moeNewsLastSyncedAt'
const MAX_SYNC_PAGES = 3
const SYNC_PAGE_LIMIT = 24

interface MoeNewsApiItem {
  title: string
  description: string
  image?: Array<{ url?: string; alt?: string }>
  source_url: string
  date_posted: string
}

interface MoeNewsApiResponse {
  data: MoeNewsApiItem[]
  pagination: { page: number; limit: number; total: number; has_next: boolean }
}

export async function isMoeSyncStale(): Promise<boolean> {
  const config = await SystemConfigModel.findOne({ key: SYNC_CONFIG_KEY }).lean()
  if (!config?.updatedAt) return true
  return Date.now() - new Date(config.updatedAt).getTime() > SYNC_TTL_MS
}

export async function syncMoeNews(): Promise<void> {
  for (let page = 1; page <= MAX_SYNC_PAGES; page++) {
    const response = await fetch(`${MOE_NEWS_API_URL}?page=${page}&limit=${SYNC_PAGE_LIMIT}`)
    if (!response.ok) {
      throw new Error(`MOE news API returned unexpected status ${response.status}`)
    }
    const body = (await response.json()) as MoeNewsApiResponse

    await Promise.all(
      body.data.map(item =>
        MoeNewsModel.updateOne(
          { sourceUrl: item.source_url },
          {
            $set: {
              title: item.title,
              description: item.description,
              images: (item.image ?? [])
                .filter((img): img is { url: string; alt?: string } => Boolean(img.url))
                .map(img => ({ url: img.url, alt: img.alt })),
              datePosted: new Date(item.date_posted),
            },
          },
          { upsert: true },
        ),
      ),
    )

    if (!body.pagination.has_next) break
  }

  await SystemConfigModel.updateOne({ key: SYNC_CONFIG_KEY }, { $set: { value: true, updatedAt: new Date() } }, { upsert: true })
}

export async function refreshMoeNewsIfStale(): Promise<void> {
  if (await isMoeSyncStale()) {
    await syncMoeNews()
  }
}

export async function getMoeNewsPage(skip: number, limit: number, filter: FilterQuery<MoeNewsArticle> = {}) {
  return MoeNewsModel.find(filter).sort({ datePosted: -1 }).skip(skip).limit(limit).lean()
}

export async function getMoeNewsById(id: string) {
  return MoeNewsModel.findById(id).lean()
}

export async function countMoeNews(filter: FilterQuery<MoeNewsArticle> = {}): Promise<number> {
  return MoeNewsModel.countDocuments(filter)
}

// MOE's API returns HTML-entity-encoded plain text (no id/category/rich-content),
// so it's decoded and wrapped as minimal Lexical paragraphs here, letting the
// existing @payloadcms/richtext-lexical renderer on FE display it unmodified.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
}

export function buildLexicalContentFromPlainText(rawText: string): SiaranContent {
  const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, ''))
  const paragraphs = text
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

  const children: LexicalElementNode[] = (paragraphs.length > 0 ? paragraphs : [text]).map(paragraph => ({
    children: [
      {
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text: paragraph,
        type: 'text',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }))

  return {
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}
