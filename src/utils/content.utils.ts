import type { SiaranContent, AcaraContent, LexicalElementNode, LexicalTextNode, RenderedContent } from '@types'

const hasChildren = (node: LexicalElementNode): node is LexicalElementNode & { children: (LexicalTextNode | LexicalElementNode)[] } => {
    return 'children' in node && Array.isArray((node as { children?: unknown }).children);
}

export const renderContent = (content: SiaranContent | AcaraContent): RenderedContent => {
    if (!content || !content.root || !content.root.children) {
        return null;
    }

    const renderedElements = content.root.children.map((node: LexicalElementNode, index: number) => {
        if (node.type === 'paragraph') {
            if (!hasChildren(node) || node.children.length === 0) {
                return { type: 'br', key: index };
            }

            const textElements = node.children
                .filter((child): child is LexicalTextNode => child.type === 'text')
                .map((child: LexicalTextNode, childIndex: number) => ({
                    text: child.text,
                    format: child.format || 0,
                    style: child.style || '',
                    detail: child.detail || 0,
                    key: `${index}-${childIndex}`
                }));

            return {
                type: 'paragraph',
                key: index,
                format: node.format || '',
                textFormat: node.textFormat || 0,
                textStyle: node.textStyle || '',
                direction: node.direction || null,
                indent: node.indent || 0,
                textElements: textElements,
                content: textElements.map((el) => el.text).join('')
            };
        }
        return { type: 'br', key: index };
    });

    return renderedElements;
}

export const getPlainTextFromContent = (content: SiaranContent | AcaraContent): string => {
    if (!content || !content.root || !content.root.children) {
        return '';
    }

    return content.root.children
        .filter((node: LexicalElementNode): node is LexicalElementNode & { children: (LexicalTextNode | LexicalElementNode)[] } => {
            return node.type === 'paragraph' && hasChildren(node) && node.children.length > 0;
        })
        .map((node: LexicalElementNode & { children: (LexicalTextNode | LexicalElementNode)[] }) => {
            return node.children
                .filter((child: LexicalTextNode | LexicalElementNode): child is LexicalTextNode => child.type === 'text')
                .map((child: LexicalTextNode) => child.text)
                .join('');
        })
        .join(' ');
};