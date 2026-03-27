/**
 * 对话历史服务
 * 管理对话的创建、存储、自动清理等
 */

import * as storageService from './storageService';

// ==================== Types ====================

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    rawHtml?: string;
    isHtml?: boolean;
    hasMath?: boolean;
    timestamp: number;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    modelId: string;
    presetId?: string;
    createdAt: number;
    updatedAt: number;
}

// ==================== Constants ====================

const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 100;

// ==================== Helpers ====================

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTitle(content: string): string {
    if (content.length <= 30) return content;
    return content.substring(0, 30) + '...';
}

function now(): number {
    return Date.now();
}

// ==================== CRUD Operations ====================

export function createConversation(modelId: string, presetId?: string): Conversation {
    return {
        id: generateId(),
        title: '新对话',
        messages: [],
        modelId,
        presetId,
        createdAt: now(),
        updatedAt: now(),
    };
}

export function getConversation(id: string): Conversation | null {
    const conversations = getConversations();
    return conversations.find(c => c.id === id) || null;
}

export function getConversations(): Conversation[] {
    return storageService.getConversations();
}

export function saveConversation(conversation: Conversation): void {
    const conversations = getConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);

    conversation.updatedAt = now();

    if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
    } else {
        conversations.push(conversation);
    }

    pruneOldConversations(conversations);
    storageService.saveConversations(conversations);
}

export function deleteConversation(id: string): void {
    const conversations = getConversations().filter(c => c.id !== id);
    storageService.saveConversations(conversations);
}

export function clearAllConversations(): void {
    storageService.saveConversations([]);
}

// ==================== Message Operations ====================

export function addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    options?: {
        rawHtml?: string;
        isHtml?: boolean;
        hasMath?: boolean;
    }
): Message | null {
    const conversation = getConversation(conversationId);
    if (!conversation) return null;

    const message: Message = {
        id: generateId(),
        role,
        content,
        rawHtml: options?.rawHtml,
        isHtml: options?.isHtml,
        hasMath: options?.hasMath,
        timestamp: now(),
    };

    conversation.messages.push(message);
    conversation.updatedAt = now();

    // Update title from first user message
    if (role === 'user' && conversation.messages.filter(m => m.role === 'user').length === 1) {
        conversation.title = generateTitle(content);
    }

    pruneLongConversation(conversation);
    saveConversation(conversation);

    return message;
}

export function deleteMessage(conversationId: string, messageId: string): boolean {
    const conversation = getConversation(conversationId);
    if (!conversation) return false;

    conversation.messages = conversation.messages.filter(m => m.id !== messageId);
    conversation.updatedAt = now();
    saveConversation(conversation);

    return true;
}

export function clearConversation(conversationId: string): boolean {
    const conversation = getConversation(conversationId);
    if (!conversation) return false;

    conversation.messages = [];
    conversation.updatedAt = now();
    saveConversation(conversation);

    return true;
}

// ==================== Auto Pruning ====================

function pruneOldConversations(conversations: Conversation[]): void {
    if (conversations.length > MAX_CONVERSATIONS) {
        // Sort by updated time, keep most recent
        conversations.sort((a, b) => b.updatedAt - a.updatedAt);
        conversations.splice(MAX_CONVERSATIONS);
    }
}

function pruneLongConversation(conversation: Conversation): void {
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
        // Keep most recent messages
        conversation.messages = conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }
}

// ==================== Search ====================

export function searchConversations(query: string): Conversation[] {
    const conversations = getConversations();
    const lowerQuery = query.toLowerCase();

    return conversations.filter(c =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
    );
}
