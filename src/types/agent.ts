import { ModelConfig } from './modelConfig';

export type AgentPermissionMode = 'standard' | 'bypass';
export type AgentRunStatus = 'planned' | 'completed' | 'failed' | 'rolled_back';
export type AgentToolRisk = 'read' | 'write' | 'destructive' | 'rollback';
export type AgentContentFormat = 'text' | 'html' | 'docir' | 'ooxml';
export type AgentTarget = 'selection' | 'body' | string;

export interface AgentMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AgentRunOptions {
    userMessage: string;
    conversationHistory: AgentMessage[];
    model: ModelConfig;
    permissionMode: AgentPermissionMode;
    uploadedFilesText?: string;
    maxRuntimeMs?: number;
    maxConsecutiveNoProgressSteps?: number;
    maxSteps?: number;
    executePlannedCalls?: AgentToolCall[];
}

export interface AgentRunResult {
    status: AgentRunStatus;
    snapshotId?: string;
    finalMessage: string;
    plan?: AgentPlan;
    toolCalls: AgentToolCall[];
    toolResults: ToolResult[];
    canRollback: boolean;
}

export interface AgentPlan {
    summary: string;
    impact: string;
    toolCalls: AgentToolCall[];
}

export interface AgentToolDefinition {
    name: AgentToolName;
    description: string;
    risk: AgentToolRisk;
    parameters: Record<string, unknown>;
}

export type AgentToolName =
    | 'get_document_outline'
    | 'get_selection'
    | 'read_range'
    | 'grep_document'
    | 'insert_content'
    | 'replace_range'
    | 'delete_range'
    | 'set_paragraph_format'
    | 'set_text_format'
    | 'apply_named_style'
    | 'define_or_update_style'
    | 'manage_headings'
    | 'insert_table_or_update_table'
    | 'insert_toc'
    | 'set_page_setup'
    | 'set_header_footer'
    | 'insert_footnote_or_endnote'
    | 'insert_cross_reference_marker'
    | 'manage_citations'
    | 'add_comment'
    | 'get_comments'
    | 'preview_changes'
    | 'validate_document'
    | 'rollback_turn'
    | 'commit_turn';

export interface AgentToolCall<TArgs = Record<string, unknown>> {
    id: string;
    name: AgentToolName;
    arguments: TArgs;
    riskLevel?: AgentToolRisk;
}

export interface ToolResult<TData = unknown> {
    toolCallId: string;
    toolName: AgentToolName;
    ok: boolean;
    data?: TData;
    error?: {
        code: string;
        message: string;
        recoverable: boolean;
    };
    summary: string;
}

export interface DocIR {
    version: 'docir-1';
    stories: DocIRStory[];
    styles: Record<string, CssLikeStyle>;
    refs: Array<{ rangeRef: string; wordPath?: string }>;
}

export interface DocIRStory {
    story: 'body' | 'header' | 'footer';
    sectionIndex?: number;
    blocks: DocIRBlock[];
}

export interface DocIRBlock {
    type: 'paragraph' | 'heading' | 'list' | 'table' | 'quote' | 'code' | 'image' | 'field' | 'note';
    rangeRef: string;
    markdown: string;
    text?: string;
    style?: CssLikeStyle;
    word?: WordSpecificFormat;
}

export interface CssLikeStyle {
    fontFamily?: string;
    fontSizePt?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    highlightColor?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: string;
    textIndentChars?: number;
    outlineLevel?: number;
    spaceBeforePt?: number;
    spaceAfterPt?: number;
}

export interface WordSpecificFormat {
    outlineLevel?: number;
    numbering?: string;
    section?: number;
    headerFooterKind?: 'primary' | 'firstPage' | 'evenPages';
    fieldCode?: string;
    ooxmlHash?: string;
}

export interface GrepDocumentParams {
    query: string;
    scope?: 'body' | 'selection' | 'headers' | 'footers' | 'all';
    mode?: 'plain' | 'wildcard' | 'regex_fallback' | 'semantic';
    matchCase?: boolean;
    matchWholeWord?: boolean;
    ignorePunct?: boolean;
    ignoreSpace?: boolean;
    includeFormat?: 'none' | 'summary' | 'docir' | 'ooxml';
    contextChars?: number;
    maxResults?: number;
    cursor?: string;
}

export interface GrepDocumentResult {
    results: GrepDocumentMatch[];
    nextCursor?: string;
    searchedBy: 'wordApi' | 'jsIndex' | 'semanticIndex';
}

export interface GrepDocumentMatch {
    rangeRef: string;
    story: 'body' | 'header' | 'footer';
    sectionIndex: number;
    paragraphIndex: number;
    textBefore: string;
    matchText: string;
    textAfter: string;
    format?: CssLikeStyle | DocIRBlock;
    ooxmlExcerpt?: string;
}

export interface DocumentSnapshot {
    id: string;
    createdAt: number;
    label: string;
    kind: 'docx' | 'ooxml';
    base64?: string;
    ooxml?: string;
    canRestoreFully: boolean;
}
