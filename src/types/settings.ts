/**
 * 插件全局设置
 */

export interface PluginSettings {
  // 数学公式相关
  mathFormulaFont: string;  // 公式默认字体
  mathFormulaFontSize: string;  // 公式默认字号（Word 字号名称，如"小四"）
}

// 默认设置
export const DEFAULT_SETTINGS: PluginSettings = {
  mathFormulaFont: '宋体',
  mathFormulaFontSize: '小四',
};

const STORAGE_KEY = 'word-ai-plugin-settings';

/**
 * 获取设置
 */
export function getSettings(): PluginSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * 保存设置
 */
export function saveSettings(settings: Partial<PluginSettings>): void {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('[Settings] 保存成功:', updated);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * 重置为默认设置
 */
export function resetSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('[Settings] 已重置为默认设置');
}
