import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { MoeNewsModel } from 'src/models/moeNews.model'
import { SystemConfigModel } from 'src/models/system-config.model'

import { buildLexicalContentFromPlainText, countMoeNews, isMoeSyncStale, syncMoeNews } from '../src/services/moeNews.svc'

function mockMoeNewsApiResponse(overrides: Partial<{ hasNext: boolean; image: Array<{ url?: string; alt?: string }> }> = {}) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: [
          {
            title: 'Test MOE Article',
            description: 'Description text',
            image: overrides.image ?? [{ url: 'https://moe.gov.my/img.jpg', alt: 'alt text' }],
            source_url: 'https://www.moe.gov.my/test-article',
            date_posted: '2026-01-01 00:00:00',
          },
        ],
        pagination: { page: 1, limit: 24, total: 1, has_next: overrides.hasNext ?? false },
      }),
  }
}

describe('moeNews service', () => {
  beforeEach(() => {
    mock.module('../src/config/db.config', () => ({
      sekolahkuConnection: { model: mock(() => ({})) },
      payloadConnection: { model: mock(() => ({})) },
    }))

    MoeNewsModel.updateOne = mock(() => Promise.resolve({})) as unknown as typeof MoeNewsModel.updateOne
    MoeNewsModel.countDocuments = mock(() => Promise.resolve(3)) as unknown as typeof MoeNewsModel.countDocuments

    SystemConfigModel.findOne = mock(() => ({ lean: mock(() => Promise.resolve(null)) })) as unknown as typeof SystemConfigModel.findOne
    SystemConfigModel.updateOne = mock(() => Promise.resolve({})) as unknown as typeof SystemConfigModel.updateOne

    global.fetch = mock(() => Promise.resolve(mockMoeNewsApiResponse())) as unknown as typeof fetch
  })

  describe('isMoeSyncStale', () => {
    test('returns true when no sync record exists', async () => {
      expect(await isMoeSyncStale()).toBe(true)
    })

    test('returns false when synced within the TTL', async () => {
      SystemConfigModel.findOne = mock(() => ({
        lean: mock(() => Promise.resolve({ updatedAt: new Date() })),
      })) as unknown as typeof SystemConfigModel.findOne

      expect(await isMoeSyncStale()).toBe(false)
    })

    test('returns true when the last sync is older than the TTL', async () => {
      const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
      SystemConfigModel.findOne = mock(() => ({
        lean: mock(() => Promise.resolve({ updatedAt: staleDate })),
      })) as unknown as typeof SystemConfigModel.findOne

      expect(await isMoeSyncStale()).toBe(true)
    })
  })

  describe('syncMoeNews', () => {
    test('upserts each article keyed by sourceUrl', async () => {
      await syncMoeNews()

      expect(MoeNewsModel.updateOne).toHaveBeenCalledWith(
        { sourceUrl: 'https://www.moe.gov.my/test-article' },
        {
          $set: {
            title: 'Test MOE Article',
            description: 'Description text',
            images: [{ url: 'https://moe.gov.my/img.jpg', alt: 'alt text' }],
            datePosted: new Date('2026-01-01 00:00:00'),
          },
        },
        { upsert: true },
      )
    })

    test('captures every image the API returns, not just the first', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          mockMoeNewsApiResponse({
            image: [
              { url: 'https://moe.gov.my/img1.jpg', alt: 'first' },
              { url: 'https://moe.gov.my/img2.jpg', alt: 'second' },
            ],
          }),
        ),
      ) as unknown as typeof fetch

      await syncMoeNews()

      expect(MoeNewsModel.updateOne).toHaveBeenCalledWith(
        { sourceUrl: 'https://www.moe.gov.my/test-article' },
        {
          $set: {
            title: 'Test MOE Article',
            description: 'Description text',
            images: [
              { url: 'https://moe.gov.my/img1.jpg', alt: 'first' },
              { url: 'https://moe.gov.my/img2.jpg', alt: 'second' },
            ],
            datePosted: new Date('2026-01-01 00:00:00'),
          },
        },
        { upsert: true },
      )
    })

    test('drops images with a missing url', async () => {
      global.fetch = mock(() =>
        Promise.resolve(mockMoeNewsApiResponse({ image: [{ alt: 'no url' }, { url: 'https://moe.gov.my/img2.jpg' }] })),
      ) as unknown as typeof fetch

      await syncMoeNews()

      expect(MoeNewsModel.updateOne).toHaveBeenCalledWith(
        { sourceUrl: 'https://www.moe.gov.my/test-article' },
        {
          $set: {
            title: 'Test MOE Article',
            description: 'Description text',
            images: [{ url: 'https://moe.gov.my/img2.jpg', alt: undefined }],
            datePosted: new Date('2026-01-01 00:00:00'),
          },
        },
        { upsert: true },
      )
    })

    test('stops paging once the API reports no next page', async () => {
      await syncMoeNews()
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    test('throws when the MOE API responds with an error status', async () => {
      global.fetch = mock(() => Promise.resolve({ ok: false, status: 500 })) as unknown as typeof fetch
      await expect(syncMoeNews()).rejects.toThrow('MOE news API returned unexpected status 500')
    })
  })

  describe('countMoeNews', () => {
    test('returns the collection document count', async () => {
      expect(await countMoeNews()).toBe(3)
    })
  })

  describe('buildLexicalContentFromPlainText', () => {
    function paragraphTexts(content: ReturnType<typeof buildLexicalContentFromPlainText>): string[] {
      return (content.root.children as Array<{ children: Array<{ text: string }> }>).map(p => p.children[0]?.text ?? '')
    }

    test('splits blank-line-separated text into separate paragraphs', () => {
      const content = buildLexicalContentFromPlainText('Paragraph one.\r\n\r\nParagraph two.')
      expect(paragraphTexts(content)).toEqual(['Paragraph one.', 'Paragraph two.'])
    })

    test('decodes common HTML entities', () => {
      const content = buildLexicalContentFromPlainText('Ibu &amp; bapa&nbsp;perlu hadir &lt;segera&gt;')
      expect(paragraphTexts(content)).toEqual(['Ibu & bapa perlu hadir <segera>'])
    })

    test('strips stray HTML tags', () => {
      const content = buildLexicalContentFromPlainText('<p>Teks penting</p>')
      expect(paragraphTexts(content)).toEqual(['Teks penting'])
    })

    test('falls back to a single paragraph when there are no blank-line breaks', () => {
      const content = buildLexicalContentFromPlainText('Satu ayat tunggal tanpa perenggan.')
      expect(paragraphTexts(content)).toEqual(['Satu ayat tunggal tanpa perenggan.'])
    })
  })
})
