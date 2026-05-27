import { AgentToolCall, ToolResult } from '../types/agent';
import { executeWordTool } from './agentTools/wordTools';

export interface AgentDocumentContext {
    outlineSummary: string;
    selectionSummary: string;
    recentToolResults: string;
}

function summarizeToolResult(result: ToolResult): string {
    if (result.ok) return `${result.toolName}: ${result.summary}`;
    return `${result.toolName}: ERROR ${result.error?.message || result.summary}`;
}

export async function buildInitialAgentContext(): Promise<AgentDocumentContext> {
    const outlineCall: AgentToolCall = {
        id: 'ctx-outline',
        name: 'get_document_outline',
        arguments: { includeStats: true, maxDepth: 3 },
        riskLevel: 'read',
    };
    const selectionCall: AgentToolCall = {
        id: 'ctx-selection',
        name: 'get_selection',
        arguments: { format: 'text' },
        riskLevel: 'read',
    };

    const [outline, selection] = await Promise.all([
        executeWordTool(outlineCall),
        executeWordTool(selectionCall),
    ]);

    return {
        outlineSummary: JSON.stringify(outline.data || outline.error || {}),
        selectionSummary: JSON.stringify(selection.data || selection.error || {}),
        recentToolResults: [outline, selection].map(summarizeToolResult).join('\n'),
    };
}

export function compactToolResults(results: ToolResult[], maxChars: number = 6000): string {
    const text = results.map(summarizeToolResult).join('\n');
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n...[tool results truncated]` : text;
}
