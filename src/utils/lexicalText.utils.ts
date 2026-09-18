import type { LexicalElementNode, LexicalTextNode, SiaranContent } from '@types'

// Siaran (CMS) content has no stored plain-text field, only a Lexical rich
// text tree, so description search has to walk it at query time.
export function extractLexicalPlainText(content?: SiaranContent): string {
  if (!content?.root) return ''

  const parts: string[] = []
  const walk = (node: LexicalElementNode | LexicalTextNode) => {
    if ('text' in node && typeof node.text === 'string') parts.push(node.text)
    if ('children' in node && node.children) node.children.forEach(walk)
  }
  content.root.children.forEach(walk)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
