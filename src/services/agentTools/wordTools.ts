import {
    AgentContentFormat,
    AgentTarget,
    AgentToolCall,
    AgentToolDefinition,
    AgentToolName,
    CssLikeStyle,
    GrepDocumentParams,
    GrepDocumentResult,
    ToolResult,
} from '../../types/agent';
import { docIRToHtml, paragraphsToDocIR } from '../docIrService';
import { deleteSnapshot, restoreSnapshot } from '../documentSnapshotService';
import { applyInlineStyles, insertHtmlAsDocx } from '../../utils/htmlParser';
import { listToolOperations, recordToolOperation } from './toolOperationService';
import { validateToolArguments } from './toolValidationService';
import { parseRangeRef } from './rangeRefService';
import {
    ensureContentType,
    ensureRelationship,
    getCurrentDocxPackage,
    parseXmlPart,
    replaceCurrentDocxPackage,
    serializeXml,
    writePart,
} from './ooxmlPackageService';

type AnyRecord = Record<string, unknown>;

let activeAgentCssStyles = '';

export function setAgentToolCssStyles(cssStyles?: string) {
    activeAgentCssStyles = cssStyles || '';
}

function ok<T>(call: AgentToolCall, data: T, summary: string): ToolResult<T> {
    return { toolCallId: call.id, toolName: call.name, ok: true, data, summary };
}

function fail(call: AgentToolCall, code: string, message: string, recoverable = true): ToolResult {
    return {
        toolCallId: call.id,
        toolName: call.name,
        ok: false,
        error: { code, message, recoverable },
        summary: message,
    };
}

function asRecord(value: unknown): AnyRecord {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function parseParagraphRangeRef(rangeRef: string): number | null {
    const match = rangeRef.match(/^body:p(\d+)/);
    return match ? Number(match[1]) : null;
}

function parseParagraphTextSpan(rangeRef: string): { paragraphIndex: number; start: number; end: number } | null {
    const match = rangeRef.match(/^body:p(\d+):r(\d+)-(\d+)$/);
    if (!match) return null;
    return {
        paragraphIndex: Number(match[1]),
        start: Number(match[2]),
        end: Number(match[3]),
    };
}

function parseParagraphBlockRangeRef(rangeRef: string): { start: number; end: number } | null {
    const match = rangeRef.match(/^body:p(\d+)-(\d+)$/);
    if (!match) return null;
    const start = Number(match[1]);
    const end = Number(match[2]);
    return { start: Math.min(start, end), end: Math.max(start, end) };
}

function rangeRefForParagraph(index: number): string {
    return `body:p${index}`;
}

function inferHeadingLevel(text: string): number | undefined {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 80) return undefined;
    if (/^第[一二三四五六七八九十百\d]+[章节篇]\s*/.test(trimmed)) return 1;
    if (/^[一二三四五六七八九十]+[、.．]\s*/.test(trimmed)) return 1;
    if (/^[(（][一二三四五六七八九十\d]+[)）]\s*/.test(trimmed)) return 2;
    const dotted = trimmed.match(/^(\d+(?:\.\d+){0,3})[、.．\s]/);
    if (dotted) return Math.min(dotted[1].split('.').length, 4);
    return undefined;
}

function isLikelyTableCellText(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (trimmed.includes('\t')) return true;
    return trimmed.length <= 12 && !inferHeadingLevel(trimmed);
}

function normalizeHeadingText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
}

function buildHeadingSnapshot(paragraphs: Word.Paragraph[], maxDepth: number = 4) {
    return paragraphs
        .map((paragraph, index) => {
            const text = normalizeHeadingText(paragraph.text || '');
            const styled = String(paragraph.style || '').match(/heading\s*(\d)/i);
            const level = styled ? Number(styled[1]) : inferHeadingLevel(text);
            if (!text || !level || level > maxDepth || isLikelyTableCellText(text)) return null;
            return {
                rangeRef: rangeRefForParagraph(index),
                paragraphIndex: index,
                level,
                text,
                inferred: !styled,
            };
        })
        .filter(Boolean) as Array<{ rangeRef: string; paragraphIndex: number; level: number; text: string; inferred: boolean }>;
}

function paragraphSummary(paragraph: Word.Paragraph, paragraphIndex: number, includeFormat: 'none' | 'summary' = 'summary') {
    const text = normalizeHeadingText(paragraph.text || '');
    return {
        rangeRef: rangeRefForParagraph(paragraphIndex),
        paragraphIndex,
        text,
        headingLevel: inferHeadingLevel(text),
        style: includeFormat === 'summary' ? styleFromParagraph(paragraph) : undefined,
    };
}

function extractTopicTerms(topic: string): string[] {
    const normalized = topic
        .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
        .split(/\s+/)
        .map(term => term.trim())
        .filter(term => term.length >= 2);
    const compact = topic.replace(/\s+/g, '').trim();
    return Array.from(new Set([...normalized, compact].filter(Boolean)));
}

function findParagraphIndexContaining(paragraphs: Word.Paragraph[], query: string): number {
    const needle = query.trim().toLowerCase();
    if (!needle) return -1;
    return paragraphs.findIndex(paragraph => (paragraph.text || '').toLowerCase().includes(needle));
}

function resolveParagraphWindow(args: AnyRecord, paragraphCount: number): { start: number; end: number } {
    const block = parseParagraphBlockRangeRef(asString(args.rangeRef));
    if (block) return { start: clamp(block.start, 0, Math.max(0, paragraphCount - 1)), end: clamp(block.end, 0, Math.max(0, paragraphCount - 1)) };

    const single = parseParagraphRangeRef(asString(args.rangeRef));
    if (single !== null) {
        const maxParagraphs = clamp(asNumber(args.maxParagraphs, 40), 1, 200);
        const radius = Math.floor(maxParagraphs / 2);
        return {
            start: clamp(single - radius, 0, Math.max(0, paragraphCount - 1)),
            end: clamp(single + radius, 0, Math.max(0, paragraphCount - 1)),
        };
    }

    const after = parseParagraphRangeRef(asString(args.afterRangeRef));
    if (after !== null) {
        const maxParagraphs = clamp(asNumber(args.maxParagraphs, 40), 1, 200);
        const start = clamp(after + 1, 0, Math.max(0, paragraphCount - 1));
        return { start, end: clamp(start + maxParagraphs - 1, 0, Math.max(0, paragraphCount - 1)) };
    }

    const before = parseParagraphRangeRef(asString(args.beforeRangeRef));
    if (before !== null) {
        const maxParagraphs = clamp(asNumber(args.maxParagraphs, 40), 1, 200);
        const end = clamp(before - 1, 0, Math.max(0, paragraphCount - 1));
        return { start: clamp(end - maxParagraphs + 1, 0, Math.max(0, paragraphCount - 1)), end };
    }

    const maxParagraphs = clamp(asNumber(args.maxParagraphs, 40), 1, 200);
    const start = clamp(asNumber(args.startParagraph, 0), 0, Math.max(0, paragraphCount - 1));
    const explicitEnd = typeof args.endParagraph === 'number' ? asNumber(args.endParagraph, start + maxParagraphs - 1) : start + maxParagraphs - 1;
    return {
        start,
        end: clamp(explicitEnd, start, Math.max(0, paragraphCount - 1)),
    };
}

function buildSectionHtml(title: string, content: string, format: AgentContentFormat, level: number): string {
    const headingLevel = clamp(level, 1, 3);
    const normalizedContent = content.trim();
    const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleAlreadyPresent = new RegExp(`^\\s*(?:#{1,3}\\s+|<p[^>]*>|<h[1-6][^>]*>)?${escapedTitle}`, 'i').test(normalizedContent);
    const body = format === 'html'
        ? stripHtmlFence(normalizedContent)
        : markdownToWordHtml(normalizedContent);
    const heading = `<p class="heading${headingLevel}">${escapeHtml(title.trim())}</p>`;
    return titleAlreadyPresent ? body : `${heading}\n${body}`;
}

function normalizeBuiltInStyleName(styleName: string): string | null {
    const normalized = styleName.trim().replace(/\s+/g, '').toLowerCase();
    const heading = normalized.match(/^(?:heading|标题)([1-9])$/);
    if (heading) return `Heading${heading[1]}`;
    if (normalized === 'normal' || normalized === '正文') return 'Normal';
    if (normalized === 'title' || normalized === '标题') return 'Title';
    if (normalized === 'subtitle' || normalized === '副标题') return 'Subtitle';
    if (normalized === 'quote' || normalized === '引用') return 'Quote';
    return null;
}

function headingStyleName(level: number): string {
    return `Heading${clamp(level, 1, 9)}`;
}

function applyNamedStyleToParagraph(paragraph: Word.Paragraph, styleName: string) {
    const builtInStyle = normalizeBuiltInStyleName(styleName);
    const p = paragraph as unknown as { style?: string; styleBuiltIn?: string };
    if (builtInStyle) {
        p.styleBuiltIn = builtInStyle;
    } else {
        p.style = styleName;
    }
}

function applyOutlineLevelToParagraph(paragraph: Word.Paragraph, level: number) {
    const p = paragraph as unknown as { outlineLevel?: number };
    p.outlineLevel = clamp(level - 1, 0, 8);
}

function styleIdFromName(styleName: string): string {
    const builtIn = normalizeBuiltInStyleName(styleName);
    if (builtIn) return builtIn;
    return styleName.replace(/[^\p{L}\p{N}_-]/gu, '') || `Style${Date.now()}`;
}

function styleTypeToWordType(type: string): string {
    if (type === 'character') return 'character';
    if (type === 'table') return 'table';
    if (type === 'list') return 'numbering';
    return 'paragraph';
}

function appendTextElement(doc: Document, parent: Element, name: string, value: string) {
    const element = doc.createElement(name);
    element.setAttribute('w:val', value);
    parent.appendChild(element);
}

function appendRunProperties(doc: Document, parent: Element, style: AnyRecord) {
    const rPr = doc.createElement('w:rPr');
    let hasRun = false;
    if (typeof style.fontFamily === 'string' || typeof style.eastAsiaFont === 'string') {
        const fonts = doc.createElement('w:rFonts');
        if (typeof style.fontFamily === 'string') {
            fonts.setAttribute('w:ascii', style.fontFamily);
            fonts.setAttribute('w:hAnsi', style.fontFamily);
        }
        if (typeof style.eastAsiaFont === 'string') {
            fonts.setAttribute('w:eastAsia', style.eastAsiaFont);
        }
        rPr.appendChild(fonts);
        hasRun = true;
    }
    if (typeof style.fontSizePt === 'number') {
        const size = doc.createElement('w:sz');
        size.setAttribute('w:val', String(Math.round(style.fontSizePt * 2)));
        rPr.appendChild(size);
        hasRun = true;
    }
    if (style.bold === true) {
        rPr.appendChild(doc.createElement('w:b'));
        hasRun = true;
    }
    if (style.italic === true) {
        rPr.appendChild(doc.createElement('w:i'));
        hasRun = true;
    }
    if (typeof style.color === 'string') {
        const color = doc.createElement('w:color');
        color.setAttribute('w:val', style.color.replace(/^#/, ''));
        rPr.appendChild(color);
        hasRun = true;
    }
    if (hasRun) parent.appendChild(rPr);
}

function appendParagraphProperties(doc: Document, parent: Element, style: AnyRecord) {
    const pPr = doc.createElement('w:pPr');
    let hasParagraph = false;
    if (typeof style.alignment === 'string') {
        const jc = doc.createElement('w:jc');
        jc.setAttribute('w:val', style.alignment);
        pPr.appendChild(jc);
        hasParagraph = true;
    }
    if (typeof style.outlineLevel === 'number') {
        const outline = doc.createElement('w:outlineLvl');
        outline.setAttribute('w:val', String(clamp(style.outlineLevel - 1, 0, 8)));
        pPr.appendChild(outline);
        hasParagraph = true;
    }
    if (typeof style.spaceBeforePt === 'number' || typeof style.spaceAfterPt === 'number') {
        const spacing = doc.createElement('w:spacing');
        if (typeof style.spaceBeforePt === 'number') spacing.setAttribute('w:before', String(Math.round(style.spaceBeforePt * 20)));
        if (typeof style.spaceAfterPt === 'number') spacing.setAttribute('w:after', String(Math.round(style.spaceAfterPt * 20)));
        pPr.appendChild(spacing);
        hasParagraph = true;
    }
    if (hasParagraph) parent.appendChild(pPr);
}

function trimAround(text: string, start: number, end: number, contextChars: number) {
    return {
        textBefore: text.slice(Math.max(0, start - contextChars), start),
        matchText: text.slice(start, end),
        textAfter: text.slice(end, Math.min(text.length, end + contextChars)),
    };
}

function normalizeHeaderFooterType(kind: unknown): Word.HeaderFooterType {
    if (kind === 'firstPage') return Word.HeaderFooterType.firstPage;
    if (kind === 'evenPages') return Word.HeaderFooterType.evenPages;
    return Word.HeaderFooterType.primary;
}

function insertLocation(value: unknown): Word.InsertLocation {
    if (value === 'start') return Word.InsertLocation.start;
    if (value === 'replace') return Word.InsertLocation.replace;
    if (value === 'before') return Word.InsertLocation.before;
    if (value === 'after') return Word.InsertLocation.after;
    return Word.InsertLocation.end;
}

function normalizeFormat(value: unknown): AgentContentFormat {
    return value === 'html' || value === 'docir' || value === 'ooxml' ? value : 'text';
}

function looksLikeHtml(content: string): boolean {
    return /<\/?(p|div|span|table|ul|ol|li|pre|h[1-6]|b|strong|i|em|u)\b/i.test(content)
        || /^```html/i.test(content.trim());
}

function stripHtmlFence(content: string): string {
    const trimmed = content.trim();
    return trimmed.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
}

function markdownToWordHtml(content: string): string {
    const stripped = content.trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/```$/i, '').trim();
    const lines = stripped.split(/\r?\n/);
    const html: string[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length === 0) return;
        html.push(`<p>${escapeHtml(paragraph.join(' ').trim())}</p>`);
        paragraph = [];
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            flushParagraph();
            continue;
        }
        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            flushParagraph();
            const level = heading[1].length;
            html.push(`<p class="heading${level}">${escapeHtml(heading[2])}</p>`);
            continue;
        }
        paragraph.push(trimmed);
    }
    flushParagraph();
    return html.join('\n');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function coerceContentFormat(content: string, requestedFormat: AgentContentFormat): { content: string; format: AgentContentFormat } {
    if (requestedFormat === 'html') return { content: stripHtmlFence(content), format: 'html' };
    if (requestedFormat !== 'text') return { content, format: requestedFormat };
    if (looksLikeHtml(content)) return { content: stripHtmlFence(content), format: 'html' };
    if (/^```(?:markdown|md)?/i.test(content.trim()) || /^#{1,3}\s+/m.test(content)) {
        return { content: markdownToWordHtml(content), format: 'html' };
    }
    return { content, format: requestedFormat };
}

function styleFromParagraph(paragraph: Word.Paragraph): CssLikeStyle {
    const p = paragraph as unknown as {
        alignment?: string;
        style?: string;
        font?: { name?: string; size?: number; bold?: boolean; italic?: boolean; underline?: string; color?: string; highlightColor?: string };
    };
    const style: CssLikeStyle = {};
    if (p.alignment) style.alignment = p.alignment.toLowerCase() as CssLikeStyle['alignment'];
    if (p.font?.name) style.fontFamily = p.font.name;
    if (p.font?.size) style.fontSizePt = p.font.size;
    if (typeof p.font?.bold === 'boolean') style.bold = p.font.bold;
    if (typeof p.font?.italic === 'boolean') style.italic = p.font.italic;
    if (p.font?.underline && p.font.underline !== 'None') style.underline = true;
    if (p.font?.color) style.color = p.font.color;
    if (p.font?.highlightColor) style.highlightColor = p.font.highlightColor;
    const styleName = p.style || '';
    const heading = styleName.match(/heading\s*(\d)/i);
    if (heading) style.outlineLevel = Number(heading[1]);
    return style;
}

async function getParagraphByRef(context: Word.RequestContext, rangeRef: string): Promise<Word.Paragraph | null> {
    const index = parseParagraphRangeRef(rangeRef);
    if (index === null) return null;
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    return paragraphs.items[index] || null;
}

async function getTargetRange(context: Word.RequestContext, target: AgentTarget): Promise<Word.Range> {
    if (!target || target === 'selection') {
        return context.document.getSelection();
    }
    if (target === 'body') {
        return context.document.body.getRange();
    }
    const parsed = parseRangeRef(target);
    if (parsed?.kind === 'table') {
        const tables = context.document.body.tables;
        tables.load('items');
        await context.sync();
        const table = tables.items[parsed.tableIndex];
        if (table) return table.getRange();
    }
    if (parsed?.kind === 'table-cell') {
        const tables = context.document.body.tables;
        tables.load('items');
        await context.sync();
        const table = tables.items[parsed.tableIndex];
        if (table) {
            const cell = table.getCell(parsed.rowIndex, parsed.cellIndex);
            return cell.body.getRange();
        }
    }
    if (parsed?.kind === 'header-footer-paragraph') {
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();
        const section = sections.items[parsed.sectionIndex];
        if (section) {
            const body = parsed.story === 'footer'
                ? section.getFooter(normalizeHeaderFooterType(parsed.headerFooterKind))
                : section.getHeader(normalizeHeaderFooterType(parsed.headerFooterKind));
            const paragraphs = body.paragraphs;
            paragraphs.load('items');
            await context.sync();
            const paragraph = paragraphs.items[parsed.paragraphIndex];
            if (paragraph) return paragraph.getRange();
            return body.getRange();
        }
    }
    const blockRange = parseParagraphBlockRangeRef(target);
    if (blockRange) {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items');
        await context.sync();
        const first = paragraphs.items[blockRange.start];
        const last = paragraphs.items[Math.min(blockRange.end, paragraphs.items.length - 1)];
        if (first && last) {
            return first.getRange().expandTo(last.getRange());
        }
    }
    const span = parseParagraphTextSpan(target);
    if (span) {
        const paragraph = await getParagraphByRef(context, `body:p${span.paragraphIndex}`);
        if (paragraph) {
            paragraph.load('text');
            await context.sync();
            const snippet = paragraph.text.slice(span.start, span.end);
            if (snippet) {
                const results = paragraph.getRange().search(snippet, { matchCase: true, matchWholeWord: false });
                results.load('items');
                await context.sync();
                if (results.items.length > 0) return results.items[0];
            }
            return paragraph.getRange();
        }
    }
    const paragraph = await getParagraphByRef(context, target);
    if (paragraph) return paragraph.getRange();
    return context.document.getSelection();
}

async function insertByFormat(
    context: Word.RequestContext,
    target: AgentTarget,
    location: Word.InsertLocation,
    content: string,
    format: AgentContentFormat
): Promise<void> {
    if (target === 'selection' && location === Word.InsertLocation.after && format === 'html') {
        await insertHtmlAsDocx(context, content, activeAgentCssStyles);
        return;
    }

    const range = await getTargetRange(context, target);
    const normalized = coerceContentFormat(content, format);
    if (normalized.format === 'html') {
        const styledHtml = applyInlineStyles(normalized.content, activeAgentCssStyles);
        const sacrificeMarker = `\u00AB\u00ABAGENT_SACRIFICE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}\u00BB\u00BB`;
        range.insertHtml(`${styledHtml}<p>${sacrificeMarker}</p>`, location);
        await context.sync();
        const sacrificeResults = context.document.body.search(sacrificeMarker, { matchCase: true, matchWholeWord: false });
        sacrificeResults.load('items');
        await context.sync();
        if (sacrificeResults.items.length > 0) {
            sacrificeResults.items[0].paragraphs.getFirst().delete();
        }
    } else if (normalized.format === 'ooxml') {
        range.insertOoxml(normalized.content, location);
    } else if (normalized.format === 'docir') {
        const html = docIRToHtml(JSON.parse(normalized.content));
        range.insertHtml(applyInlineStyles(html, activeAgentCssStyles), location);
    } else {
        range.insertText(normalized.content, location);
    }
    await context.sync();
}

export const AGENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
    {
        name: 'get_document_outline',
        risk: 'read',
        description: 'Read document outline, inferred numbered headings, stats, and tail headings. Use this first for document-structure tasks.',
        parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
                includeStats: { type: 'boolean' },
                maxDepth: { type: 'number' },
                includeTailParagraphs: { type: 'boolean' },
                tailCount: { type: 'number' },
            },
        },
    },
    { name: 'get_selection', risk: 'read', description: 'Read current Word selection.', parameters: { type: 'object', additionalProperties: false, properties: { format: { type: 'string', enum: ['text', 'docir', 'html', 'ooxml'] } } } },
    { name: 'get_document_inventory', risk: 'read', description: 'Read document object inventory: styles, sections, tables, fields, comments, notes, and content controls.', parameters: { type: 'object', additionalProperties: false, properties: { includeStyles: { type: 'boolean' }, includeFields: { type: 'boolean' }, includeControls: { type: 'boolean' }, maxItems: { type: 'number' } } } },
    { name: 'read_range', risk: 'read', description: 'Read a returned rangeRef. Supports body:p10, body:p10-20, and body:p10:r0-12. Prefer ranges over single-paragraph loops.', parameters: { type: 'object', additionalProperties: false, required: ['rangeRef'], properties: { rangeRef: { type: 'string' }, format: { type: 'string', enum: ['text', 'docir', 'html', 'ooxml'] }, maxChars: { type: 'number' } } } },
    {
        name: 'read_paragraphs',
        risk: 'read',
        description: 'Read many body paragraphs in one call with range refs, style summaries, and a max character budget. Use this instead of repeated read_range calls for nearby short paragraphs.',
        parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
                startParagraph: { type: 'number' },
                endParagraph: { type: 'number' },
                rangeRef: { type: 'string' },
                afterRangeRef: { type: 'string' },
                beforeRangeRef: { type: 'string' },
                story: { type: 'string', enum: ['body', 'header', 'footer'] },
                sectionIndex: { type: 'number' },
                maxParagraphs: { type: 'number' },
                maxChars: { type: 'number' },
                includeFormat: { type: 'string', enum: ['none', 'summary'] },
            },
        },
    },
    { name: 'grep_document', risk: 'read', description: 'Search document text and return range refs. Use for precise anchor queries, not for broad structure discovery.', parameters: { type: 'object', additionalProperties: false, required: ['query'], properties: { query: { type: 'string' }, maxResults: { type: 'number' }, contextChars: { type: 'number' }, includeFormat: { type: 'string', enum: ['none', 'summary', 'docir', 'ooxml'] }, mode: { type: 'string', enum: ['plain', 'wildcard', 'regex_fallback', 'semantic'] }, cursor: { type: 'string' } } } },
    {
        name: 'find_insert_position',
        risk: 'read',
        description: 'Find a high-confidence insertion point for adding a new section. Prefer this over manual grep/read loops for requests like add a chapter/section.',
        parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
                topic: { type: 'string' },
                afterHeadingQuery: { type: 'string' },
                beforeHeadingQuery: { type: 'string' },
                strategy: { type: 'string', enum: ['after_related', 'before_next_topic', 'append_after_last_heading'] },
                maxContextParagraphs: { type: 'number' },
            },
        },
    },
    {
        name: 'insert_section',
        risk: 'write',
        description: 'Insert a complete Word-rendered section at a located paragraph. Accepts HTML or Markdown and renders it, never inserts source-code fences.',
        parameters: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'content'],
            properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                format: { type: 'string', enum: ['html', 'markdown', 'text'] },
                afterRangeRef: { type: 'string' },
                beforeRangeRef: { type: 'string' },
                anchorQuery: { type: 'string' },
                level: { type: 'number' },
            },
        },
    },
    { name: 'insert_content', risk: 'write', description: 'Low-level insert text, HTML, DocIR, or OOXML content. For full sections prefer insert_section.', parameters: { type: 'object', additionalProperties: false, required: ['content'], properties: { target: { type: 'string' }, location: { type: 'string', enum: ['start', 'end', 'before', 'after', 'replace'] }, format: { type: 'string', enum: ['text', 'html', 'docir', 'ooxml'] }, content: { type: 'string' } } } },
    { name: 'replace_range', risk: 'write', description: 'Replace a rangeRef with new content.', parameters: { type: 'object', additionalProperties: false, required: ['rangeRef', 'content'], properties: { rangeRef: { type: 'string' }, content: { type: 'string' }, format: { type: 'string', enum: ['text', 'html', 'docir', 'ooxml'] } } } },
    { name: 'delete_range', risk: 'destructive', description: 'Delete a rangeRef.', parameters: { type: 'object', additionalProperties: false, required: ['rangeRef'], properties: { rangeRef: { type: 'string' } } } },
    { name: 'set_paragraph_format', risk: 'write', description: 'Apply paragraph formatting.', parameters: { type: 'object', additionalProperties: false, required: ['style'], properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, style: { type: 'object' } } } },
    { name: 'set_text_format', risk: 'write', description: 'Apply text formatting.', parameters: { type: 'object', additionalProperties: false, required: ['style'], properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, style: { type: 'object' } } } },
    { name: 'apply_named_style', risk: 'write', description: 'Apply a Word named style to a target/rangeRef. For headings prefer built-in names Heading1..Heading9, not localized UI text.', parameters: { type: 'object', additionalProperties: false, required: ['styleName'], properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, styleName: { type: 'string' } } } },
    { name: 'define_or_update_style', risk: 'write', description: 'Define or update a Word style. Uses OOXML package editing when Office.js style creation is unavailable.', parameters: { type: 'object', additionalProperties: false, required: ['styleName', 'type', 'style'], properties: { styleName: { type: 'string' }, type: { type: 'string', enum: ['paragraph', 'character', 'table', 'list'] }, basedOn: { type: 'string' }, style: { type: 'object' } } } },
    { name: 'manage_headings', risk: 'write', description: 'Bulk set heading outline levels. By default preserves visual formatting; set applyNamedStyle true only when user explicitly wants Word Heading styles.', parameters: { type: 'object', additionalProperties: false, properties: { updates: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['rangeRef', 'level'], properties: { rangeRef: { type: 'string' }, level: { type: 'number' } } } }, rangeRefs: { type: 'array', items: { type: 'string' } }, level: { type: 'number' }, preserveFormatting: { type: 'boolean' }, applyNamedStyle: { type: 'boolean' } } } },
    { name: 'insert_table_or_update_table', risk: 'write', description: 'Insert or update a table with rows and optional target.', parameters: { type: 'object', additionalProperties: false, properties: { target: { type: 'string' }, location: { type: 'string', enum: ['start', 'end', 'before', 'after', 'replace'] }, table: { type: 'array' }, rows: { type: 'array' }, style: { type: 'object' } } } },
    { name: 'update_table', risk: 'write', description: 'Update an existing table by rangeRef or table index.', parameters: { type: 'object', additionalProperties: false, properties: { tableRef: { type: 'string' }, tableIndex: { type: 'number' }, rows: { type: 'array' }, style: { type: 'object' } } } },
    { name: 'insert_toc', risk: 'write', description: 'Insert a table of contents field.', parameters: { type: 'object', additionalProperties: false, properties: { target: { type: 'string' }, location: { type: 'string', enum: ['start', 'end', 'before', 'after', 'replace'] }, levels: { type: 'number' } } } },
    { name: 'set_page_setup', risk: 'write', description: 'Apply section page setup.', parameters: { type: 'object', additionalProperties: false, properties: { sectionIndex: { type: 'number' }, margins: { type: 'object' }, orientation: { type: 'string', enum: ['portrait', 'landscape', 'Portrait', 'Landscape'] }, paperSize: { type: 'string' }, columns: { type: 'number' } } } },
    { name: 'set_section_break', risk: 'write', description: 'Insert a section break at target.', parameters: { type: 'object', additionalProperties: false, properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, breakType: { type: 'string', enum: ['nextPage', 'continuous', 'evenPage', 'oddPage'] } } } },
    { name: 'set_header_footer', risk: 'write', description: 'Set section header or footer content.', parameters: { type: 'object', additionalProperties: false, required: ['area', 'content'], properties: { sectionIndex: { type: 'number' }, kind: { type: 'string', enum: ['primary', 'firstPage', 'evenPages'] }, area: { type: 'string', enum: ['header', 'footer'] }, content: { type: 'string' }, format: { type: 'string', enum: ['text', 'html', 'docir', 'ooxml'] } } } },
    { name: 'insert_footnote_or_endnote', risk: 'write', description: 'Insert a real Word footnote or endnote.', parameters: { type: 'object', additionalProperties: false, required: ['content'], properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, noteType: { type: 'string', enum: ['footnote', 'endnote'] }, content: { type: 'string' } } } },
    { name: 'insert_cross_reference_marker', risk: 'write', description: 'Insert a local cross-reference marker.', parameters: { type: 'object', additionalProperties: false, properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, id: { type: 'string' }, label: { type: 'string' } } } },
    { name: 'manage_citations', risk: 'write', description: 'Insert or update local citation blocks.', parameters: { type: 'object', additionalProperties: false, properties: { target: { type: 'string' }, action: { type: 'string' }, citation: { type: 'object' }, text: { type: 'string' } } } },
    { name: 'add_comment', risk: 'write', description: 'Add a Word comment when supported.', parameters: { type: 'object', additionalProperties: false, required: ['content'], properties: { target: { type: 'string' }, rangeRef: { type: 'string' }, content: { type: 'string' } } } },
    { name: 'get_comments', risk: 'read', description: 'Read Word comments when supported.', parameters: { type: 'object', additionalProperties: false, properties: { scope: { type: 'string' } } } },
    { name: 'preview_changes', risk: 'read', description: 'Summarize planned changes.', parameters: { type: 'object', additionalProperties: false, properties: { operationIds: { type: 'array' } } } },
    { name: 'validate_document', risk: 'read', description: 'Run lightweight document validation.', parameters: { type: 'object', additionalProperties: false, properties: { checks: { type: 'array' } } } },
    { name: 'refresh_document_index', risk: 'read', description: 'Refresh and return the current document index used by the agent context.', parameters: { type: 'object', additionalProperties: false, properties: {} } },
    { name: 'rollback_turn', risk: 'rollback', description: 'Restore a turn snapshot.', parameters: { type: 'object', additionalProperties: false, required: ['snapshotId'], properties: { snapshotId: { type: 'string' } } } },
    { name: 'commit_turn', risk: 'rollback', description: 'Mark a snapshot as committed.', parameters: { type: 'object', additionalProperties: false, properties: { snapshotId: { type: 'string' } } } },
];

export function validateToolCall(raw: unknown): AgentToolCall | null {
    const record = asRecord(raw);
    const name = asString(record.name) as AgentToolName;
    if (!AGENT_TOOL_DEFINITIONS.some(def => def.name === name)) return null;
    return {
        id: asString(record.id, `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        name,
        arguments: asRecord(record.arguments),
        riskLevel: record.riskLevel as AgentToolCall['riskLevel'],
    };
}

export async function executeWordTool(call: AgentToolCall): Promise<ToolResult> {
    try {
        const definition = AGENT_TOOL_DEFINITIONS.find(def => def.name === call.name);
        if (definition) {
            const validationError = validateToolArguments(definition, call);
            if (validationError) {
                return recordToolOperation(call, fail(call, validationError.code, validationError.message));
            }
        }

        let result: ToolResult;
        switch (call.name) {
            case 'get_document_outline':
                result = await getDocumentOutline(call);
                break;
            case 'get_selection':
                result = await getSelectionTool(call);
                break;
            case 'get_document_inventory':
                result = await getDocumentInventory(call);
                break;
            case 'read_range':
                result = await readRange(call);
                break;
            case 'read_paragraphs':
                result = await readParagraphs(call);
                break;
            case 'grep_document':
                result = await grepDocument(call);
                break;
            case 'find_insert_position':
                result = await findInsertPosition(call);
                break;
            case 'insert_section':
                result = await insertSection(call);
                break;
            case 'insert_content':
                result = await insertContent(call);
                break;
            case 'replace_range':
                result = await replaceRange(call);
                break;
            case 'delete_range':
                result = await deleteRange(call);
                break;
            case 'set_paragraph_format':
                result = await setParagraphFormat(call);
                break;
            case 'set_text_format':
                result = await setTextFormat(call);
                break;
            case 'apply_named_style':
                result = await applyNamedStyle(call);
                break;
            case 'define_or_update_style':
                result = await defineOrUpdateStyle(call);
                break;
            case 'manage_headings':
                result = await manageHeadings(call);
                break;
            case 'insert_table_or_update_table':
                result = await insertTable(call);
                break;
            case 'update_table':
                result = await updateTable(call);
                break;
            case 'insert_toc':
                result = await insertToc(call);
                break;
            case 'set_page_setup':
                result = await setPageSetup(call);
                break;
            case 'set_section_break':
                result = await setSectionBreak(call);
                break;
            case 'set_header_footer':
                result = await setHeaderFooter(call);
                break;
            case 'insert_footnote_or_endnote':
                result = await insertFootnoteFallback(call);
                break;
            case 'insert_cross_reference_marker':
                result = await insertCrossReferenceMarker(call);
                break;
            case 'manage_citations':
                result = await manageCitations(call);
                break;
            case 'add_comment':
                result = await addComment(call);
                break;
            case 'get_comments':
                result = await getComments(call);
                break;
            case 'validate_document':
                result = await validateDocument(call);
                break;
            case 'refresh_document_index':
                result = await refreshDocumentIndex(call);
                break;
            case 'rollback_turn':
                result = await rollbackTurn(call);
                break;
            case 'commit_turn':
                result = await commitTurn(call);
                break;
            case 'preview_changes':
                result = await previewChanges(call);
                break;
            default:
                result = fail(call, 'UNSUPPORTED_CAPABILITY', `${call.name} 暂未实现`);
        }
        return recordToolOperation(call, result);
    } catch (error) {
        return recordToolOperation(call, fail(call, 'WORD_TOOL_ERROR', error instanceof Error ? error.message : String(error)));
    }
}

async function getDocumentOutline(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const maxDepth = clamp(asNumber(args.maxDepth, 3), 1, 9);
    const tailCount = clamp(asNumber(args.tailCount, 12), 0, 50);
    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text,items/style');
        const tables = context.document.body.tables;
        tables.load('items');
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();

        const outline = buildHeadingSnapshot(paragraphs.items, maxDepth);
        const tableRanges = tables.items.map((_table, index) => ({ rangeRef: `table:t${index}`, tableIndex: index }));
        const sectionRanges = sections.items.map((_section, index) => ({
            sectionRef: `section:s${index}`,
            sectionIndex: index,
            headers: ['primary', 'firstPage', 'evenPages'].map(kind => `section:s${index}:header:${kind}:p0`),
            footers: ['primary', 'firstPage', 'evenPages'].map(kind => `section:s${index}:footer:${kind}:p0`),
        }));
        const footnotes = (context.document.body as unknown as { footnotes?: { load: (props?: string) => void; items?: unknown[] } }).footnotes;
        if (footnotes) {
            footnotes.load('items');
            await context.sync();
        }
        const tailParagraphs = tailCount > 0
            ? paragraphs.items
                .slice(Math.max(0, paragraphs.items.length - tailCount))
                .map((paragraph, offset) => {
                    const paragraphIndex = Math.max(0, paragraphs.items.length - tailCount) + offset;
                    return {
                        rangeRef: rangeRefForParagraph(paragraphIndex),
                        paragraphIndex,
                        text: normalizeHeadingText(paragraph.text || '').slice(0, 180),
                        headingLevel: inferHeadingLevel(paragraph.text || ''),
                    };
                })
                .filter(item => item.text)
            : [];

        const data = {
            outline,
            tables: tableRanges,
            sections: sectionRanges,
            notes: {
                footnotes: footnotes?.items?.length,
                endnotes: 'available-via-document-ooxml',
            },
            tailParagraphs,
            stats: {
                paragraphs: paragraphs.items.length,
                tables: tables.items.length,
                sections: sections.items.length,
            },
        };
        return ok(call, data, `读取文档大纲：${outline.length} 个标题，${paragraphs.items.length} 个段落`);
    });
}

async function getSelectionTool(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const format = normalizeFormat(args.format);
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        if (format === 'html') {
            const result = selection.getHtml();
            await context.sync();
            return ok(call, { format, content: result.value }, '已读取当前选区 HTML');
        }
        if (format === 'ooxml') {
            const result = selection.getOoxml();
            await context.sync();
            return ok(call, { format, content: result.value }, '已读取当前选区 OOXML');
        }
        selection.load('text');
        await context.sync();
        if (format === 'docir') {
            const docir = paragraphsToDocIR([{ text: selection.text, rangeRef: 'selection' }]);
            return ok(call, { format, content: docir }, '已读取当前选区 DocIR');
        }
        return ok(call, { format, content: selection.text }, '已读取当前选区文本');
    });
}

async function getDocumentInventory(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const maxItems = clamp(asNumber(args.maxItems, 80), 1, 300);
    return Word.run(async (context) => {
        const sections = context.document.sections;
        sections.load('items');
        const tables = context.document.body.tables;
        tables.load('items');
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text,items/style');
        await context.sync();

        const headingOutline = buildHeadingSnapshot(paragraphs.items, 9).slice(0, maxItems);
        const tableItems = tables.items.slice(0, maxItems).map((_table, index) => ({
            rangeRef: `table:t${index}`,
            tableIndex: index,
        }));

        const contentControls: unknown[] = [];
        const bodyWithControls = context.document.body as unknown as { contentControls?: { load: (props?: string) => void; items?: unknown[] } };
        if (bodyWithControls.contentControls) {
            bodyWithControls.contentControls.load('items/tag,items/title');
            await context.sync();
            contentControls.push(...(bodyWithControls.contentControls.items || []).slice(0, maxItems));
        }

        const commentsBody = context.document.body as unknown as { getComments?: () => { load: (props?: string) => void; items?: unknown[] } };
        let commentsCount: number | undefined;
        if (commentsBody.getComments) {
            const comments = commentsBody.getComments();
            comments.load();
            await context.sync();
            commentsCount = (comments.items || []).length;
        }

        return ok(call, {
            sections: sections.items.map((_section, index) => ({ sectionRef: `section:s${index}`, sectionIndex: index })),
            tables: tableItems,
            headings: headingOutline,
            contentControls,
            commentsCount,
            notes: { footnotes: 'available-via-ooxml', endnotes: 'available-via-ooxml' },
            fields: args.includeFields === false ? undefined : { toc: 'available-via-ooxml-scan' },
        }, `读取文档对象清单：${sections.items.length} 个节，${tables.items.length} 个表格，${headingOutline.length} 个标题`);
    });
}

async function readRange(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const rangeRef = asString(args.rangeRef);
    const format = normalizeFormat(args.format);
    const maxChars = clamp(asNumber(args.maxChars, 4000), 200, 20000);
    if (!rangeRef) return fail(call, 'INVALID_ARGS', 'read_range 缺少 rangeRef');
    const parsed = parseRangeRef(rangeRef);
    const nextRangeRef = parsed?.kind === 'body-paragraph' ? rangeRefForParagraph(parsed.paragraphIndex + 1) : undefined;

    return Word.run(async (context) => {
        const range = await getTargetRange(context, rangeRef);
        if (format === 'html') {
            const result = range.getHtml();
            await context.sync();
            return ok(call, { rangeRef, format, content: result.value.slice(0, maxChars), nextRangeRef }, '已读取范围 HTML');
        }
        if (format === 'ooxml') {
            const result = range.getOoxml();
            await context.sync();
            return ok(call, { rangeRef, format, content: result.value.slice(0, maxChars), nextRangeRef }, '已读取范围 OOXML');
        }
        range.load('text');
        await context.sync();
        const text = range.text.slice(0, maxChars);
        if (format === 'docir') {
            return ok(call, { rangeRef, format, content: paragraphsToDocIR([{ text, rangeRef }]), nextRangeRef }, '已读取范围 DocIR');
        }
        return ok(call, { rangeRef, format, content: text, nextRangeRef }, '已读取范围文本');
    });
}

async function readParagraphs(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const maxChars = clamp(asNumber(args.maxChars, 8000), 500, 30000);
    const includeFormat = args.includeFormat === 'none' ? 'none' : 'summary';
    const story = asString(args.story, 'body');
    const sectionIndex = clamp(asNumber(args.sectionIndex, 0), 0, 9999);

    return Word.run(async (context) => {
        let body: Word.Body = context.document.body;
        if (story === 'header' || story === 'footer') {
            const sections = context.document.sections;
            sections.load('items');
            await context.sync();
            const section = sections.items[sectionIndex];
            if (!section) return fail(call, 'INVALID_ARGS', `找不到 section:s${sectionIndex}`);
            body = story === 'header'
                ? section.getHeader(Word.HeaderFooterType.primary)
                : section.getFooter(Word.HeaderFooterType.primary);
        }
        const paragraphs = body.paragraphs;
        paragraphs.load('items/text,items/style,items/font,items/alignment');
        await context.sync();

        if (paragraphs.items.length === 0) {
            return ok(call, { paragraphs: [], text: '', truncated: false }, '读取到 0 个段落');
        }

        const window = resolveParagraphWindow(args, paragraphs.items.length);
        const items = [];
        let usedChars = 0;
        let truncated = false;

        for (let index = window.start; index <= window.end; index++) {
            const paragraph = paragraphs.items[index];
            const text = paragraph.text || '';
            if (items.length > 0 && usedChars + text.length > maxChars) {
                truncated = true;
                break;
            }
            usedChars += text.length + 1;
            items.push(paragraphSummary(paragraph, index, includeFormat));
        }

        const last = items.length > 0 ? items[items.length - 1].paragraphIndex : window.start;
        const nextStart = last + 1 <= window.end ? last + 1 : undefined;
        const data = {
            rangeRef: story === 'body' ? `body:p${window.start}-${last}` : `section:s${sectionIndex}:${story}:primary:p${window.start}-${last}`,
            startParagraph: window.start,
            endParagraph: last,
            story,
            sectionIndex: story === 'body' ? undefined : sectionIndex,
            paragraphs: items,
            text: items.map(item => item.text).join('\n'),
            truncated,
            nextCursor: nextStart !== undefined ? String(nextStart) : undefined,
            nextRangeRef: nextStart !== undefined ? `body:p${nextStart}-${window.end}` : undefined,
        };
        return ok(call, data, `已批量读取 ${items.length} 个段落`);
    });
}

async function grepDocument(call: AgentToolCall): Promise<ToolResult<GrepDocumentResult>> {
    const params = asRecord(call.arguments) as unknown as GrepDocumentParams;
    const query = String(params.query || '').trim();
    if (!query) return fail(call, 'INVALID_ARGS', 'grep_document 缺少 query') as ToolResult<GrepDocumentResult>;

    const maxResults = clamp(params.maxResults || 20, 1, 100);
    const contextChars = clamp(params.contextChars || 120, 0, 1000);
    const cursor = params.cursor ? Number(params.cursor) || 0 : 0;
    const includeFormat = params.includeFormat || 'summary';
    const mode = params.mode || 'plain';

    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text,items/style,items/font,items/alignment');
        await context.sync();

        const sources: Array<{ story: 'body' | 'header' | 'footer'; sectionIndex: number; paragraphs: Word.Paragraph[] }> = [];
        if (!params.scope || params.scope === 'body' || params.scope === 'all') {
            sources.push({ story: 'body', sectionIndex: 0, paragraphs: paragraphs.items });
        }
        if (params.scope === 'headers' || params.scope === 'footers' || params.scope === 'all') {
            const sections = context.document.sections;
            sections.load('items');
            await context.sync();
            for (let sectionIndex = 0; sectionIndex < sections.items.length; sectionIndex++) {
                const section = sections.items[sectionIndex];
                for (const story of ['header', 'footer'] as const) {
                    if (params.scope !== 'all' && params.scope !== `${story}s`) continue;
                    const body = story === 'header'
                        ? section.getHeader(Word.HeaderFooterType.primary)
                        : section.getFooter(Word.HeaderFooterType.primary);
                    const storyParagraphs = body.paragraphs;
                    storyParagraphs.load('items/text,items/style,items/font,items/alignment');
                    await context.sync();
                    sources.push({ story, sectionIndex, paragraphs: storyParagraphs.items });
                }
            }
        }

        const matches = [];
        const flags = params.matchCase ? 'g' : 'gi';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = mode === 'regex_fallback' ? new RegExp(query, flags) : new RegExp(escaped, flags);

        for (const source of sources) {
            for (let paragraphIndex = 0; paragraphIndex < source.paragraphs.length; paragraphIndex++) {
                const paragraph = source.paragraphs[paragraphIndex];
                const text = paragraph.text || '';
                let match: RegExpExecArray | null;
                regex.lastIndex = 0;
                while ((match = regex.exec(text)) && matches.length < cursor + maxResults + 1) {
                    const start = match.index;
                    const end = start + match[0].length;
                    const around = trimAround(text, start, end, contextChars);
                    const rangeRef = source.story === 'body'
                        ? `${rangeRefForParagraph(paragraphIndex)}:r${start}-${end}`
                        : `section:s${source.sectionIndex}:${source.story}:primary:p${paragraphIndex}`;
                    matches.push({
                        rangeRef,
                        story: source.story,
                        sectionIndex: source.sectionIndex,
                        paragraphIndex,
                        ...around,
                        format: includeFormat === 'none' ? undefined : styleFromParagraph(paragraph),
                    });
                    if (match[0].length === 0) regex.lastIndex += 1;
                }
            }
        }

        const page = matches.slice(cursor, cursor + maxResults);
        const result: GrepDocumentResult = {
            results: page,
            nextCursor: matches.length > cursor + maxResults ? String(cursor + maxResults) : undefined,
            searchedBy: mode === 'semantic' ? 'semanticIndex' : mode === 'regex_fallback' ? 'jsIndex' : 'wordApi',
        };
        return ok(call, result, `检索到 ${page.length} 条匹配`);
    });
}

async function findInsertPosition(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const topic = asString(args.topic);
    const afterHeadingQuery = asString(args.afterHeadingQuery);
    const beforeHeadingQuery = asString(args.beforeHeadingQuery);
    const strategy = asString(args.strategy, 'after_related');
    const maxContextParagraphs = clamp(asNumber(args.maxContextParagraphs, 8), 2, 30);

    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text,items/style,items/font,items/alignment');
        await context.sync();

        if (paragraphs.items.length === 0) {
            return ok(call, {
                target: 'body',
                location: 'end',
                confidence: 0.4,
                rationale: '文档没有可定位段落，降级到正文末尾',
                nearby: [],
            }, '已定位到文档末尾');
        }

        const outline = buildHeadingSnapshot(paragraphs.items, 4);
        let paragraphIndex = -1;
        let location: 'before' | 'after' | 'end' = 'after';
        let confidence = 0.5;
        let rationale = '';

        if (afterHeadingQuery) {
            paragraphIndex = findParagraphIndexContaining(paragraphs.items, afterHeadingQuery);
            location = 'after';
            confidence = paragraphIndex >= 0 ? 0.9 : confidence;
            rationale = paragraphIndex >= 0 ? `匹配 afterHeadingQuery: ${afterHeadingQuery}` : '';
        }

        if (paragraphIndex < 0 && beforeHeadingQuery) {
            paragraphIndex = findParagraphIndexContaining(paragraphs.items, beforeHeadingQuery);
            location = 'before';
            confidence = paragraphIndex >= 0 ? 0.9 : confidence;
            rationale = paragraphIndex >= 0 ? `匹配 beforeHeadingQuery: ${beforeHeadingQuery}` : '';
        }

        if (paragraphIndex < 0 && strategy !== 'append_after_last_heading') {
            const terms = extractTopicTerms(topic);
            let bestScore = 0;
            for (let index = 0; index < paragraphs.items.length; index++) {
                const text = (paragraphs.items[index].text || '').toLowerCase();
                const score = terms.reduce((sum, term) => sum + (text.includes(term.toLowerCase()) ? Math.max(2, term.length) : 0), 0);
                if (score > bestScore) {
                    bestScore = score;
                    paragraphIndex = index;
                }
            }
            if (paragraphIndex >= 0) {
                location = 'after';
                confidence = bestScore >= 6 ? 0.78 : 0.62;
                rationale = `找到与主题“${topic}”相关的段落`;
            }
        }

        if (paragraphIndex < 0 && outline.length > 0) {
            const lastHeading = outline[outline.length - 1];
            paragraphIndex = lastHeading.paragraphIndex;
            location = 'after';
            confidence = 0.58;
            rationale = `未找到主题锚点，使用最后一个标题“${lastHeading.text}”`;
        }

        if (paragraphIndex < 0) {
            paragraphIndex = paragraphs.items.length - 1;
            location = 'after';
            confidence = 0.45;
            rationale = '未找到标题或主题锚点，使用最后一个段落';
        }

        const radius = Math.floor(maxContextParagraphs / 2);
        const start = clamp(paragraphIndex - radius, 0, paragraphs.items.length - 1);
        const end = clamp(paragraphIndex + radius, start, paragraphs.items.length - 1);
        const nearby = [];
        for (let index = start; index <= end; index++) {
            nearby.push(paragraphSummary(paragraphs.items[index], index, 'summary'));
        }

        const target = rangeRefForParagraph(paragraphIndex);
        return ok(call, {
            target,
            location,
            confidence,
            rationale,
            nearby,
            outlineTail: outline.slice(Math.max(0, outline.length - 8)),
        }, `已定位插入点：${location} ${target}`);
    });
}

async function insertSection(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const title = asString(args.title).trim();
    const content = asString(args.content).trim();
    const level = clamp(asNumber(args.level, 1), 1, 3);
    const requestedFormat: AgentContentFormat = args.format === 'html' ? 'html' : 'text';
    const afterRangeRef = asString(args.afterRangeRef);
    const beforeRangeRef = asString(args.beforeRangeRef);
    const anchorQuery = asString(args.anchorQuery);

    if (!title) return fail(call, 'INVALID_ARGS', 'insert_section 缺少 title');
    if (!content) return fail(call, 'INVALID_ARGS', 'insert_section 缺少 content');

    const html = buildSectionHtml(title, content, requestedFormat, level);
    let target = afterRangeRef || beforeRangeRef || 'body';
    let location: Word.InsertLocation = afterRangeRef ? Word.InsertLocation.after : beforeRangeRef ? Word.InsertLocation.before : Word.InsertLocation.end;

    await Word.run(async (context) => {
        if (!afterRangeRef && !beforeRangeRef && anchorQuery) {
            const paragraphs = context.document.body.paragraphs;
            paragraphs.load('items/text');
            await context.sync();
            const anchorIndex = findParagraphIndexContaining(paragraphs.items, anchorQuery);
            if (anchorIndex >= 0) {
                target = rangeRefForParagraph(anchorIndex);
                location = Word.InsertLocation.after;
            }
        }
        await insertByFormat(context, target, location, html, 'html');
    });

    return ok(call, { title, target, location: location.toString(), format: 'html' }, `已插入章节：${title}`);
}

async function insertContent(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const content = asString(args.content);
    const requestedFormat = normalizeFormat(args.format);
    const { format } = coerceContentFormat(content, requestedFormat);
    const target = asString(args.target, 'selection');
    if (!content) return fail(call, 'INVALID_ARGS', 'insert_content 缺少 content');
    await Word.run(async (context) => {
        await insertByFormat(context, target, insertLocation(args.location), content, requestedFormat);
    });
    return ok(call, { target, format }, '已插入内容');
}

async function replaceRange(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const rangeRef = asString(args.rangeRef);
    const content = asString(args.content);
    if (!rangeRef) return fail(call, 'INVALID_ARGS', 'replace_range 缺少 rangeRef');
    const requestedFormat = normalizeFormat(args.format);
    const { format } = coerceContentFormat(content, requestedFormat);
    await Word.run(async (context) => {
        await insertByFormat(context, rangeRef, Word.InsertLocation.replace, content, requestedFormat);
    });
    return ok(call, { rangeRef }, '已替换范围');
}

async function deleteRange(call: AgentToolCall): Promise<ToolResult> {
    const rangeRef = asString(asRecord(call.arguments).rangeRef);
    if (!rangeRef) return fail(call, 'INVALID_ARGS', 'delete_range 缺少 rangeRef');
    await Word.run(async (context) => {
        const range = await getTargetRange(context, rangeRef);
        range.delete();
        await context.sync();
    });
    return ok(call, { rangeRef }, '已删除范围');
}

function applyParagraphStyle(paragraph: Word.Paragraph, style: AnyRecord) {
    const p = paragraph as unknown as {
        alignment?: string;
        leftIndent?: number;
        rightIndent?: number;
        firstLineIndent?: number;
        lineSpacing?: number;
        spaceBefore?: number;
        spaceAfter?: number;
        outlineLevel?: number;
        keepWithNext?: boolean;
        pageBreakBefore?: boolean;
        widowControl?: boolean;
    };
    if (typeof style.alignment === 'string') p.alignment = style.alignment;
    if (typeof style.leftIndentPt === 'number') p.leftIndent = style.leftIndentPt;
    if (typeof style.rightIndentPt === 'number') p.rightIndent = style.rightIndentPt;
    if (typeof style.firstLineIndentPt === 'number') p.firstLineIndent = style.firstLineIndentPt;
    if (typeof style.lineSpacingPt === 'number') p.lineSpacing = style.lineSpacingPt;
    if (typeof style.spaceBeforePt === 'number') p.spaceBefore = style.spaceBeforePt;
    if (typeof style.spaceAfterPt === 'number') p.spaceAfter = style.spaceAfterPt;
    if (typeof style.outlineLevel === 'number') p.outlineLevel = clamp(style.outlineLevel - 1, 0, 8);
    if (typeof style.keepWithNext === 'boolean') p.keepWithNext = style.keepWithNext;
    if (typeof style.pageBreakBefore === 'boolean') p.pageBreakBefore = style.pageBreakBefore;
    if (typeof style.widowControl === 'boolean') p.widowControl = style.widowControl;
}

async function setParagraphFormat(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const target = asString(args.rangeRef, asString(args.target, 'selection'));
    const style = asRecord(args.style);
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        const paragraphs = range.paragraphs;
        paragraphs.load('items');
        await context.sync();
        paragraphs.items.forEach(paragraph => applyParagraphStyle(paragraph, style));
        await context.sync();
    });
    return ok(call, { target, style }, '已设置段落格式');
}

async function setTextFormat(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const target = asString(args.rangeRef, asString(args.target, 'selection'));
    const style = asRecord(args.style);
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        const rangeWithFont = range as unknown as { font: Word.Font & { superscript?: boolean; subscript?: boolean; eastAsiaName?: string } };
        if (typeof style.fontFamily === 'string') range.font.name = style.fontFamily;
        if (typeof style.eastAsiaFont === 'string') rangeWithFont.font.eastAsiaName = style.eastAsiaFont;
        if (typeof style.fontSizePt === 'number') range.font.size = style.fontSizePt;
        if (typeof style.bold === 'boolean') range.font.bold = style.bold;
        if (typeof style.italic === 'boolean') range.font.italic = style.italic;
        if (typeof style.underline === 'boolean') range.font.underline = style.underline ? Word.UnderlineType.single : Word.UnderlineType.none;
        if (typeof style.color === 'string') range.font.color = style.color;
        if (typeof style.highlightColor === 'string') range.font.highlightColor = style.highlightColor;
        if (typeof style.superscript === 'boolean') rangeWithFont.font.superscript = style.superscript;
        if (typeof style.subscript === 'boolean') rangeWithFont.font.subscript = style.subscript;
        await context.sync();
    });
    return ok(call, { target, style }, '已设置文本格式');
}

async function applyNamedStyle(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const target = asString(args.rangeRef, asString(args.target, 'selection'));
    const styleName = asString(args.styleName);
    if (!styleName) return fail(call, 'INVALID_ARGS', 'apply_named_style 缺少 styleName');
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        range.paragraphs.load('items');
        await context.sync();
        range.paragraphs.items.forEach(paragraph => applyNamedStyleToParagraph(paragraph, styleName));
        await context.sync();
    });
    return ok(call, { target, styleName }, `已应用样式 ${styleName}`);
}

async function defineOrUpdateStyle(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const styleName = asString(args.styleName).trim();
    const type = asString(args.type, 'paragraph');
    const basedOn = asString(args.basedOn, 'Normal');
    const style = asRecord(args.style);
    if (!styleName) return fail(call, 'INVALID_ARGS', 'define_or_update_style 缺少 styleName');

    const pkg = await getCurrentDocxPackage();
    const stylesDoc = await parseXmlPart(pkg, 'word/styles.xml');
    if (!stylesDoc) return fail(call, 'UNSUPPORTED_CAPABILITY', '当前文档缺少 word/styles.xml，无法修改样式');

    const styleId = styleIdFromName(styleName);
    const wordType = styleTypeToWordType(type);
    const stylesRoot = stylesDoc.documentElement;
    const existing = Array.from(stylesDoc.getElementsByTagName('w:style'))
        .find(node => node.getAttribute('w:styleId') === styleId);
    const styleElement = existing || stylesDoc.createElement('w:style');
    while (styleElement.firstChild) styleElement.removeChild(styleElement.firstChild);
    styleElement.setAttribute('w:type', wordType);
    styleElement.setAttribute('w:styleId', styleId);

    appendTextElement(stylesDoc, styleElement, 'w:name', styleName);
    if (basedOn) appendTextElement(stylesDoc, styleElement, 'w:basedOn', styleIdFromName(basedOn));
    appendRunProperties(stylesDoc, styleElement, style);
    if (wordType === 'paragraph') appendParagraphProperties(stylesDoc, styleElement, style);
    if (!existing) stylesRoot.appendChild(styleElement);

    writePart(pkg, 'word/styles.xml', serializeXml(stylesDoc));
    await replaceCurrentDocxPackage(pkg);
    return ok(call, { styleName, styleId, type: wordType }, `已定义/更新样式 ${styleName}`);
}

async function manageHeadings(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const applyNamedStyle = args.applyNamedStyle === true;
    const preserveFormatting = args.preserveFormatting !== false;
    const rawUpdates = Array.isArray(args.updates) ? args.updates : [];
    const updates = rawUpdates
        .map(item => asRecord(item))
        .map(item => ({ rangeRef: asString(item.rangeRef), level: clamp(asNumber(item.level, 1), 1, 9) }))
        .filter(item => item.rangeRef);

    if (updates.length === 0 && Array.isArray(args.rangeRefs)) {
        const level = clamp(asNumber(args.level, 1), 1, 9);
        for (const rangeRef of args.rangeRefs) {
            if (typeof rangeRef === 'string') updates.push({ rangeRef, level });
        }
    }

    if (updates.length === 0) return fail(call, 'INVALID_ARGS', 'manage_headings 缺少 updates 或 rangeRefs');

    await Word.run(async (context) => {
        for (const update of updates) {
            const range = await getTargetRange(context, update.rangeRef);
            range.paragraphs.load('items');
            await context.sync();
            range.paragraphs.items.forEach(paragraph => {
                if (applyNamedStyle && !preserveFormatting) {
                    applyNamedStyleToParagraph(paragraph, headingStyleName(update.level));
                } else {
                    applyOutlineLevelToParagraph(paragraph, update.level);
                }
            });
        }
        await context.sync();
    });

    return ok(call, { updated: updates.length, preserveFormatting, applyNamedStyle }, `已更新 ${updates.length} 个大纲层级${preserveFormatting ? '，已保留原格式' : ''}`);
}

async function insertTable(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const rows = Array.isArray(args.table) ? args.table as string[][] : Array.isArray(args.rows) ? args.rows as string[][] : [];
    if (rows.length === 0 || !Array.isArray(rows[0])) return fail(call, 'INVALID_ARGS', 'insert_table_or_update_table 缺少 table 行列数据');
    const html = `<table>${rows.map((row, rowIndex) => `<tr>${row.map(cell => rowIndex === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    await Word.run(async (context) => {
        await insertByFormat(context, asString(args.target, 'selection'), insertLocation(args.location), html, 'html');
    });
    return ok(call, { rows: rows.length }, '已插入表格');
}

async function updateTable(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const rows = Array.isArray(args.rows) ? args.rows as string[][] : [];
    const tableRef = asString(args.tableRef);
    const tableIndexFromRef = tableRef.match(/^table:t(\d+)$/)?.[1];
    const tableIndex = tableIndexFromRef ? Number(tableIndexFromRef) : clamp(asNumber(args.tableIndex, 0), 0, 9999);

    if (!rows.length) return fail(call, 'INVALID_ARGS', 'update_table 缺少 rows');

    await Word.run(async (context) => {
        const tables = context.document.body.tables;
        tables.load('items');
        await context.sync();
        const table = tables.items[tableIndex];
        if (!table) throw new Error(`找不到表格 table:t${tableIndex}`);
        table.delete();
        await context.sync();
        const html = `<table>${rows.map((row, rowIndex) => `<tr>${row.map(cell => rowIndex === 0 ? `<th>${escapeHtml(String(cell))}</th>` : `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('')}</table>`;
        context.document.body.insertHtml(applyInlineStyles(html, activeAgentCssStyles), Word.InsertLocation.end);
        await context.sync();
    });

    return ok(call, { tableRef: `table:t${tableIndex}`, rows: rows.length }, `已更新表格 table:t${tableIndex}`);
}

async function insertToc(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const levels = clamp(asNumber(args.levels, 3), 1, 9);
    const field = `<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage"><pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml"><pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships></pkg:xmlData></pkg:part><pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"><pkg:xmlData><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">TOC \\o "1-${levels}" \\h \\z \\u</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>目录将在 Word 中更新</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:body></w:document></pkg:xmlData></pkg:part></pkg:package>`;
    await Word.run(async (context) => {
        await insertByFormat(context, asString(args.target, 'selection'), insertLocation(args.location), field, 'ooxml');
    });
    return ok(call, { levels }, '已插入目录域');
}

async function setPageSetup(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    await Word.run(async (context) => {
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();
        const sectionIndex = clamp(asNumber(args.sectionIndex, 0), 0, Math.max(0, sections.items.length - 1));
        const section = sections.items[sectionIndex] as unknown as { pageSetup?: AnyRecord };
        const setup = section.pageSetup || {};
        const margins = asRecord(args.margins);
        if (typeof margins.topPt === 'number') setup.topMargin = margins.topPt;
        if (typeof margins.bottomPt === 'number') setup.bottomMargin = margins.bottomPt;
        if (typeof margins.leftPt === 'number') setup.leftMargin = margins.leftPt;
        if (typeof margins.rightPt === 'number') setup.rightMargin = margins.rightPt;
        if (typeof args.orientation === 'string') setup.orientation = args.orientation;
        await context.sync();
    });
    return ok(call, args, '已设置页面参数');
}

async function setSectionBreak(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const target = asString(args.rangeRef, asString(args.target, 'selection'));
    const breakTypeArg = asString(args.breakType, 'nextPage');
    const breakType = breakTypeArg === 'continuous'
        ? Word.BreakType.sectionContinuous
        : breakTypeArg === 'evenPage'
            ? Word.BreakType.sectionEven
            : breakTypeArg === 'oddPage'
                ? Word.BreakType.sectionOdd
                : Word.BreakType.sectionNext;
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        range.insertBreak(breakType, Word.InsertLocation.after);
        await context.sync();
    });
    return ok(call, { target, breakType: breakTypeArg }, `已插入分节符：${breakTypeArg}`);
}

async function setHeaderFooter(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const area = args.area === 'footer' ? 'footer' : 'header';
    const content = asString(args.content);
    const format = normalizeFormat(args.format);
    await Word.run(async (context) => {
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();
        const sectionIndex = clamp(asNumber(args.sectionIndex, 0), 0, Math.max(0, sections.items.length - 1));
        const section = sections.items[sectionIndex];
        const body = area === 'footer'
            ? section.getFooter(normalizeHeaderFooterType(args.kind))
            : section.getHeader(normalizeHeaderFooterType(args.kind));
        body.clear();
        if (format === 'html') body.insertHtml(applyInlineStyles(content, activeAgentCssStyles), Word.InsertLocation.start);
        else if (format === 'ooxml') body.insertOoxml(content, Word.InsertLocation.start);
        else body.insertText(content, Word.InsertLocation.start);
        await context.sync();
    });
    return ok(call, { area }, `已设置${area === 'footer' ? '页脚' : '页眉'}`);
}

async function insertFootnoteFallback(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const content = asString(args.content);
    const noteType = asString(args.noteType, 'footnote');
    const target = asString(args.rangeRef, asString(args.target, 'selection'));
    if (!content) return fail(call, 'INVALID_ARGS', 'insert_footnote_or_endnote 缺少 content');
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        if (noteType === 'endnote') {
            range.insertEndnote(content);
        } else {
            range.insertFootnote(content);
        }
        await context.sync();
    });
    return ok(call, { content, noteType, target }, noteType === 'endnote' ? '已插入尾注' : '已插入脚注');
}

async function insertCrossReferenceMarker(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const id = asString(args.id, `ref-${Date.now()}`);
    const label = asString(args.label, id);
    await Word.run(async (context) => {
        const range = await getTargetRange(context, asString(args.rangeRef, asString(args.target, 'selection')));
        const cc = range.insertContentControl();
        cc.tag = id;
        cc.title = label;
        await context.sync();
    });
    return ok(call, { id, label }, '已插入交叉引用标记');
}

async function manageCitations(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const action = asString(args.action, 'insert');
    const citation = asRecord(args.citation);
    const text = asString(citation.text, asString(args.text, '[citation]'));
    await Word.run(async (context) => {
        const range = await getTargetRange(context, asString(args.target, 'selection'));
        range.insertText(action === 'bibliography' ? `\n参考文献\n${text}` : `（${text}）`, Word.InsertLocation.after);
        await context.sync();
    });
    return ok(call, { action }, '已处理本地引用块');
}

async function addComment(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const content = asString(args.content);
    const supported = await Word.run(async (context) => {
        const range = await getTargetRange(context, asString(args.rangeRef, asString(args.target, 'selection')));
        const r = range as unknown as { insertComment?: (text: string) => void };
        if (typeof r.insertComment === 'function') {
            r.insertComment(content);
            await context.sync();
            return true;
        } else {
            return false;
        }
    });
    if (!supported) return fail(call, 'UNSUPPORTED_CAPABILITY', '当前 Word API 不支持添加批注');
    return ok(call, { content }, '已添加批注');
}

async function getComments(call: AgentToolCall): Promise<ToolResult> {
    return Word.run(async (context) => {
        const body = context.document.body as unknown as { getComments?: () => { load: (props?: string) => void; items?: unknown[] } };
        if (!body.getComments) return fail(call, 'UNSUPPORTED_CAPABILITY', '当前 Word API 不支持读取批注');
        const comments = body.getComments();
        comments.load();
        await context.sync();
        return ok(call, { comments: comments.items || [] }, `读取到 ${(comments.items || []).length} 条批注`);
    });
}

async function validateDocument(call: AgentToolCall): Promise<ToolResult> {
    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text,items/style');
        await context.sync();
        const issues: string[] = [];
        let previousLevel = 0;
        let emptyParagraphs = 0;
        paragraphs.items.forEach((paragraph, index) => {
            const text = paragraph.text.trim();
            const match = String(paragraph.style || '').match(/heading\s*(\d)/i);
            if (match && !text) issues.push(`空标题：${rangeRefForParagraph(index)}`);
            if (!text) emptyParagraphs += 1;
            if (match) {
                const level = Number(match[1]);
                if (previousLevel && level > previousLevel + 1) {
                    issues.push(`标题层级跳跃：${rangeRefForParagraph(index)}`);
                }
                previousLevel = level;
            }
        });
        if (emptyParagraphs > Math.max(10, paragraphs.items.length * 0.25)) {
            issues.push(`空段落偏多：${emptyParagraphs}/${paragraphs.items.length}`);
        }
        return ok(call, { issues, checked: ['headings', 'emptyParagraphs', 'styleConsistency'] }, issues.length ? `发现 ${issues.length} 个问题` : '文档验证通过');
    });
}

async function previewChanges(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const operationIds = Array.isArray(args.operationIds)
        ? args.operationIds.filter((item): item is string => typeof item === 'string')
        : undefined;
    const operations = listToolOperations(operationIds);
    const summary = operations.length
        ? operations.map(op => `${op.ok ? '✓' : '✗'} ${op.toolName}: ${op.summary}${op.affectedRangeRefs.length ? ` (${op.affectedRangeRefs.join(', ')})` : ''}`).join('\n')
        : '暂无可预览的工具操作';
    return ok(call, { operationIds, operations, diffSummary: summary }, operations.length ? `已生成 ${operations.length} 个操作的变更预览` : '暂无可预览的变更');
}

async function refreshDocumentIndex(call: AgentToolCall): Promise<ToolResult> {
    const outline = await getDocumentOutline({ ...call, name: 'get_document_outline', arguments: { includeStats: true, maxDepth: 9, tailCount: 20 } });
    const inventory = await getDocumentInventory({ ...call, name: 'get_document_inventory', arguments: { includeStyles: true, includeFields: true, includeControls: true } });
    return ok(call, { outline: outline.data, inventory: inventory.data }, '已刷新文档索引');
}

async function rollbackTurn(call: AgentToolCall): Promise<ToolResult> {
    const snapshotId = asString(asRecord(call.arguments).snapshotId);
    if (!snapshotId) return fail(call, 'INVALID_ARGS', 'rollback_turn 缺少 snapshotId', false);
    const snapshot = await restoreSnapshot(snapshotId);
    return ok(call, { snapshotId, canRestoreFully: snapshot.canRestoreFully }, '已回退到本轮开始前状态');
}

async function commitTurn(call: AgentToolCall): Promise<ToolResult> {
    const snapshotId = asString(asRecord(call.arguments).snapshotId);
    if (snapshotId) await deleteSnapshot(snapshotId);
    return ok(call, { snapshotId }, '已提交本轮修改');
}
