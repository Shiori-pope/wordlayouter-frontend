import { LayoutPreset } from '../types/layoutPreset';
import { ModelConfig, getApiKey } from '../types/modelConfig';
import {
    AgentPlan,
    AgentRunOptions,
    AgentRunResult,
    AgentToolCall,
    AgentToolName,
    ToolResult,
} from '../types/agent';
import { createTurnSnapshot, restoreSnapshot } from './documentSnapshotService';
import { buildInitialAgentContext, compactToolResults } from './agentContextService';
import { AGENT_TOOL_DEFINITIONS, executeWordTool, validateToolCall } from './agentTools/wordTools';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_call_id?: string;
    tool_calls?: unknown[];
    reasoning_content?: string;
}

interface ModelStep {
    content: string;
    toolCalls: AgentToolCall[];
    reasoningContent?: string;
    reasoningTokens: number;
}

const MAX_TOOL_STEPS = 8;

export type AgentRunEvent =
    | { type: 'status'; message: string }
    | { type: 'thinking'; message: string; tokens: number }
    | { type: 'tool'; message: string; toolName: AgentToolName }
    | { type: 'tool_result'; message: string; toolName: AgentToolName; ok: boolean };

function getModelApiKey(model: ModelConfig): string {
    return model.apiKeyStorageKey ? getApiKey(model.apiKeyStorageKey) : '';
}

function stringifyToolResult(result: ToolResult): string {
    return JSON.stringify({
        ok: result.ok,
        summary: result.summary,
        data: result.data,
        error: result.error,
    }).slice(0, 12000);
}

function buildAgentSystemPrompt(permissionMode: string, layoutPreset?: LayoutPreset | null): string {
    return `你是 Word Layouter 2.0 的 Word Agent。你可以通过工具读取、搜索、修改、验证和回退当前 Word 文档。

执行规则：
1. 默认不要让用户手工复制内容；需要改文档时必须调用工具。
2. 不要臆造 rangeRef。只能使用 get_document_outline、grep_document、get_selection、read_range 返回的 rangeRef。
3. 需要理解全文时先调用 get_document_outline，再用 grep_document/read_range 分批读取，不要要求一次性把全文放进上下文。
4. 当前权限模式：${permissionMode}。standard 模式只输出计划和工具调用；bypass 模式可以直接执行。
5. 复杂格式优先使用 DocIR 或 HTML；精确底层结构、页眉页脚、目录、回退使用 OOXML 或专用工具。
6. 工具执行后要验证关键结果，最终用中文简洁说明做了什么。

当前版式预设：
${layoutPreset?.formatDescription || '未指定'}

如果模型所在通道不支持原生工具调用，必须只输出严格 JSON：
{
  "final": "给用户的最终说明或计划摘要",
  "plan": {"summary":"...", "impact":"..."},
  "toolCalls": [{"id":"call-1","name":"grep_document","arguments":{"query":"..."}, "riskLevel":"read"}]
}`;
}

function toOpenAITools() {
    return AGENT_TOOL_DEFINITIONS.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: `${tool.description} Risk: ${tool.risk}.`,
            parameters: {
                type: 'object',
                additionalProperties: true,
                properties: {},
            },
        },
    }));
}

function parseJsonFallback(content: string): ModelStep | null {
    const trimmed = content.trim();
    const jsonText = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] || trimmed;
    try {
        const parsed = JSON.parse(jsonText);
        const rawCalls = Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [];
        const toolCalls = rawCalls
            .map(validateToolCall)
            .filter(Boolean) as AgentToolCall[];
        return { content: String(parsed.final || parsed.plan?.summary || content), toolCalls, reasoningTokens: 0 };
    } catch {
        return null;
    }
}

function estimateTokens(text: string): number {
    if (!text) return 0;
    const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const nonCjkChars = text.length - cjkChars;
    return Math.ceil(cjkChars * 0.8 + nonCjkChars / 4);
}

function normalizeOpenAIToolCalls(rawCalls: unknown[] | undefined): AgentToolCall[] {
    if (!Array.isArray(rawCalls)) return [];
    return rawCalls
        .map((raw) => {
            const record = raw as {
                id?: string;
                function?: { name?: string; arguments?: string };
            };
            const argsText = record.function?.arguments || '{}';
            let args: Record<string, unknown> = {};
            try {
                args = JSON.parse(argsText);
            } catch {
                args = {};
            }
            return validateToolCall({
                id: record.id,
                name: record.function?.name,
                arguments: args,
            });
        })
        .filter(Boolean) as AgentToolCall[];
}

async function callOpenAICompatible(
    model: ModelConfig,
    messages: ChatMessage[],
    useTools: boolean
): Promise<ModelStep> {
    const apiKey = getModelApiKey(model);
    if (!apiKey) throw new Error('请先配置 API Key');

    const response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model.id,
            messages,
            temperature: 0.2,
            max_tokens: Math.min(model.maxTokens || 8192, 8192),
            tools: useTools ? toOpenAITools() : undefined,
            tool_choice: useTools ? 'auto' : undefined,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message || {};
    const content = message.content || '';
    const reasoningContent = message.reasoning_content || message.reasoning?.content || '';
    const toolCalls = normalizeOpenAIToolCalls(message.tool_calls);
    return parseJsonFallback(content) || {
        content,
        toolCalls,
        reasoningContent,
        reasoningTokens: estimateTokens(reasoningContent),
    };
}

async function callAnthropic(
    model: ModelConfig,
    messages: ChatMessage[],
    useTools: boolean
): Promise<ModelStep> {
    const apiKey = getModelApiKey(model);
    if (!apiKey) throw new Error('请先配置 API Key');

    const system = messages.filter(m => m.role === 'system').map(m => m.content || '').join('\n\n');
    const chatMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
        }));

    const response = await fetch(model.apiUrl, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model.id,
            max_tokens: Math.min(model.maxTokens || 8192, 8192),
            system,
            messages: chatMessages,
            tools: useTools ? AGENT_TOOL_DEFINITIONS.map(tool => ({
                name: tool.name,
                description: `${tool.description} Risk: ${tool.risk}.`,
                input_schema: { type: 'object', additionalProperties: true, properties: {} },
            })) : undefined,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const contentBlocks = Array.isArray(data.content) ? data.content : [];
    const text = contentBlocks.filter((b: { type?: string }) => b.type === 'text').map((b: { text?: string }) => b.text || '').join('\n');
    const toolCalls = contentBlocks
        .filter((b: { type?: string }) => b.type === 'tool_use')
        .map((b: { id?: string; name?: string; input?: Record<string, unknown> }) => validateToolCall({
            id: b.id,
            name: b.name,
            arguments: b.input || {},
        }))
        .filter(Boolean) as AgentToolCall[];

    return parseJsonFallback(text) || { content: text, toolCalls, reasoningTokens: 0 };
}

async function callGoogleOrFallback(model: ModelConfig, messages: ChatMessage[]): Promise<ModelStep> {
    const apiKey = getModelApiKey(model);
    if (!apiKey) throw new Error('请先配置 API Key');

    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }],
        }));
    const systemText = messages.filter(m => m.role === 'system').map(m => m.content || '').join('\n\n');

    const response = await fetch(`${model.apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemText }] },
            contents,
            generationConfig: {
                maxOutputTokens: Math.min(model.maxTokens || 8192, 8192),
                temperature: 0.2,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseJsonFallback(text) || { content: text, toolCalls: [], reasoningTokens: 0 };
}

async function callAgentModel(model: ModelConfig, messages: ChatMessage[], useTools: boolean): Promise<ModelStep> {
    if (model.provider === 'anthropic') {
        return callAnthropic(model, messages, useTools);
    }
    if (model.provider === 'google') {
        return callGoogleOrFallback(model, messages);
    }
    return callOpenAICompatible(model, messages, useTools);
}

function planFromStep(step: ModelStep): AgentPlan {
    return {
        summary: step.content || `准备执行 ${step.toolCalls.length} 个 Word 工具`,
        impact: step.toolCalls.map(call => `${call.name}(${call.riskLevel || 'unknown'})`).join(' -> ') || '不会修改文档',
        toolCalls: step.toolCalls,
    };
}

function buildUserPrompt(options: AgentRunOptions, contextText: string): string {
    return `用户任务：
${options.userMessage}

上传文件文本：
${options.uploadedFilesText || '无'}

当前文档上下文：
${contextText}`;
}

export async function runAgentTurn(
    options: AgentRunOptions,
    layoutPreset?: LayoutPreset | null,
    onEvent?: (event: string | AgentRunEvent) => void
): Promise<AgentRunResult> {
    const snapshot = await createTurnSnapshot(`Agent turn: ${options.userMessage.slice(0, 40)}`);
    const allToolCalls: AgentToolCall[] = [];
    const allToolResults: ToolResult[] = [];

    try {
        const docContext = await buildInitialAgentContext();
        const contextText = [
            `Outline: ${docContext.outlineSummary}`,
            `Selection: ${docContext.selectionSummary}`,
            `Context tools: ${docContext.recentToolResults}`,
        ].join('\n\n');

        if (options.executePlannedCalls?.length) {
            for (const call of options.executePlannedCalls) {
                onEvent?.({ type: 'tool', message: `调用工具：${call.name}`, toolName: call.name });
                const result = await executeWordTool(call);
                allToolCalls.push(call);
                allToolResults.push(result);
                onEvent?.({ type: 'tool_result', message: `${result.ok ? '✓' : '✗'} ${result.summary}`, toolName: call.name, ok: result.ok });
                if (!result.ok && !result.error?.recoverable) {
                    throw new Error(result.error?.message || result.summary);
                }
            }
            return {
                status: 'completed',
                snapshotId: snapshot.id,
                finalMessage: `已执行 ${allToolResults.filter(r => r.ok).length} 个工具。`,
                toolCalls: allToolCalls,
                toolResults: allToolResults,
                canRollback: true,
            };
        }

        const messages: ChatMessage[] = [
            { role: 'system', content: buildAgentSystemPrompt(options.permissionMode, layoutPreset) },
            ...options.conversationHistory.slice(-8).map(m => ({ role: m.role, content: m.content } as ChatMessage)),
            { role: 'user', content: buildUserPrompt(options, contextText) },
        ];

        let finalMessage = '';
        const maxSteps = options.maxSteps || MAX_TOOL_STEPS;

        for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
            onEvent?.({ type: 'status', message: `Agent 思考中 (${stepIndex + 1}/${maxSteps})` });
            const step = await callAgentModel(options.model, messages, true);
            if (step.reasoningTokens > 0) {
                onEvent?.({ type: 'thinking', message: `模型完成思考`, tokens: step.reasoningTokens });
            }
            finalMessage = step.content || finalMessage;

            if (step.toolCalls.length === 0) {
                return {
                    status: 'completed',
                    snapshotId: snapshot.id,
                    finalMessage: finalMessage || 'Agent 已完成。',
                    toolCalls: allToolCalls,
                    toolResults: allToolResults,
                    canRollback: allToolResults.some(result => result.ok),
                };
            }

            if (options.permissionMode === 'standard') {
                return {
                    status: 'planned',
                    snapshotId: snapshot.id,
                    finalMessage: step.content || '已生成执行计划，请确认后执行。',
                    plan: planFromStep(step),
                    toolCalls: step.toolCalls,
                    toolResults: allToolResults,
                    canRollback: false,
                };
            }

            messages.push({
                role: 'assistant',
                content: step.content || null,
                reasoning_content: step.reasoningContent,
                tool_calls: step.toolCalls.map(call => ({
                    id: call.id,
                    type: 'function',
                    function: {
                        name: call.name,
                        arguments: JSON.stringify(call.arguments),
                    },
                })),
            });

            for (const call of step.toolCalls) {
                onEvent?.({ type: 'tool', message: `调用工具：${call.name}`, toolName: call.name });
                const result = await executeWordTool(call);
                allToolCalls.push(call);
                allToolResults.push(result);
                onEvent?.({ type: 'tool_result', message: `${result.ok ? '✓' : '✗'} ${result.summary}`, toolName: call.name, ok: result.ok });
                messages.push({
                    role: 'tool',
                    tool_call_id: call.id,
                    content: stringifyToolResult(result),
                });
                if (!result.ok && !result.error?.recoverable) {
                    throw new Error(result.error?.message || result.summary);
                }
            }

            messages.push({
                role: 'system',
                content: `已执行工具摘要：\n${compactToolResults(allToolResults)}\n继续完成任务；如已完成，请不要再调用工具，直接总结。`,
            });
        }

        return {
            status: 'completed',
            snapshotId: snapshot.id,
            finalMessage: finalMessage || `达到最大工具步数，已执行 ${allToolResults.length} 个工具。`,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            canRollback: allToolResults.some(result => result.ok),
        };
    } catch (error) {
        try {
            await restoreSnapshot(snapshot.id);
        } catch {
            // keep original error; rollback failure is reported through final message.
        }
        return {
            status: 'failed',
            snapshotId: snapshot.id,
            finalMessage: `Agent 执行失败，已尝试回退：${error instanceof Error ? error.message : String(error)}`,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            canRollback: true,
        };
    }
}
