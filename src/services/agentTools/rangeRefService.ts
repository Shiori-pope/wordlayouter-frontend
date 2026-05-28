export type AgentStory = 'body' | 'selection' | 'header' | 'footer' | 'table' | 'footnote' | 'endnote';

export type ParsedRangeRef =
    | { kind: 'body-paragraph'; story: 'body'; paragraphIndex: number }
    | { kind: 'body-paragraph-range'; story: 'body'; startParagraph: number; endParagraph: number }
    | { kind: 'body-text-span'; story: 'body'; paragraphIndex: number; start: number; end: number }
    | { kind: 'table'; story: 'table'; tableIndex: number }
    | { kind: 'table-cell'; story: 'table'; tableIndex: number; rowIndex: number; cellIndex: number }
    | { kind: 'header-footer-paragraph'; story: 'header' | 'footer'; sectionIndex: number; headerFooterKind: 'primary' | 'firstPage' | 'evenPages'; paragraphIndex: number }
    | { kind: 'note'; story: 'footnote' | 'endnote'; noteIndex: number; paragraphIndex?: number }
    | { kind: 'selection'; story: 'selection' }
    | { kind: 'body'; story: 'body' };

function toNumber(value: string): number {
    return Number.parseInt(value, 10);
}

export function rangeRefForParagraph(index: number): string {
    return `body:p${index}`;
}

export function rangeRefForParagraphRange(start: number, end: number): string {
    return `body:p${Math.min(start, end)}-${Math.max(start, end)}`;
}

export function parseRangeRef(rangeRef: string | undefined | null): ParsedRangeRef | null {
    if (!rangeRef || rangeRef === 'selection') return { kind: 'selection', story: 'selection' };
    if (rangeRef === 'body') return { kind: 'body', story: 'body' };

    let match = rangeRef.match(/^body:p(\d+):r(\d+)-(\d+)$/);
    if (match) {
        return {
            kind: 'body-text-span',
            story: 'body',
            paragraphIndex: toNumber(match[1]),
            start: toNumber(match[2]),
            end: toNumber(match[3]),
        };
    }

    match = rangeRef.match(/^body:p(\d+)-(\d+)$/);
    if (match) {
        const start = toNumber(match[1]);
        const end = toNumber(match[2]);
        return {
            kind: 'body-paragraph-range',
            story: 'body',
            startParagraph: Math.min(start, end),
            endParagraph: Math.max(start, end),
        };
    }

    match = rangeRef.match(/^body:p(\d+)$/);
    if (match) {
        return { kind: 'body-paragraph', story: 'body', paragraphIndex: toNumber(match[1]) };
    }

    match = rangeRef.match(/^table:t(\d+):r(\d+):c(\d+)$/);
    if (match) {
        return {
            kind: 'table-cell',
            story: 'table',
            tableIndex: toNumber(match[1]),
            rowIndex: toNumber(match[2]),
            cellIndex: toNumber(match[3]),
        };
    }

    match = rangeRef.match(/^table:t(\d+)$/);
    if (match) {
        return { kind: 'table', story: 'table', tableIndex: toNumber(match[1]) };
    }

    match = rangeRef.match(/^section:s(\d+):(header|footer):(primary|firstPage|evenPages):p(\d+)$/);
    if (match) {
        return {
            kind: 'header-footer-paragraph',
            story: match[2] as 'header' | 'footer',
            sectionIndex: toNumber(match[1]),
            headerFooterKind: match[3] as 'primary' | 'firstPage' | 'evenPages',
            paragraphIndex: toNumber(match[4]),
        };
    }

    match = rangeRef.match(/^(footnote|endnote):n(\d+)(?::p(\d+))?$/);
    if (match) {
        return {
            kind: 'note',
            story: match[1] as 'footnote' | 'endnote',
            noteIndex: toNumber(match[2]),
            paragraphIndex: match[3] ? toNumber(match[3]) : undefined,
        };
    }

    return null;
}

export function affectedRangeRefsFromArgs(args: Record<string, unknown>): string[] {
    const refs = new Set<string>();
    for (const key of ['target', 'rangeRef', 'afterRangeRef', 'beforeRangeRef', 'sectionRef']) {
        const value = args[key];
        if (typeof value === 'string' && value) refs.add(value);
    }
    if (Array.isArray(args.rangeRefs)) {
        for (const value of args.rangeRefs) {
            if (typeof value === 'string' && value) refs.add(value);
        }
    }
    if (Array.isArray(args.updates)) {
        for (const update of args.updates) {
            if (update && typeof update === 'object' && typeof (update as Record<string, unknown>).rangeRef === 'string') {
                refs.add((update as Record<string, string>).rangeRef);
            }
        }
    }
    return Array.from(refs);
}
