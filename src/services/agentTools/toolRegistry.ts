import { AgentToolCall, AgentToolDefinition, ToolResult } from '../../types/agent';
import { validateToolArguments } from './toolValidationService';

export type AgentToolHandler = (call: AgentToolCall) => Promise<ToolResult>;

export interface RegisteredAgentTool extends AgentToolDefinition {
    capability: 'wordApi' | 'ooxmlPackage' | 'hybrid' | 'operation';
    implemented: boolean;
    handler?: AgentToolHandler;
}

export function createUnsupportedToolResult(call: AgentToolCall, message: string): ToolResult {
    return {
        toolCallId: call.id,
        toolName: call.name,
        ok: false,
        summary: message,
        error: {
            code: 'UNSUPPORTED_CAPABILITY',
            message,
            recoverable: true,
        },
        verification: { ok: false, details: [message] },
    };
}

export function validateRegisteredToolCall(tool: RegisteredAgentTool, call: AgentToolCall): ToolResult | null {
    const error = validateToolArguments(tool, call);
    if (!error) return null;
    return {
        toolCallId: call.id,
        toolName: call.name,
        ok: false,
        summary: error.message,
        error: {
            code: error.code,
            message: error.message,
            recoverable: true,
        },
        verification: { ok: false, details: [error.message] },
    };
}
