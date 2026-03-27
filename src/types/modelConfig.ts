/**
 * 模型配置类型定义
 */

export type ModelProvider =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'deepseek'
    | 'siliconflow'
    | 'aliyun'
    | 'zhipu'
    | 'baidu'
    | 'tencent'
    | 'doubao'
    | 'moonshot'
    | 'minimax'
    | 'groq'
    | 'mistral'
    | 'cohere'
    | 'perplexity'
    | 'openrouter'
    | 'ollama'
    | 'lmstudio'
    | 'bedrock'
    | 'azure'
    | 'custom';

export interface ModelConfig {
    id: string;
    name: string;
    provider: ModelProvider | string;  // string allows custom provider ids
    apiUrl: string;
    supportsVision: boolean;
    supportsStreaming: boolean;
    maxTokens: number;
    description: string;
    apiKeyStorageKey?: string;
}

/**
 * 自定义提供商配置
 */
export interface CustomProvider {
    id: string;
    name: string;
    baseUrl: string;
    chatPath?: string;  // 可选的 chat completions 路径，默认 /v1/chat/completions
    apiKeyStorageKey: string;
}

// API Key storage key prefix for each provider
export const PROVIDER_API_KEYS: Record<ModelProvider, string> = {
    openai: 'word-ai-openai-key',
    anthropic: 'word-ai-anthropic-key',
    google: 'word-ai-google-key',
    deepseek: 'word-ai-deepseek-key',
    siliconflow: 'word-ai-siliconflow-key',
    aliyun: 'word-ai-aliyun-key',
    zhipu: 'word-ai-zhipu-key',
    baidu: 'word-ai-baidu-key',
    tencent: 'word-ai-tencent-key',
    doubao: 'word-ai-doubao-key',
    moonshot: 'word-ai-moonshot-key',
    minimax: 'word-ai-minimax-key',
    groq: 'word-ai-groq-key',
    mistral: 'word-ai-mistral-key',
    cohere: 'word-ai-cohere-key',
    perplexity: 'word-ai-perplexity-key',
    openrouter: 'word-ai-openrouter-key',
    ollama: 'word-ai-ollama-key',
    lmstudio: 'word-ai-lmstudio-key',
    bedrock: 'word-ai-bedrock-key',
    azure: 'word-ai-azure-key',
    custom: 'word-ai-custom-key',
};

// Provider display names
export const PROVIDER_NAMES: Record<ModelProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    deepseek: 'DeepSeek',
    siliconflow: '硅基流动',
    aliyun: '阿里云通义',
    zhipu: '智谱 AI',
    baidu: '百度文心',
    tencent: '腾讯混元',
    doubao: '字节豆包',
    moonshot: 'Moonshot',
    minimax: 'MiniMax',
    groq: 'Groq',
    mistral: 'Mistral',
    cohere: 'Cohere',
    perplexity: 'Perplexity',
    openrouter: 'OpenRouter',
    ollama: 'Ollama',
    lmstudio: 'LM Studio',
    bedrock: 'AWS Bedrock',
    azure: 'Azure OpenAI',
    custom: '自定义',
};

// 内置模型配置 (2025-2026 最新模型)
export const BUILT_IN_MODELS: ModelConfig[] = [
    // OpenAI
    {
        id: 'chatgpt-4o-latest',
        name: 'GPT-4o (最新)',
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'OpenAI 最新 GPT-4o 模型，支持图片分析',
        apiKeyStorageKey: PROVIDER_API_KEYS.openai,
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        description: '轻量级多模态模型，性价比高',
        apiKeyStorageKey: PROVIDER_API_KEYS.openai,
    },
    {
        id: 'o1-preview',
        name: 'o1 Preview',
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: false,
        maxTokens: 128000,
        description: 'OpenAI 推理模型，擅长复杂推理',
        apiKeyStorageKey: PROVIDER_API_KEYS.openai,
    },
    {
        id: 'o1-mini',
        name: 'o1 Mini',
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: false,
        maxTokens: 128000,
        description: 'OpenAI 轻量推理模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.openai,
    },
    // Anthropic
    {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude 4 Sonnet',
        provider: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1/messages',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 200000,
        description: 'Anthropic 最新 Sonnet 模型，强大推理能力',
        apiKeyStorageKey: PROVIDER_API_KEYS.anthropic,
    },
    {
        id: 'claude-haiku-4-20250514',
        name: 'Claude 4 Haiku',
        provider: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1/messages',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 200000,
        description: 'Anthropic 快速轻量模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.anthropic,
    },
    {
        id: 'claude-opus-4-20250514',
        name: 'Claude 4 Opus',
        provider: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1/messages',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 200000,
        description: 'Anthropic 最强模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.anthropic,
    },
    // Google
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 1000000,
        description: 'Google 最新极速模型，支持长上下文',
        apiKeyStorageKey: PROVIDER_API_KEYS.google,
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 2000000,
        description: 'Google 多模态大模型，超长上下文',
        apiKeyStorageKey: PROVIDER_API_KEYS.google,
    },
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 1000000,
        description: 'Google 快速多模态模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.google,
    },
    // DeepSeek
    {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'deepseek',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 64000,
        description: 'DeepSeek 最新通用大模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.deepseek,
    },
    {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder V2',
        provider: 'deepseek',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 64000,
        description: 'DeepSeek 代码专用模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.deepseek,
    },
    // 硅基流动 (SiliconFlow) - OpenAI 兼容
    {
        id: 'siliconflow-qwen2.5-72b',
        name: 'Qwen2.5-72B',
        provider: 'siliconflow',
        apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 32000,
        description: '开源大模型 (阿里云)',
        apiKeyStorageKey: PROVIDER_API_KEYS.siliconflow,
    },
    {
        id: 'siliconflow-yi-1.5-34b',
        name: 'Yi-1.5-34B',
        provider: 'siliconflow',
        apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 32000,
        description: '零一万物大模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.siliconflow,
    },
    {
        id: 'siliconflow-llama3.1-70b',
        name: 'Llama 3.1-70B',
        provider: 'siliconflow',
        apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'Meta 开源大模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.siliconflow,
    },
    // 阿里云通义
    {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        provider: 'aliyun',
        apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 131072,
        description: '阿里云快速模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.aliyun,
    },
    {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        provider: 'aliyun',
        apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 131072,
        description: '阿里云高性能模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.aliyun,
    },
    {
        id: 'qwen-max',
        name: 'Qwen Max',
        provider: 'aliyun',
        apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 131072,
        description: '阿里云最强模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.aliyun,
    },
    // 智谱 AI
    {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        provider: 'zhipu',
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        description: '智谱 AI 最新基座模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.zhipu,
    },
    {
        id: 'glm-4v-plus',
        name: 'GLM-4V Plus',
        provider: 'zhipu',
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        description: '智谱 AI 最新多模态模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.zhipu,
    },
    {
        id: 'glm-4-flash',
        name: 'GLM-4 Flash',
        provider: 'zhipu',
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: '智谱 AI 快速模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.zhipu,
    },
    // Moonshot
    {
        id: 'moonshot-v1-8k',
        name: 'Moonshot V1-8K',
        provider: 'moonshot',
        apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 8000,
        description: 'Moonshot AI 模型 (8K上下文)',
        apiKeyStorageKey: PROVIDER_API_KEYS.moonshot,
    },
    {
        id: 'moonshot-v1-32k',
        name: 'Moonshot V1-32K',
        provider: 'moonshot',
        apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 32000,
        description: 'Moonshot AI 模型 (32K上下文)',
        apiKeyStorageKey: PROVIDER_API_KEYS.moonshot,
    },
    {
        id: 'moonshot-v1-128k',
        name: 'Moonshot V1-128K',
        provider: 'moonshot',
        apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'Moonshot AI 模型 (128K上下文)',
        apiKeyStorageKey: PROVIDER_API_KEYS.moonshot,
    },
    // Groq
    {
        id: 'groq-llama-3.3-70b',
        name: 'Llama 3.3-70B (Groq)',
        provider: 'groq',
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 8192,
        description: '极速开源模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.groq,
    },
    {
        id: 'groq-llama-3.1-8b',
        name: 'Llama 3.1-8B (Groq)',
        provider: 'groq',
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 8192,
        description: '极速轻量开源模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.groq,
    },
    {
        id: 'groq-mixtral-8x7b',
        name: 'Mixtral 8x7B (Groq)',
        provider: 'groq',
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 32768,
        description: 'Mistral 开源 mixture 模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.groq,
    },
    // Mistral
    {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        provider: 'mistral',
        apiUrl: 'https://api.mistral.ai/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'Mistral 最强模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.mistral,
    },
    {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        provider: 'mistral',
        apiUrl: 'https://api.mistral.ai/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'Mistral 轻量模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.mistral,
    },
    // Perplexity
    {
        id: 'sonar',
        name: 'Sonar',
        provider: 'perplexity',
        apiUrl: 'https://api.perplexity.ai/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'Perplexity 在线搜索模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.perplexity,
    },
    {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        provider: 'perplexity',
        apiUrl: 'https://api.perplexity.ai/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 128000,
        description: 'Perplexity 高质量搜索模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.perplexity,
    },
    // OpenRouter
    {
        id: 'openrouter-anthropic-sonnet-4',
        name: 'Claude 4 Sonnet (OR)',
        provider: 'openrouter',
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 200000,
        description: '通过 OpenRouter 访问 Claude',
        apiKeyStorageKey: PROVIDER_API_KEYS.openrouter,
    },
    {
        id: 'openrouter-openai-gpt-4o',
        name: 'GPT-4o (OR)',
        provider: 'openrouter',
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        description: '通过 OpenRouter 访问 GPT-4o',
        apiKeyStorageKey: PROVIDER_API_KEYS.openrouter,
    },
    // 本地模型
    {
        id: 'ollama-local',
        name: 'Ollama 本地模型',
        provider: 'ollama',
        apiUrl: 'http://localhost:11434/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 4096,
        description: 'Ollama 本地运行模型 (需自行配置)',
        apiKeyStorageKey: PROVIDER_API_KEYS.ollama,
    },
    {
        id: 'lmstudio-local',
        name: 'LM Studio 本地模型',
        provider: 'lmstudio',
        apiUrl: 'http://localhost:1234/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 4096,
        description: 'LM Studio 本地运行模型 (需自行配置)',
        apiKeyStorageKey: PROVIDER_API_KEYS.lmstudio,
    },
];

// localStorage keys
export const MODEL_STORAGE_KEYS = {
    CUSTOM_MODELS: 'word-ai-custom-models',
    USER_ADDED_MODELS: 'word-ai-user-added-models',
    CUSTOM_PROVIDERS: 'word-ai-custom-providers',
    ACTIVE_MODEL: 'word-ai-active-model',
    API_KEYS: 'word-ai-api-keys',
};

/**
 * 获取所有模型（内置 + 自定义）
 */
export function getAllModels(): ModelConfig[] {
    const customModels = getCustomModels();
    return [...BUILT_IN_MODELS, ...customModels];
}

/**
 * 获取自定义模型
 */
export function getCustomModels(): ModelConfig[] {
    try {
        const stored = localStorage.getItem(MODEL_STORAGE_KEYS.CUSTOM_MODELS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * 保存自定义模型
 */
export function saveCustomModel(model: ModelConfig): void {
    const models = getCustomModels();
    const existingIndex = models.findIndex(m => m.id === model.id);
    if (existingIndex >= 0) {
        models[existingIndex] = model;
    } else {
        models.push(model);
    }
    localStorage.setItem(MODEL_STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(models));
}

/**
 * 删除自定义模型
 */
export function deleteCustomModel(modelId: string): void {
    const models = getCustomModels().filter(m => m.id !== modelId);
    localStorage.setItem(MODEL_STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(models));
}

/**
 * 获取当前激活的模型 ID
 */
export function getActiveModelId(): string {
    return localStorage.getItem(MODEL_STORAGE_KEYS.ACTIVE_MODEL) || 'deepseek-chat';
}

/**
 * 设置当前激活的模型
 */
export function setActiveModelId(modelId: string): void {
    localStorage.setItem(MODEL_STORAGE_KEYS.ACTIVE_MODEL, modelId);
}

/**
 * 获取当前激活的模型
 */
export function getActiveModel(): ModelConfig {
    const activeId = getActiveModelId();
    // 先从用户添加的模型中查找
    const userAdded = getUserAddedModels().find(m => m.id === activeId);
    if (userAdded) return userAdded;
    // 再从所有模型中查找
    const allModel = getAllModels().find(m => m.id === activeId);
    if (allModel) return allModel;
    // 默认返回第一个内置模型
    return BUILT_IN_MODELS[0];
}

/**
 * 获取 API Key
 */
export function getApiKey(storageKey: string): string {
    try {
        const keys = JSON.parse(localStorage.getItem(MODEL_STORAGE_KEYS.API_KEYS) || '{}');
        return keys[storageKey] || '';
    } catch {
        return '';
    }
}

/**
 * 保存 API Key
 */
export function saveApiKey(storageKey: string, apiKey: string): void {
    try {
        const keys = JSON.parse(localStorage.getItem(MODEL_STORAGE_KEYS.API_KEYS) || '{}');
        keys[storageKey] = apiKey;
        localStorage.setItem(MODEL_STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    } catch {
        // ignore
    }
}

/**
 * 检查模型是否有可用的 API Key
 */
export function hasApiKey(model: ModelConfig): boolean {
    if (!model.apiKeyStorageKey) return false;
    return !!getApiKey(model.apiKeyStorageKey);
}

/**
 * 按提供商分组获取模型
 */
export function getModelsByProvider(): Record<ModelProvider, ModelConfig[]> {
    const models = getAllModels();
    const grouped: Record<ModelProvider, ModelConfig[]> = {} as Record<ModelProvider, ModelConfig[]>;

    for (const model of models) {
        if (!grouped[model.provider]) {
            grouped[model.provider] = [];
        }
        grouped[model.provider].push(model);
    }

    return grouped;
}

/**
 * 获取用户已添加的模型（用于 ModelSelector 显示）
 */
export function getUserAddedModels(): ModelConfig[] {
    try {
        const stored = localStorage.getItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * 添加模型到用户列表
 */
export function addModelToUserList(model: ModelConfig): void {
    const models = getUserAddedModels();
    if (!models.find(m => m.id === model.id)) {
        models.push(model);
        localStorage.setItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS, JSON.stringify(models));
    }
}

/**
 * 从用户列表移除模型
 */
export function removeModelFromUserList(modelId: string): void {
    const models = getUserAddedModels().filter(m => m.id !== modelId);
    localStorage.setItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS, JSON.stringify(models));
}

/**
 * 检查模型是否已在用户列表
 */
export function isModelInUserList(modelId: string): boolean {
    return !!getUserAddedModels().find(m => m.id === modelId);
}

/**
 * 获取可添加的内置模型（排除已添加的）
 */
export function getAvailableModelsForAdd(): ModelConfig[] {
    const userAdded = getUserAddedModels();
    const userAddedIds = new Set(userAdded.map(m => m.id));
    return BUILT_IN_MODELS.filter(m => !userAddedIds.has(m.id));
}

/**
 * 获取自定义提供商列表
 */
export function getCustomProviders(): CustomProvider[] {
    try {
        const stored = localStorage.getItem(MODEL_STORAGE_KEYS.CUSTOM_PROVIDERS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * 保存自定义提供商
 */
export function saveCustomProvider(provider: CustomProvider): void {
    const providers = getCustomProviders();
    const existingIndex = providers.findIndex(p => p.id === provider.id);
    if (existingIndex >= 0) {
        providers[existingIndex] = provider;
    } else {
        providers.push(provider);
    }
    localStorage.setItem(MODEL_STORAGE_KEYS.CUSTOM_PROVIDERS, JSON.stringify(providers));
}

/**
 * 删除自定义提供商
 */
export function deleteCustomProvider(providerId: string): void {
    const providers = getCustomProviders().filter(p => p.id !== providerId);
    localStorage.setItem(MODEL_STORAGE_KEYS.CUSTOM_PROVIDERS, JSON.stringify(providers));
}

/**
 * 根据 ID 获取自定义提供商
 */
export function getCustomProviderById(providerId: string): CustomProvider | undefined {
    return getCustomProviders().find(p => p.id === providerId);
}

/**
 * 获取内置提供商列表（排除自定义）
 */
export function getBuiltInProviders(): string[] {
    const builtInProviders = new Set(BUILT_IN_MODELS.map(m => m.provider));
    return Array.from(builtInProviders);
}

/**
 * 按提供商分组获取用户已添加的模型
 */
export function getUserAddedModelsGroupedByProvider(): Record<string, ModelConfig[]> {
    const models = getUserAddedModels();
    const grouped: Record<string, ModelConfig[]> = {};

    for (const model of models) {
        if (!grouped[model.provider]) {
            grouped[model.provider] = [];
        }
        grouped[model.provider].push(model);
    }

    return grouped;
}
