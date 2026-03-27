/**
 * 本地存储服务
 * 统一管理 API Keys、设置、对话历史等本地数据
 */

import { PluginSettings, DEFAULT_SETTINGS } from '../types/settings';
import { ModelConfig } from '../types/modelConfig';
import { Conversation, Message } from './conversationService';

// Storage Keys
const STORAGE_KEYS = {
    SETTINGS: 'word-ai-settings',
    CONVERSATIONS: 'word-ai-conversations',
    API_KEYS: 'word-ai-api-keys',
    ACTIVE_CONVERSATION: 'word-ai-active-conversation',
};

// ==================== Settings ====================

export function getSettings(): PluginSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch {
        // ignore
    }
    return DEFAULT_SETTINGS;
}

export function saveSettings(settings: PluginSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function resetSettings(): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
}

// ==================== API Keys ====================

interface ApiKeys {
    [key: string]: string;
}

export function getAllApiKeys(): ApiKeys {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

export function getApiKey(storageKey: string): string {
    const keys = getAllApiKeys();
    return keys[storageKey] || '';
}

export function saveApiKey(storageKey: string, apiKey: string): void {
    const keys = getAllApiKeys();
    keys[storageKey] = apiKey;
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
}

export function deleteApiKey(storageKey: string): void {
    const keys = getAllApiKeys();
    delete keys[storageKey];
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
}

// ==================== Conversations ====================

export function getConversations(): Conversation[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function saveConversations(conversations: Conversation[]): void {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
}

export function getActiveConversationId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
}

export function setActiveConversationId(id: string | null): void {
    if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, id);
    } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
    }
}

// ==================== Clear All ====================

export function clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.API_KEYS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
}

// ==================== Data Export/Import ====================

export interface ExportData {
    version: number;
    exportedAt: string;
    settings: PluginSettings;
    apiKeys: ApiKeys;
    conversations: Conversation[];
}

export function exportData(): ExportData {
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: getSettings(),
        apiKeys: getAllApiKeys(),
        conversations: getConversations(),
    };
}

export function importData(data: ExportData): boolean {
    try {
        if (data.settings) {
            saveSettings(data.settings);
        }
        if (data.apiKeys) {
            localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(data.apiKeys));
        }
        if (data.conversations) {
            saveConversations(data.conversations);
        }
        return true;
    } catch {
        return false;
    }
}
