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
    | 'custom'
    | 'xai';

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
    xai: 'word-ai-xai-key',
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
    xai: 'xAI',
};

// 内置模型配置 (仅 DeepSeek + 自定义)
export const BUILT_IN_MODELS: ModelConfig[] = [
    // DeepSeek - 官方 API 模型
    {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'deepseek',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 64000,
        description: 'DeepSeek V3 通用大模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.deepseek,
    },
    {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        provider: 'deepseek',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 64000,
        description: 'DeepSeek R1 推理模型',
        apiKeyStorageKey: PROVIDER_API_KEYS.deepseek,
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
        const provider = model.provider as ModelProvider;
        if (!grouped[provider]) {
            grouped[provider] = [];
        }
        grouped[provider].push(model);
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
