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
import { AGENT_TOOL_DEFINITIONS, executeWordTool, setAgentToolCssStyles, validateToolCall } from './agentTools/wordTools';

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

interface ModelCallbacks {
    onReasoningDelta?: (delta: string, tokenDelta: number) => void;
}

const DEFAULT_MAX_RUNTIME_MS = 10 * 60 * 1000;
const DEFAULT_MAX_CONSECUTIVE_NO_PROGRESS_STEPS = 3;

export type AgentRunEvent =
    | { type: 'status'; message: string; step?: number; elapsedMs?: number }
    | { type: 'thinking'; message: string; tokens: number; totalTokens: number; step?: number }
    | { type: 'tool'; message: string; toolName: AgentToolName; argsPreview: string; args: unknown; step?: number }
    | { type: 'tool_result'; message: string; toolName: AgentToolName; ok: boolean; summary: string; step?: number };

function getModelApiKey(model: ModelConfig): string {
    return model.apiKeyStorageKey ? getApiKey(model.apiKeyStorageKey) : '';
}

function stringifyToolResult(result: ToolResult): string {
    return JSON.stringify({
        ok: result.ok,
        summary: result.summary,
        data: result.data,
        error: result.error,
        operationId: result.operationId,
        affectedRangeRefs: result.affectedRangeRefs,
        verification: result.verification,
    }).slice(0, 12000);
}

function buildAgentSystemPrompt(permissionMode: string, layoutPreset?: LayoutPreset | null): string {
    return `你是 Word Layouter 2.0 的 Word Agent。你可以通过工具读取、搜索、修改、验证和回退当前 Word 文档。

执行规则：
1. 默认不要让用户手工复制内容；需要改文档时必须调用工具。
2. 不要臆造 rangeRef。只能使用 get_document_outline、get_document_inventory、grep_document、get_selection、read_range、read_paragraphs、find_insert_position 返回的 rangeRef。支持 body:p10、body:p10-20、body:p10:r0-12、table:t0、table:t0:r1:c2、section:s0:header:primary:p0。
3. 需要理解全文时先调用 get_document_outline 或 get_document_inventory，再用 read_paragraphs/read_range 批量读取相关窗口；grep_document 只用于精确锚点搜索，不要用多个 grep 猜结构。
4. 当前权限模式：${permissionMode}。standard 模式只输出计划和工具调用；bypass 模式可以直接执行。
5. 复杂格式优先使用 DocIR 或 HTML；精确底层结构、页眉页脚、目录、回退使用 OOXML 或专用工具。
6. 工具执行后要验证关键结果，最终用中文简洁说明做了什么。
7. 用户要求“增加章节/插入小节/补充一节”时，优先调用 find_insert_position 定位，再调用 insert_section 插入完整章节；只有 confidence < 0.6 时再用 read_paragraphs 补充上下文。
8. 插入富文本内容必须使用 format:"html" 或 insert_section；禁止把 Markdown 代码块或 HTML 代码围栏作为正文插入。HTML 插入工具会自动应用当前版式 CSS 并内联化，必要时你也可以直接给 inline style。
9. read_range 支持 body:p10 和 body:p10-20。需要连续阅读时优先用 read_paragraphs，一次读取几十个短段落并受 maxChars 限制，避免逐段调用。
10. 批量修改标题/大纲层级时优先调用 manage_headings，不要连续调用很多次 apply_named_style。apply_named_style 的目标参数用 rangeRef 或 target，标题样式名用 Heading1..Heading9。
11. 批量或复杂操作后调用 validate_document；标准模式计划可用 preview_changes 说明 operationId、受影响范围和风险。
12. 工具参数必须严格匹配 schema；不要传未知字段。表格整体读取用 table:tN，单元格用 table:tN:rR:cC。

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
            parameters: tool.parameters?.type ? tool.parameters : {
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

function previewArgs(args: unknown, maxChars = 220): string {
    let text = '';
    try {
        text = JSON.stringify(args);
    } catch {
        text = String(args);
    }
    return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function debugAgent(label: string, payload?: unknown) {
    try {
        const entry = { time: new Date().toISOString(), label, payload };
        const debugWindow = window as unknown as { __WORD_AGENT_DEBUG__?: unknown[] };
        debugWindow.__WORD_AGENT_DEBUG__ = [...(debugWindow.__WORD_AGENT_DEBUG__ || []), entry].slice(-500);
        console.log(`[WordAgent] ${label}`, payload || '');
    } catch {
        // ignore console failures in older hosts
    }
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

function normalizeOpenAIStreamToolCalls(toolCallParts: Map<number, { id?: string; name?: string; argumentsText: string }>): AgentToolCall[] {
    const rawCalls = Array.from(toolCallParts.entries())
        .sort(([a], [b]) => a - b)
        .map(([, part]) => ({
            id: part.id,
            function: {
                name: part.name,
                arguments: part.argumentsText || '{}',
            },
        }));
    return normalizeOpenAIToolCalls(rawCalls);
}

async function parseOpenAICompatibleStream(
    response: Response,
    callbacks?: ModelCallbacks
): Promise<ModelStep> {
    if (!response.body) throw new Error('当前运行环境不支持流式响应读取');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let reasoningContent = '';
    const toolCallParts = new Map<number, { id?: string; name?: string; argumentsText: string }>();

    const handlePayload = (payload: string) => {
        if (!payload || payload === '[DONE]') return;
        let parsed: {
            choices?: Array<{
                delta?: {
                    content?: string;
                    reasoning_content?: string;
                    reasoning?: { content?: string };
                    tool_calls?: Array<{
                        index?: number;
                        id?: string;
                        function?: { name?: string; arguments?: string };
                    }>;
                };
                message?: {
                    content?: string;
                    reasoning_content?: string;
                    reasoning?: { content?: string };
                    tool_calls?: unknown[];
                };
            }>;
        };
        try {
            parsed = JSON.parse(payload);
        } catch {
            debugAgent('model:stream:bad-json', payload.slice(0, 500));
            return;
        }

        const choice = parsed.choices?.[0];
        const delta = choice?.delta;
        const message = choice?.message;
        if (message) {
            content += message.content || '';
            reasoningContent += message.reasoning_content || message.reasoning?.content || '';
            for (const call of normalizeOpenAIToolCalls(message.tool_calls as unknown[] | undefined)) {
                toolCallParts.set(toolCallParts.size, {
                    id: call.id,
                    name: call.name,
                    argumentsText: JSON.stringify(call.arguments),
                });
            }
        }
        if (!delta) return;

        if (delta.content) {
            content += delta.content;
        }

        const reasoningDelta = delta.reasoning_content || delta.reasoning?.content || '';
        if (reasoningDelta) {
            reasoningContent += reasoningDelta;
            const tokenDelta = estimateTokens(reasoningDelta);
            callbacks?.onReasoningDelta?.(reasoningDelta, tokenDelta);
            debugAgent('model:stream:reasoning-delta', { tokenDelta, chars: reasoningDelta.length });
        }

        for (const rawToolCall of delta.tool_calls || []) {
            const index = rawToolCall.index ?? toolCallParts.size;
            const current = toolCallParts.get(index) || { argumentsText: '' };
            current.id = rawToolCall.id || current.id;
            current.name = rawToolCall.function?.name || current.name;
            current.argumentsText += rawToolCall.function?.arguments || '';
            toolCallParts.set(index, current);
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || '';
        for (const frame of frames) {
            const dataLines = frame
                .split(/\r?\n/)
                .filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trim());
            for (const line of dataLines) handlePayload(line);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
        const dataLines = buffer
            .split(/\r?\n/)
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trim());
        for (const line of dataLines) handlePayload(line);
    }

    const toolCalls = normalizeOpenAIStreamToolCalls(toolCallParts);
    const parsedFallback = parseJsonFallback(content);
    if (parsedFallback) return parsedFallback;
    return {
        content,
        toolCalls,
        reasoningContent,
        reasoningTokens: estimateTokens(reasoningContent),
    };
}

async function callOpenAICompatible(
    model: ModelConfig,
    messages: ChatMessage[],
    useTools: boolean,
    callbacks?: ModelCallbacks
): Promise<ModelStep> {
    const apiKey = getModelApiKey(model);
    if (!apiKey) throw new Error('请先配置 API Key');
    debugAgent('model:request:openai-compatible', {
        model: model.id,
        provider: model.provider,
        useTools,
        messages,
        tools: useTools ? toOpenAITools() : undefined,
    });

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
            stream: model.supportsStreaming !== false,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    if (model.supportsStreaming !== false) {
        const step = await parseOpenAICompatibleStream(response, callbacks);
        debugAgent('model:response:openai-compatible:streamed', {
            content: step.content,
            reasoningTokens: step.reasoningTokens,
            toolCalls: step.toolCalls,
        });
        return step;
    }

    const data = await response.json();
    debugAgent('model:response:openai-compatible', data);
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
    debugAgent('model:request:anthropic', {
        model: model.id,
        provider: model.provider,
        useTools,
        system,
        messages: chatMessages,
    });

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
                input_schema: tool.parameters?.type ? tool.parameters : { type: 'object', additionalProperties: true, properties: {} },
            })) : undefined,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    debugAgent('model:response:anthropic', data);
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
    debugAgent('model:request:google', {
        model: model.id,
        provider: model.provider,
        systemText,
        contents,
    });

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
    debugAgent('model:response:google', data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseJsonFallback(text) || { content: text, toolCalls: [], reasoningTokens: 0 };
}

async function callAgentModel(model: ModelConfig, messages: ChatMessage[], useTools: boolean, callbacks?: ModelCallbacks): Promise<ModelStep> {
    if (model.provider === 'anthropic') {
        return callAnthropic(model, messages, useTools);
    }
    if (model.provider === 'google') {
        return callGoogleOrFallback(model, messages);
    }
    return callOpenAICompatible(model, messages, useTools, callbacks);
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
    debugAgent('turn:start', {
        permissionMode: options.permissionMode,
        userMessage: options.userMessage,
        model: `${options.model.provider}/${options.model.id}`,
    });
    const snapshot = await createTurnSnapshot(`Agent turn: ${options.userMessage.slice(0, 40)}`);
    const allToolCalls: AgentToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    setAgentToolCssStyles(layoutPreset?.cssStyles);

    try {
        const docContext = await buildInitialAgentContext();
        const contextText = [
            `Outline: ${docContext.outlineSummary}`,
            `Selection: ${docContext.selectionSummary}`,
            `Context tools: ${docContext.recentToolResults}`,
        ].join('\n\n');

        if (options.executePlannedCalls?.length) {
            for (const call of options.executePlannedCalls) {
                const argsPreview = previewArgs(call.arguments);
                debugAgent('tool:call', { name: call.name, arguments: call.arguments });
                onEvent?.({ type: 'tool', message: `调用工具：${call.name} ${argsPreview}`, toolName: call.name, argsPreview, args: call.arguments });
                const result = await executeWordTool(call);
                allToolCalls.push(call);
                allToolResults.push(result);
                debugAgent('tool:result', result);
                onEvent?.({ type: 'tool_result', message: `${result.ok ? '✓' : '✗'} ${result.summary}`, toolName: call.name, ok: result.ok, summary: result.summary });
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
        const maxRuntimeMs = options.maxRuntimeMs || DEFAULT_MAX_RUNTIME_MS;
        const maxNoProgressSteps = options.maxConsecutiveNoProgressSteps || DEFAULT_MAX_CONSECUTIVE_NO_PROGRESS_STEPS;
        const startedAt = Date.now();
        let stepIndex = 0;
        let consecutiveNoProgressSteps = 0;
        let totalReasoningTokens = 0;
        const seenToolFingerprints = new Set<string>();

        while (Date.now() - startedAt < maxRuntimeMs) {
            stepIndex += 1;
            onEvent?.({ type: 'status', message: `Agent 思考中，第 ${stepIndex} 轮`, step: stepIndex, elapsedMs: Date.now() - startedAt });
            let streamedReasoningTokens = 0;
            const step = await callAgentModel(options.model, messages, true, {
                onReasoningDelta: (_delta, tokenDelta) => {
                    if (tokenDelta <= 0) return;
                    streamedReasoningTokens += tokenDelta;
                    totalReasoningTokens += tokenDelta;
                    onEvent?.({ type: 'thinking', message: `模型流式思考中`, tokens: tokenDelta, totalTokens: totalReasoningTokens, step: stepIndex });
                },
            });
            const unstreamedReasoningTokens = Math.max(0, step.reasoningTokens - streamedReasoningTokens);
            if (unstreamedReasoningTokens > 0) {
                totalReasoningTokens += unstreamedReasoningTokens;
                onEvent?.({ type: 'thinking', message: `模型完成思考`, tokens: unstreamedReasoningTokens, totalTokens: totalReasoningTokens, step: stepIndex });
            }
            debugAgent('model:step', {
                step: stepIndex,
                content: step.content,
                reasoningTokens: step.reasoningTokens,
                totalReasoningTokens,
                toolCalls: step.toolCalls,
            });
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
                const argsPreview = previewArgs(call.arguments);
                const fingerprint = `${call.name}:${argsPreview}`;
                if (seenToolFingerprints.has(fingerprint)) {
                    consecutiveNoProgressSteps += 1;
                } else {
                    seenToolFingerprints.add(fingerprint);
                    consecutiveNoProgressSteps = 0;
                }
                debugAgent('tool:call', { step: stepIndex, name: call.name, arguments: call.arguments });
                onEvent?.({ type: 'tool', message: `调用工具：${call.name} ${argsPreview}`, toolName: call.name, argsPreview, args: call.arguments, step: stepIndex });
                const result = await executeWordTool(call);
                allToolCalls.push(call);
                allToolResults.push(result);
                debugAgent('tool:result', { step: stepIndex, result });
                onEvent?.({ type: 'tool_result', message: `${result.ok ? '✓' : '✗'} ${result.summary}`, toolName: call.name, ok: result.ok, summary: result.summary, step: stepIndex });
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

            if (consecutiveNoProgressSteps >= maxNoProgressSteps) {
                debugAgent('loop:stopped:no-progress', { consecutiveNoProgressSteps, maxNoProgressSteps });
                return {
                    status: 'completed',
                    snapshotId: snapshot.id,
                    finalMessage: finalMessage || `Agent 检测到重复工具调用，已暂停。已执行 ${allToolResults.length} 个工具。`,
                    toolCalls: allToolCalls,
                    toolResults: allToolResults,
                    canRollback: allToolResults.some(result => result.ok),
                };
            }
        }

        debugAgent('loop:stopped:timeout', { maxRuntimeMs, toolCalls: allToolCalls.length });
        return {
            status: 'completed',
            snapshotId: snapshot.id,
            finalMessage: finalMessage || `Agent 达到运行时间保护，已执行 ${allToolResults.length} 个工具。`,
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
