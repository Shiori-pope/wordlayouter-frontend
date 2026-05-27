/**
 * 模型配置类型定义
 */

import {
    ProviderPreset as _ProviderPreset,
    ProviderCategory as _ProviderCategory,
    RecommendedModel as _RecommendedModel,
    PROVIDER_CATALOG,
    CATEGORY_META,
    getProviderPreset,
    getProvidersByCategory,
    getProviderApiKeyStorageKey,
} from '../config/providerCatalog';

// Re-export
export type { _ProviderPreset as ProviderPreset, _ProviderCategory as ProviderCategory, _RecommendedModel as RecommendedModel };
export {
    PROVIDER_CATALOG,
    CATEGORY_META,
    getProviderPreset,
    getProvidersByCategory,
    getProviderApiKeyStorageKey,
};

export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    apiUrl: string;
    supportsVision: boolean;
    supportsStreaming: boolean;
    maxTokens: number;
    description: string;
    apiKeyStorageKey?: string;
}

// localStorage keys
export const MODEL_STORAGE_KEYS = {
    USER_ADDED_MODELS: 'word-ai-user-added-models',
    ACTIVE_MODEL: 'word-ai-active-model',
    API_KEYS: 'word-ai-api-keys',
};

const MIGRATION_FLAG = 'word-ai-migrated-v2';

// ==================== 供应商辅助函数 ====================

export function getProviderName(providerId: string): string {
    const preset = getProviderPreset(providerId);
    return preset?.name ?? providerId;
}

// ==================== 模型构建 ====================

export function buildModelFromCatalog(
    providerId: string,
    modelId: string,
    customName?: string,
    maxTokens: number = 8192,
): ModelConfig {
    const preset = getProviderPreset(providerId);
    if (!preset) {
        throw new Error(`Unknown provider: ${providerId}`);
    }
    return {
        id: modelId,
        name: customName || modelId,
        provider: providerId,
        apiUrl: preset.baseUrl + preset.chatPath,
        apiKeyStorageKey: preset.isLocal ? undefined : preset.apiKeyStorageKey,
        supportsVision: false,
        supportsStreaming: true,
        maxTokens,
        description: `${preset.name} 模型: ${modelId}`,
    };
}

export function addProviderRecommendedModels(providerId: string): void {
    const preset = getProviderPreset(providerId);
    if (!preset) return;
    for (const rm of preset.recommendedModels) {
        const model = buildModelFromCatalog(providerId, rm.id, rm.name);
        addModelToUserList(model);
    }
}

// ==================== 用户模型列表 ====================

export function getUserAddedModels(): ModelConfig[] {
    try {
        const stored = localStorage.getItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addModelToUserList(model: ModelConfig): void {
    const models = getUserAddedModels();
    if (!models.find(m => m.id === model.id && m.provider === model.provider)) {
        models.push(model);
        localStorage.setItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS, JSON.stringify(models));
    }
}

export function removeModelFromUserList(modelId: string, providerId?: string): void {
    let models = getUserAddedModels();
    if (providerId) {
        models = models.filter(m => !(m.id === modelId && m.provider === providerId));
    } else {
        models = models.filter(m => m.id !== modelId);
    }
    localStorage.setItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS, JSON.stringify(models));
}

export function isModelInUserList(modelId: string, providerId?: string): boolean {
    const models = getUserAddedModels();
    if (providerId) {
        return models.some(m => m.id === modelId && m.provider === providerId);
    }
    return models.some(m => m.id === modelId);
}

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

// ==================== 激活模型 ====================

export function getActiveModelId(): string {
    return localStorage.getItem(MODEL_STORAGE_KEYS.ACTIVE_MODEL) || '';
}

export function setActiveModelId(modelId: string): void {
    localStorage.setItem(MODEL_STORAGE_KEYS.ACTIVE_MODEL, modelId);
}

export function getActiveModel(): ModelConfig {
    const activeId = getActiveModelId();
    const userModels = getUserAddedModels();

    // 先从用户模型中查找
    if (activeId) {
        const found = userModels.find(m => m.id === activeId);
        if (found) return found;
    }

    // 回退: 第一个用户模型
    if (userModels.length > 0) return userModels[0];

    // 最后回退：catalog 第一个供应商的第一个推荐模型
    const firstPreset = PROVIDER_CATALOG[0];
    if (firstPreset && firstPreset.recommendedModels.length > 0) {
        return buildModelFromCatalog(firstPreset.id, firstPreset.recommendedModels[0].id, firstPreset.recommendedModels[0].name);
    }

    // 绝对回退
    return {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 8192,
        description: 'DeepSeek Chat 通用大模型',
        apiKeyStorageKey: 'word-ai-deepseek-key',
    };
}

// ==================== API Key 管理 ====================

export function getApiKey(storageKey: string): string {
    try {
        const keys = JSON.parse(localStorage.getItem(MODEL_STORAGE_KEYS.API_KEYS) || '{}');
        return keys[storageKey] || '';
    } catch {
        return '';
    }
}

export function saveApiKey(storageKey: string, apiKey: string): void {
    try {
        const keys = JSON.parse(localStorage.getItem(MODEL_STORAGE_KEYS.API_KEYS) || '{}');
        keys[storageKey] = apiKey;
        localStorage.setItem(MODEL_STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    } catch {
        // ignore
    }
}

export function hasApiKey(model: ModelConfig): boolean {
    if (!model.apiKeyStorageKey) return true; // 本地模型无需 Key
    return !!getApiKey(model.apiKeyStorageKey);
}

// ==================== 数据迁移 ====================

export function migrateOldData(): void {
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    // 1. 将旧的 word-ai-custom-models 合并到 user-added-models
    const oldCustomRaw = localStorage.getItem('word-ai-custom-models');
    if (oldCustomRaw) {
        try {
            const oldCustomModels: ModelConfig[] = JSON.parse(oldCustomRaw);
            const userModels = getUserAddedModels();
            for (const m of oldCustomModels) {
                if (!userModels.find(u => u.id === m.id && u.provider === m.provider)) {
                    userModels.push(m);
                }
            }
            localStorage.setItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS, JSON.stringify(userModels));
            localStorage.removeItem('word-ai-custom-models');
        } catch { /* ignore */ }
    }

    // 2. 将旧的 word-ai-custom-providers 删除（被 catalog 替代）
    localStorage.removeItem('word-ai-custom-providers');

    // 3. 尝试将 custom-model-key-* 的 Key 映射到供应商级
    const keysRaw = localStorage.getItem(MODEL_STORAGE_KEYS.API_KEYS);
    if (keysRaw) {
        try {
            const keys: Record<string, string> = JSON.parse(keysRaw);
            const newKeys: Record<string, string> = { ...keys };
            let changed = false;

            const userModels = getUserAddedModels();
            for (const [storageKey, keyValue] of Object.entries(keys)) {
                if (storageKey.startsWith('custom-model-key-') && keyValue) {
                    const model = userModels.find(m => m.apiKeyStorageKey === storageKey);
                    if (model?.provider) {
                        const preset = getProviderPreset(model.provider);
                        if (preset && !preset.isLocal) {
                            newKeys[preset.apiKeyStorageKey] = keyValue as string;
                            // 更新模型引用到新的 storageKey
                            const modelIdx = userModels.findIndex(m => m.apiKeyStorageKey === storageKey);
                            if (modelIdx >= 0) {
                                userModels[modelIdx] = {
                                    ...userModels[modelIdx],
                                    apiKeyStorageKey: preset.apiKeyStorageKey,
                                };
                            }
                            delete newKeys[storageKey];
                            changed = true;
                        }
                    }
                }
            }

            if (changed) {
                localStorage.setItem(MODEL_STORAGE_KEYS.API_KEYS, JSON.stringify(newKeys));
                localStorage.setItem(MODEL_STORAGE_KEYS.USER_ADDED_MODELS, JSON.stringify(userModels));
            }
        } catch { /* ignore */ }
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
}
