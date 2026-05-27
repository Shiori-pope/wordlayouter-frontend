/**
 * 供应商目录 — 预配置的 LLM 供应商及其推荐模型
 * 数据来源：cc-switch hermesProviderPresets.ts
 */

export type ProviderCategory = 'domestic' | 'aggregator' | 'third_party' | 'research' | 'local';

export interface ProviderPreset {
    id: string;
    name: string;
    category: ProviderCategory;
    baseUrl: string;
    chatPath: string;
    apiKeyStorageKey: string;
    apiKeyUrl: string;
    recommendedModels: RecommendedModel[];
    isLocal: boolean;
}

export interface RecommendedModel {
    id: string;
    name: string;
}

export const CATEGORY_META: Record<ProviderCategory, { name: string; order: number }> = {
    domestic:    { name: '国内厂商',  order: 1 },
    aggregator:  { name: '聚合平台',  order: 2 },
    third_party: { name: '第三方',    order: 3 },
    research:    { name: '研究机构',  order: 4 },
    local:       { name: '本地/自部署', order: 5 },
};

const STORAGE_PREFIX = 'word-ai';

export const PROVIDER_CATALOG: ProviderPreset[] = [
    // ========== 国内厂商 ==========
    {
        id: 'deepseek',
        name: 'DeepSeek',
        category: 'domestic',
        baseUrl: 'https://api.deepseek.com',
        chatPath: '/v1/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-deepseek-key`,
        apiKeyUrl: 'https://platform.deepseek.com',
        recommendedModels: [
            { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
            { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
        ],
        isLocal: false,
    },
    {
        id: 'zhipu',
        name: '智谱 GLM',
        category: 'domestic',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-zhipu-key`,
        apiKeyUrl: 'https://open.bigmodel.cn',
        recommendedModels: [
            { id: 'glm-5', name: 'GLM-5' },
        ],
        isLocal: false,
    },
    {
        id: 'zhipu-global',
        name: '智谱 GLM 国际',
        category: 'domestic',
        baseUrl: 'https://api.z.ai/api/paas/v4',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-zhipu-global-key`,
        apiKeyUrl: 'https://z.ai',
        recommendedModels: [
            { id: 'glm-5', name: 'GLM-5' },
        ],
        isLocal: false,
    },
    {
        id: 'aliyun',
        name: '阿里百炼 (通义千问)',
        category: 'domestic',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-aliyun-key`,
        apiKeyUrl: 'https://bailian.console.aliyun.com',
        recommendedModels: [
            { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus' },
            { id: 'qwen3-max', name: 'Qwen3 Max' },
        ],
        isLocal: false,
    },
    {
        id: 'moonshot',
        name: 'Kimi (月之暗面)',
        category: 'domestic',
        baseUrl: 'https://api.moonshot.cn/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-moonshot-key`,
        apiKeyUrl: 'https://platform.moonshot.cn',
        recommendedModels: [
            { id: 'kimi-k2.6', name: 'Kimi K2.6' },
        ],
        isLocal: false,
    },
    {
        id: 'stepfun',
        name: 'StepFun (阶跃星辰)',
        category: 'domestic',
        baseUrl: 'https://api.stepfun.ai/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-stepfun-key`,
        apiKeyUrl: 'https://platform.stepfun.ai',
        recommendedModels: [
            { id: 'step-3.5-flash', name: 'Step 3.5 Flash' },
        ],
        isLocal: false,
    },
    {
        id: 'minimax',
        name: 'MiniMax',
        category: 'domestic',
        baseUrl: 'https://api.minimaxi.com/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-minimax-key`,
        apiKeyUrl: 'https://platform.minimaxi.com',
        recommendedModels: [
            { id: 'MiniMax-M2.7', name: 'MiniMax M2.7' },
        ],
        isLocal: false,
    },
    {
        id: 'minimax-global',
        name: 'MiniMax 国际',
        category: 'domestic',
        baseUrl: 'https://api.minimax.io/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-minimax-global-key`,
        apiKeyUrl: 'https://platform.minimax.io',
        recommendedModels: [
            { id: 'MiniMax-M2.7', name: 'MiniMax M2.7' },
        ],
        isLocal: false,
    },
    {
        id: 'xiaomimimo',
        name: '小米 MiMo',
        category: 'domestic',
        baseUrl: 'https://api.xiaomimimo.com/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-xiaomimimo-key`,
        apiKeyUrl: 'https://platform.xiaomimimo.com',
        recommendedModels: [
            { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro' },
        ],
        isLocal: false,
    },
    {
        id: 'xiaomimimo-token',
        name: '小米 MiMo Token Plan',
        category: 'domestic',
        baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-xiaomimimo-token-key`,
        apiKeyUrl: 'https://platform.xiaomimimo.com',
        recommendedModels: [
            { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro' },
        ],
        isLocal: false,
    },
    {
        id: 'longcat',
        name: 'Longcat',
        category: 'domestic',
        baseUrl: 'https://api.longcat.chat/openai/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-longcat-key`,
        apiKeyUrl: 'https://longcat.chat/platform',
        recommendedModels: [
            { id: 'LongCat-Flash-Chat', name: 'LongCat Flash Chat' },
        ],
        isLocal: false,
    },

    // ========== 聚合平台 ==========
    {
        id: 'siliconflow',
        name: 'SiliconFlow',
        category: 'aggregator',
        baseUrl: 'https://api.siliconflow.cn/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-siliconflow-key`,
        apiKeyUrl: 'https://siliconflow.cn',
        recommendedModels: [
            { id: 'Pro/MiniMaxAI/MiniMax-M2.7', name: 'MiniMax M2.7' },
        ],
        isLocal: false,
    },
    {
        id: 'siliconflow-intl',
        name: 'SiliconFlow 国际',
        category: 'aggregator',
        baseUrl: 'https://api.siliconflow.com/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-siliconflow-intl-key`,
        apiKeyUrl: 'https://siliconflow.com',
        recommendedModels: [
            { id: 'MiniMaxAI/MiniMax-M2.7', name: 'MiniMax M2.7' },
        ],
        isLocal: false,
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        category: 'aggregator',
        baseUrl: 'https://openrouter.ai/api/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-openrouter-key`,
        apiKeyUrl: 'https://openrouter.ai',
        recommendedModels: [
            { id: 'anthropic/claude-opus-4-7', name: 'Claude Opus 4.7' },
        ],
        isLocal: false,
    },
    {
        id: 'therouter',
        name: 'TheRouter',
        category: 'aggregator',
        baseUrl: 'https://api.therouter.ai/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-therouter-key`,
        apiKeyUrl: 'https://therouter.ai',
        recommendedModels: [
            { id: 'openai/gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'together',
        name: 'Together AI',
        category: 'aggregator',
        baseUrl: 'https://api.together.xyz/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-together-key`,
        apiKeyUrl: 'https://together.ai',
        recommendedModels: [
            { id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct', name: 'Qwen3 Coder 480B' },
        ],
        isLocal: false,
    },
    {
        id: 'novita',
        name: 'Novita AI',
        category: 'aggregator',
        baseUrl: 'https://api.novita.ai',
        chatPath: '/v3/openai/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-novita-key`,
        apiKeyUrl: 'https://novita.ai',
        recommendedModels: [
            { id: 'zai-org/glm-5', name: 'GLM-5' },
        ],
        isLocal: false,
    },
    {
        id: 'aihubmix',
        name: 'AiHubMix',
        category: 'aggregator',
        baseUrl: 'https://aihubmix.com/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-aihubmix-key`,
        apiKeyUrl: 'https://aihubmix.com',
        recommendedModels: [
            { id: 'gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'dmxapi',
        name: 'DMXAPI',
        category: 'aggregator',
        baseUrl: 'https://www.dmxapi.cn/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-dmxapi-key`,
        apiKeyUrl: 'https://www.dmxapi.cn',
        recommendedModels: [
            { id: 'gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'modelscope',
        name: 'ModelScope (魔搭)',
        category: 'aggregator',
        baseUrl: 'https://api-inference.modelscope.cn/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-modelscope-key`,
        apiKeyUrl: 'https://modelscope.cn',
        recommendedModels: [
            { id: 'ZhipuAI/GLM-5', name: 'GLM-5' },
        ],
        isLocal: false,
    },
    {
        id: 'compshare',
        name: 'Compshare (算力共享)',
        category: 'aggregator',
        baseUrl: 'https://api.modelverse.cn/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-compshare-key`,
        apiKeyUrl: 'https://www.compshare.cn',
        recommendedModels: [
            { id: 'gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'compshare-coding',
        name: 'Compshare Coding Plan',
        category: 'aggregator',
        baseUrl: 'https://cp.compshare.cn/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-compshare-coding-key`,
        apiKeyUrl: 'https://www.compshare.cn',
        recommendedModels: [
            { id: 'gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'shengsuanyun',
        name: '胜算云',
        category: 'aggregator',
        baseUrl: 'https://router.shengsuanyun.com/api/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-shengsuanyun-key`,
        apiKeyUrl: 'https://www.shengsuanyun.com',
        recommendedModels: [
            { id: 'openai/gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'nvidia-nim',
        name: 'NVIDIA NIM',
        category: 'aggregator',
        baseUrl: 'https://integrate.api.nvidia.com',
        chatPath: '/v1/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-nvidia-nim-key`,
        apiKeyUrl: 'https://build.nvidia.com',
        recommendedModels: [
            { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5' },
        ],
        isLocal: false,
    },

    // ========== 第三方 ==========
    {
        id: 'lemondata',
        name: 'LemonData',
        category: 'third_party',
        baseUrl: 'https://api.lemondata.cc/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-lemondata-key`,
        apiKeyUrl: '',
        recommendedModels: [
            { id: 'gpt-5.4', name: 'GPT-5.4' },
        ],
        isLocal: false,
    },
    {
        id: 'patewayai',
        name: 'PatewayAI',
        category: 'third_party',
        baseUrl: 'https://api.pateway.ai',
        chatPath: '/v1/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-patewayai-key`,
        apiKeyUrl: '',
        recommendedModels: [],
        isLocal: false,
    },

    // ========== 研究机构 ==========
    {
        id: 'nous-research',
        name: 'Nous Research',
        category: 'research',
        baseUrl: 'https://inference-api.nousresearch.com/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: `${STORAGE_PREFIX}-nous-research-key`,
        apiKeyUrl: '',
        recommendedModels: [
            { id: 'Hermes-4-405B', name: 'Hermes 4 405B' },
        ],
        isLocal: false,
    },

    // ========== 本地 / 自部署 ==========
    {
        id: 'ollama',
        name: 'Ollama',
        category: 'local',
        baseUrl: 'http://localhost:11434/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: '',
        apiKeyUrl: '',
        recommendedModels: [],
        isLocal: true,
    },
    {
        id: 'vllm',
        name: 'vLLM',
        category: 'local',
        baseUrl: 'http://localhost:8000/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: '',
        apiKeyUrl: '',
        recommendedModels: [],
        isLocal: true,
    },
    {
        id: 'lmstudio',
        name: 'LM Studio',
        category: 'local',
        baseUrl: 'http://localhost:1234/v1',
        chatPath: '/chat/completions',
        apiKeyStorageKey: '',
        apiKeyUrl: '',
        recommendedModels: [],
        isLocal: true,
    },
];

export function getProviderPreset(id: string): ProviderPreset | undefined {
    return PROVIDER_CATALOG.find(p => p.id === id);
}

export function getProvidersByCategory(): Record<ProviderCategory, ProviderPreset[]> {
    const grouped: Record<ProviderCategory, ProviderPreset[]> = {
        domestic: [],
        aggregator: [],
        third_party: [],
        research: [],
        local: [],
    };
    for (const p of PROVIDER_CATALOG) {
        grouped[p.category].push(p);
    }
    return grouped;
}

export function getProviderApiKeyStorageKey(providerId: string): string {
    const preset = getProviderPreset(providerId);
    return preset?.apiKeyStorageKey ?? '';
}
