import { AgentToolCall, ToolResult } from '../../types/agent';
import { affectedRangeRefsFromArgs } from './rangeRefService';

export interface ToolOperationRecord {
    operationId: string;
    toolCallId: string;
    toolName: string;
    riskLevel?: string;
    summary: string;
    ok: boolean;
    createdAt: number;
    affectedRangeRefs: string[];
    beforeDigest?: string;
    afterDigest?: string;
}

const MAX_OPERATION_RECORDS = 200;
const operationRecords: ToolOperationRecord[] = [];

function digest(value: unknown): string {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `d${(hash >>> 0).toString(16)}`;
}

export function createOperationId(toolName: string): string {
    return `op-${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordToolOperation(call: AgentToolCall, result: ToolResult): ToolResult {
    const args = call.arguments && typeof call.arguments === 'object' ? call.arguments as Record<string, unknown> : {};
    const affectedRangeRefs = result.affectedRangeRefs?.length ? result.affectedRangeRefs : affectedRangeRefsFromArgs(args);
    const operationId = result.operationId || createOperationId(call.name);
    const beforeDigest = result.beforeDigest || digest({ tool: call.name, args, phase: 'before' });
    const afterDigest = result.afterDigest || digest({ tool: call.name, data: result.data, error: result.error, phase: 'after' });

    const enriched: ToolResult = {
        ...result,
        operationId,
        affectedRangeRefs,
        beforeDigest,
        afterDigest,
        verification: result.verification || { ok: result.ok, details: [result.summary] },
    };

    operationRecords.push({
        operationId,
        toolCallId: call.id,
        toolName: call.name,
        riskLevel: call.riskLevel,
        summary: result.summary,
        ok: result.ok,
        createdAt: Date.now(),
        affectedRangeRefs,
        beforeDigest,
        afterDigest,
    });

    if (operationRecords.length > MAX_OPERATION_RECORDS) {
        operationRecords.splice(0, operationRecords.length - MAX_OPERATION_RECORDS);
    }

    return enriched;
}

export function listToolOperations(operationIds?: string[]): ToolOperationRecord[] {
    if (!operationIds?.length) return [...operationRecords];
    const wanted = new Set(operationIds);
    return operationRecords.filter(record => wanted.has(record.operationId));
}

export function clearToolOperations() {
    operationRecords.splice(0, operationRecords.length);
}
