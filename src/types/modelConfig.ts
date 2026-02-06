/**
 * 模型配置类型定义
 */

export type ModelProvider = 'deepseek' | 'openai' | 'anthropic' | 'custom';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  apiUrl: string;
  supportsVision: boolean;
  supportsStreaming: boolean;
  maxTokens: number;
  description: string;
  apiKeyStorageKey?: string;
}

// 内置模型配置
export const BUILT_IN_MODELS: ModelConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 4096,
    description: '高性价比通用模型',
    apiKeyStorageKey: 'word-ai-deepseek-key',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 4096,
    description: '支持图片分析的多模态模型',
    apiKeyStorageKey: 'word-ai-openai-key',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 4096,
    description: '轻量级多模态模型',
    apiKeyStorageKey: 'word-ai-openai-key',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 4096,
    description: '支持图片分析的高级模型',
    apiKeyStorageKey: 'word-ai-anthropic-key',
  },
];

// localStorage keys
export const MODEL_STORAGE_KEYS = {
  CUSTOM_MODELS: 'word-ai-custom-models',
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
  return getAllModels().find(m => m.id === activeId) || BUILT_IN_MODELS[0];
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
