import { describe, expect, test } from 'bun:test'
import type { SiaranContent } from 'src/types/entities'
import { extractLexicalPlainText } from 'src/utils/lexicalText.utils'

describe('extractLexicalPlainText', () => {
  test('returns empty string when content is missing', () => {
    expect(extractLexicalPlainText(undefined)).toBe('')
  })

  test('walks nested paragraphs and joins text nodes', () => {
    const content = {
      root: {
        children: [
          { children: [{ text: 'Syabas dan Tahniah!' }], type: 'paragraph', direction: 'ltr', format: '', indent: 0, version: 1 },
          {
            children: [{ text: 'NRC 2026' }, { text: 'edisi ke-22' }],
            type: 'paragraph',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as SiaranContent

    expect(extractLexicalPlainText(content)).toBe('Syabas dan Tahniah! NRC 2026 edisi ke-22')
  })
})
