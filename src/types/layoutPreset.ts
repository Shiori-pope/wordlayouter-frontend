/**
 * 版式预设类型定义
 * 支持自然语言描述的复杂排版设计
 *
 * 架构说明：
 * 1. formatDescription: 用户输入的自然语言排版描述
 * 2. cssStyles: AI 生成的完整 CSS 样式（用于 html-docx-js 渲染）
 * 3. classRules: AI 生成的 class 使用规则（嵌入 AI 系统提示词，指导内容生成）
 *
 * 工作流程：
 * 用户编辑预设 → AI 根据 formatDescription 生成 cssStyles 和 classRules
 * AI 生成内容时 → 系统提示词嵌入 classRules
 * 插入 Word 时 → cssStyles + 内容 组合后转换为 docx
 */

export interface LayoutPreset {
    id: string;
    name: string;
    // 自然语言描述的排版要求
    formatDescription: string;
    // AI 生成的 CSS 样式（完整的 <style> 内容）
    cssStyles?: string;
    // AI 生成的 class 使用规则（给 AI 的指令）
    classRules?: string;
    isBuiltIn: boolean;
}

import { DEFAULT_CSS_STYLES, DEFAULT_CLASS_RULES, BUILT_IN_PRESETS } from '../config/layoutConfig';

// 导出以便其他模块使用（也可以直接从 config 导入，但保留此处导出可兼容现有代码）
export { DEFAULT_CSS_STYLES, DEFAULT_CLASS_RULES, BUILT_IN_PRESETS };

// localStorage keys
export const STORAGE_KEYS = {
    CUSTOM_PRESETS: 'word-ai-layout-presets',
    ACTIVE_PRESET: 'word-ai-active-preset',
};

/**
 * 获取所有预设（内置 + 自定义）
 */
export function getAllPresets(): LayoutPreset[] {
    const customPresets = getCustomPresets();
    // 合并内置预设（可能被用户编辑过）
    const builtInIds = BUILT_IN_PRESETS.map(p => p.id);
    const editedBuiltIns = customPresets.filter(p => builtInIds.includes(p.id));
    const pureCustom = customPresets.filter(p => !builtInIds.includes(p.id));

    // 使用编辑过的内置预设替换原始的
    const finalBuiltIns = BUILT_IN_PRESETS.map(original => {
        const edited = editedBuiltIns.find(e => e.id === original.id);
        return edited || original;
    });

    return [...finalBuiltIns, ...pureCustom];
}

/**
 * 获取自定义预设（包括编辑过的内置预设）
 */
export function getCustomPresets(): LayoutPreset[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * 保存预设（新建或编辑）
 */
export function savePreset(preset: LayoutPreset): void {
    const presets = getCustomPresets();
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
        presets[existingIndex] = preset;
    } else {
        presets.push(preset);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
}

/**
 * 删除自定义预设（内置预设不能删除，只能重置）
 */
export function deletePreset(presetId: string): void {
    const isBuiltIn = BUILT_IN_PRESETS.some(p => p.id === presetId);
    if (isBuiltIn) {
        // 重置为默认值：从存储中移除编辑版本
        const presets = getCustomPresets().filter(p => p.id !== presetId);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
    } else {
        // 完全删除自定义预设
        const presets = getCustomPresets().filter(p => p.id !== presetId);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
    }
}

/**
 * 获取当前激活的预设 ID
 */
export function getActivePresetId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET);
}

/**
 * 设置当前激活的预设
 */
export function setActivePresetId(presetId: string | null): void {
    if (presetId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, presetId);
    } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRESET);
    }
}

/**
 * 获取当前激活的预设
 */
export function getActivePreset(): LayoutPreset | null {
    const activeId = getActivePresetId();
    if (!activeId) return null;
    return getAllPresets().find(p => p.id === activeId) || null;
}
