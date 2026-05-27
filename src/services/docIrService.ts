import { CssLikeStyle, DocIR, DocIRBlock } from '../types/agent';

function hashString(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function paragraphMarkdown(text: string, style?: CssLikeStyle): string {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (style?.outlineLevel) {
        return `${'#'.repeat(Math.min(style.outlineLevel, 6))} ${trimmed}`;
    }
    return trimmed;
}

export function createEmptyDocIR(): DocIR {
    return {
        version: 'docir-1',
        stories: [{ story: 'body', blocks: [] }],
        styles: {},
        refs: [],
    };
}

export function paragraphsToDocIR(
    paragraphs: Array<{ text: string; style?: CssLikeStyle; rangeRef?: string }>,
    story: 'body' | 'header' | 'footer' = 'body',
    sectionIndex?: number
): DocIR {
    const blocks: DocIRBlock[] = paragraphs.map((paragraph, index) => {
        const rangeRef = paragraph.rangeRef || `${story}:p${index}`;
        const outlineLevel = paragraph.style?.outlineLevel;
        return {
            type: outlineLevel ? 'heading' : 'paragraph',
            rangeRef,
            markdown: paragraphMarkdown(paragraph.text, paragraph.style),
            text: paragraph.text,
            style: paragraph.style,
            word: {
                outlineLevel,
                section: sectionIndex,
                ooxmlHash: hashString(`${rangeRef}:${paragraph.text}`),
            },
        };
    });

    return {
        version: 'docir-1',
        stories: [{ story, sectionIndex, blocks }],
        styles: {},
        refs: blocks.map(block => ({ rangeRef: block.rangeRef })),
    };
}

export function docIRToMarkdown(doc: DocIR, maxChars: number = 12000): string {
    const parts: string[] = [];
    for (const story of doc.stories) {
        if (story.story !== 'body') {
            parts.push(`<!-- ${story.story}${story.sectionIndex !== undefined ? `:${story.sectionIndex}` : ''} -->`);
        }
        for (const block of story.blocks) {
            if (block.markdown) parts.push(block.markdown);
        }
    }
    const text = parts.join('\n\n');
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n...[truncated]` : text;
}

export function docIRToHtml(doc: DocIR): string {
    const html: string[] = [];
    for (const story of doc.stories) {
        for (const block of story.blocks) {
            const escaped = escapeHtml(block.text || block.markdown);
            if (block.type === 'heading') {
                const level = block.style?.outlineLevel || block.word?.outlineLevel || 1;
                html.push(`<p class="heading${Math.min(level, 3)}">${escaped}</p>`);
            } else if (block.type === 'quote') {
                html.push(`<p class="quote">${escaped}</p>`);
            } else if (block.type === 'code') {
                html.push(`<pre class="code">${escaped}</pre>`);
            } else {
                html.push(`<p>${escaped}</p>`);
            }
        }
    }
    return html.join('\n');
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
