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
import { insertHtmlAsDocx } from '../../utils/htmlParser';

type AnyRecord = Record<string, unknown>;

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
        await insertHtmlAsDocx(context, content);
        return;
    }

    const range = await getTargetRange(context, target);
    const normalized = coerceContentFormat(content, format);
    if (normalized.format === 'html') {
        range.insertHtml(normalized.content, location);
    } else if (normalized.format === 'ooxml') {
        range.insertOoxml(normalized.content, location);
    } else if (normalized.format === 'docir') {
        const html = docIRToHtml(JSON.parse(normalized.content));
        range.insertHtml(html, location);
    } else {
        range.insertText(normalized.content, location);
    }
    await context.sync();
}

export const AGENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
    { name: 'get_document_outline', risk: 'read', description: 'Read document outline and basic statistics. Falls back to inferred numbered headings when Word heading styles are absent.', parameters: {} },
    { name: 'get_selection', risk: 'read', description: 'Read current Word selection.', parameters: {} },
    { name: 'read_range', risk: 'read', description: 'Read a previously returned rangeRef. Supports body:p10, body:p10-20, and body:p10:r0-12.', parameters: {} },
    { name: 'grep_document', risk: 'read', description: 'Search document text efficiently and return range refs.', parameters: {} },
    { name: 'insert_content', risk: 'write', description: 'Insert text, HTML, DocIR, or OOXML content. For document sections use format html and Word-friendly p.heading/p tags, not Markdown fences.', parameters: {} },
    { name: 'replace_range', risk: 'write', description: 'Replace a rangeRef with new content.', parameters: {} },
    { name: 'delete_range', risk: 'destructive', description: 'Delete a rangeRef.', parameters: {} },
    { name: 'set_paragraph_format', risk: 'write', description: 'Apply paragraph formatting.', parameters: {} },
    { name: 'set_text_format', risk: 'write', description: 'Apply text formatting.', parameters: {} },
    { name: 'apply_named_style', risk: 'write', description: 'Apply a Word named style.', parameters: {} },
    { name: 'define_or_update_style', risk: 'write', description: 'Reserved style definition tool.', parameters: {} },
    { name: 'manage_headings', risk: 'write', description: 'Reserved heading management tool.', parameters: {} },
    { name: 'insert_table_or_update_table', risk: 'write', description: 'Insert a simple table.', parameters: {} },
    { name: 'insert_toc', risk: 'write', description: 'Insert a table of contents field.', parameters: {} },
    { name: 'set_page_setup', risk: 'write', description: 'Apply section page setup.', parameters: {} },
    { name: 'set_header_footer', risk: 'write', description: 'Set section header or footer content.', parameters: {} },
    { name: 'insert_footnote_or_endnote', risk: 'write', description: 'Insert a footnote or endnote marker fallback.', parameters: {} },
    { name: 'insert_cross_reference_marker', risk: 'write', description: 'Insert a local cross-reference marker.', parameters: {} },
    { name: 'manage_citations', risk: 'write', description: 'Insert or update local citation blocks.', parameters: {} },
    { name: 'add_comment', risk: 'write', description: 'Add a Word comment when supported.', parameters: {} },
    { name: 'get_comments', risk: 'read', description: 'Read Word comments when supported.', parameters: {} },
    { name: 'preview_changes', risk: 'read', description: 'Summarize planned changes.', parameters: {} },
    { name: 'validate_document', risk: 'read', description: 'Run lightweight document validation.', parameters: {} },
    { name: 'rollback_turn', risk: 'rollback', description: 'Restore a turn snapshot.', parameters: {} },
    { name: 'commit_turn', risk: 'rollback', description: 'Mark a snapshot as committed.', parameters: {} },
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
        switch (call.name) {
            case 'get_document_outline':
                return await getDocumentOutline(call);
            case 'get_selection':
                return await getSelectionTool(call);
            case 'read_range':
                return await readRange(call);
            case 'grep_document':
                return await grepDocument(call);
            case 'insert_content':
                return await insertContent(call);
            case 'replace_range':
                return await replaceRange(call);
            case 'delete_range':
                return await deleteRange(call);
            case 'set_paragraph_format':
                return await setParagraphFormat(call);
            case 'set_text_format':
                return await setTextFormat(call);
            case 'apply_named_style':
                return await applyNamedStyle(call);
            case 'insert_table_or_update_table':
                return await insertTable(call);
            case 'insert_toc':
                return await insertToc(call);
            case 'set_page_setup':
                return await setPageSetup(call);
            case 'set_header_footer':
                return await setHeaderFooter(call);
            case 'insert_footnote_or_endnote':
                return await insertFootnoteFallback(call);
            case 'insert_cross_reference_marker':
                return await insertCrossReferenceMarker(call);
            case 'manage_citations':
                return await manageCitations(call);
            case 'add_comment':
                return await addComment(call);
            case 'get_comments':
                return await getComments(call);
            case 'validate_document':
                return await validateDocument(call);
            case 'rollback_turn':
                return await rollbackTurn(call);
            case 'commit_turn':
                return await commitTurn(call);
            case 'preview_changes':
                return ok(call, { operationIds: asRecord(call.arguments).operationIds || [] }, '已生成变更预览');
            default:
                return fail(call, 'TOOL_NOT_IMPLEMENTED', `${call.name} 暂未实现`);
        }
    } catch (error) {
        return fail(call, 'WORD_TOOL_ERROR', error instanceof Error ? error.message : String(error));
    }
}

async function getDocumentOutline(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const maxDepth = clamp(asNumber(args.maxDepth, 3), 1, 9);
    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items/text,items/style');
        const tables = context.document.body.tables;
        tables.load('items');
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();

        const outline = paragraphs.items
            .map((paragraph, index) => {
                const text = paragraph.text.trim();
                const match = String(paragraph.style || '').match(/heading\s*(\d)/i);
                const level = match ? Number(match[1]) : inferHeadingLevel(text);
                if (!text || !level || level > maxDepth) return null;
                return { rangeRef: rangeRefForParagraph(index), level, text, inferred: !match };
            })
            .filter(Boolean);

        const data = {
            outline,
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

async function readRange(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const rangeRef = asString(args.rangeRef);
    const format = normalizeFormat(args.format);
    const maxChars = clamp(asNumber(args.maxChars, 4000), 200, 20000);
    if (!rangeRef) return fail(call, 'INVALID_ARGS', 'read_range 缺少 rangeRef');

    return Word.run(async (context) => {
        const range = await getTargetRange(context, rangeRef);
        if (format === 'html') {
            const result = range.getHtml();
            await context.sync();
            return ok(call, { rangeRef, format, content: result.value.slice(0, maxChars) }, '已读取范围 HTML');
        }
        if (format === 'ooxml') {
            const result = range.getOoxml();
            await context.sync();
            return ok(call, { rangeRef, format, content: result.value.slice(0, maxChars) }, '已读取范围 OOXML');
        }
        range.load('text');
        await context.sync();
        const text = range.text.slice(0, maxChars);
        if (format === 'docir') {
            return ok(call, { rangeRef, format, content: paragraphsToDocIR([{ text, rangeRef }]) }, '已读取范围 DocIR');
        }
        return ok(call, { rangeRef, format, content: text }, '已读取范围文本');
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

        const matches = [];
        const flags = params.matchCase ? 'g' : 'gi';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = mode === 'regex_fallback' ? new RegExp(query, flags) : new RegExp(escaped, flags);

        for (let paragraphIndex = 0; paragraphIndex < paragraphs.items.length; paragraphIndex++) {
            const paragraph = paragraphs.items[paragraphIndex];
            const text = paragraph.text || '';
            let match: RegExpExecArray | null;
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) && matches.length < cursor + maxResults + 1) {
                const start = match.index;
                const end = start + match[0].length;
                const around = trimAround(text, start, end, contextChars);
                matches.push({
                    rangeRef: `${rangeRefForParagraph(paragraphIndex)}:r${start}-${end}`,
                    story: 'body' as const,
                    sectionIndex: 0,
                    paragraphIndex,
                    ...around,
                    format: includeFormat === 'none' ? undefined : styleFromParagraph(paragraph),
                });
                if (match[0].length === 0) regex.lastIndex += 1;
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
    };
    if (typeof style.alignment === 'string') p.alignment = style.alignment;
    if (typeof style.leftIndentPt === 'number') p.leftIndent = style.leftIndentPt;
    if (typeof style.rightIndentPt === 'number') p.rightIndent = style.rightIndentPt;
    if (typeof style.firstLineIndentPt === 'number') p.firstLineIndent = style.firstLineIndentPt;
    if (typeof style.lineSpacingPt === 'number') p.lineSpacing = style.lineSpacingPt;
    if (typeof style.spaceBeforePt === 'number') p.spaceBefore = style.spaceBeforePt;
    if (typeof style.spaceAfterPt === 'number') p.spaceAfter = style.spaceAfterPt;
}

async function setParagraphFormat(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const target = asString(args.target, 'selection');
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
    const target = asString(args.target, 'selection');
    const style = asRecord(args.style);
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        if (typeof style.fontFamily === 'string') range.font.name = style.fontFamily;
        if (typeof style.fontSizePt === 'number') range.font.size = style.fontSizePt;
        if (typeof style.bold === 'boolean') range.font.bold = style.bold;
        if (typeof style.italic === 'boolean') range.font.italic = style.italic;
        if (typeof style.underline === 'boolean') range.font.underline = style.underline ? Word.UnderlineType.single : Word.UnderlineType.none;
        if (typeof style.color === 'string') range.font.color = style.color;
        if (typeof style.highlightColor === 'string') range.font.highlightColor = style.highlightColor;
        await context.sync();
    });
    return ok(call, { target, style }, '已设置文本格式');
}

async function applyNamedStyle(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const target = asString(args.target, 'selection');
    const styleName = asString(args.styleName);
    if (!styleName) return fail(call, 'INVALID_ARGS', 'apply_named_style 缺少 styleName');
    await Word.run(async (context) => {
        const range = await getTargetRange(context, target);
        range.paragraphs.load('items');
        await context.sync();
        range.paragraphs.items.forEach(paragraph => { paragraph.style = styleName; });
        await context.sync();
    });
    return ok(call, { target, styleName }, `已应用样式 ${styleName}`);
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
        if (format === 'html') body.insertHtml(content, Word.InsertLocation.start);
        else if (format === 'ooxml') body.insertOoxml(content, Word.InsertLocation.start);
        else body.insertText(content, Word.InsertLocation.start);
        await context.sync();
    });
    return ok(call, { area }, `已设置${area === 'footer' ? '页脚' : '页眉'}`);
}

async function insertFootnoteFallback(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const content = asString(args.content);
    await Word.run(async (context) => {
        const range = await getTargetRange(context, asString(args.target, 'selection'));
        range.insertText(`〔注：${content}〕`, Word.InsertLocation.after);
        await context.sync();
    });
    return ok(call, { content }, '已插入脚注标记');
}

async function insertCrossReferenceMarker(call: AgentToolCall): Promise<ToolResult> {
    const args = asRecord(call.arguments);
    const id = asString(args.id, `ref-${Date.now()}`);
    const label = asString(args.label, id);
    await Word.run(async (context) => {
        const range = await getTargetRange(context, asString(args.target, 'selection'));
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
    await Word.run(async (context) => {
        const range = await getTargetRange(context, asString(args.target, 'selection'));
        const r = range as unknown as { insertComment?: (text: string) => void };
        if (typeof r.insertComment === 'function') {
            r.insertComment(content);
        } else {
            range.insertText(`〔批注：${content}〕`, Word.InsertLocation.after);
        }
        await context.sync();
    });
    return ok(call, { content }, '已添加批注');
}

async function getComments(call: AgentToolCall): Promise<ToolResult> {
    return Word.run(async (context) => {
        const body = context.document.body as unknown as { getComments?: () => { load: (props?: string) => void; items?: unknown[] } };
        if (!body.getComments) return ok(call, { comments: [] }, '当前 Word API 不支持读取批注');
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
        paragraphs.items.forEach((paragraph, index) => {
            const text = paragraph.text.trim();
            const match = String(paragraph.style || '').match(/heading\s*(\d)/i);
            if (match && !text) issues.push(`空标题：${rangeRefForParagraph(index)}`);
            if (match) {
                const level = Number(match[1]);
                if (previousLevel && level > previousLevel + 1) {
                    issues.push(`标题层级跳跃：${rangeRefForParagraph(index)}`);
                }
                previousLevel = level;
            }
        });
        return ok(call, { issues }, issues.length ? `发现 ${issues.length} 个问题` : '文档验证通过');
    });
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
