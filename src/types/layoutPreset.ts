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

// 默认 CSS 样式模板
export const DEFAULT_CSS_STYLES = `
/* 文档标题 - 独立于大纲 */
p.title {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 22pt;
  font-weight: bold;
  text-align: center;
  margin: 24pt 0;
}

/* 正文样式 */
p.content {
  font-family: 宋体, SimSun, serif;
  font-size: 12pt;
  line-height: 1.5;
  text-indent: 2em;
  margin: 6pt 0;
}

/* 一级标题 - 使用 mso-outline-level:1 定义大纲级别 */
p.heading1 {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 16pt;
  font-weight: bold;
  text-align: center;
  margin: 16pt 0;
  mso-outline-level: 1;
}

/* 二级标题 */
p.heading2 {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  margin: 12pt 0;
  mso-outline-level: 2;
}

/* 三级标题 */
p.heading3 {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  margin: 10pt 0;
  mso-outline-level: 3;
}

/* 代码块 */
pre.code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 10pt;
  background-color: #f5f5f5;
  padding: 12px;
  border: 1px solid #cccccc;
  white-space: pre-wrap;
  margin: 8pt 0;
}

/* 引用块 */
p.quote {
  border-left: 4px solid #667eea;
  padding-left: 16px;
  margin: 12px 0;
  color: #555;
  background-color: #f8f9fa;
}

/* 表格 */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 8pt 0;
}
th, td {
  border: 1px solid #999;
  padding: 8px;
  font-family: 宋体, SimSun, serif;
  font-size: 12pt;
}
th {
  background-color: #f0f0f0;
  font-weight: bold;
}

/* 列表 */
ul, ol {
  margin: 8pt 0;
  padding-left: 24pt;
}
li {
  margin: 4pt 0;
  font-family: 宋体, SimSun, serif;
  font-size: 12pt;
}
`;

// 默认 class 使用规则
export const DEFAULT_CLASS_RULES = `
生成 HTML 时必须遵循以下 class 规则：

1. 文档标题（整篇文档的标题，独立于大纲）：
   - <p class="title">文档标题</p>

2. 章节标题（禁止使用 h1~h6，使用大纲级别）：
   - 一级标题（大纲第一层，如"一、引言"）：<p class="heading1">标题</p>
   - 二级标题（大纲第二层，如"1.1 背景"）：<p class="heading2">标题</p>
   - 三级标题（大纲第三层）：<p class="heading3">标题</p>

3. 正文：<p class="content">内容</p>

4. 代码块：<pre class="code">代码</pre>

5. 引用：<p class="quote">引用内容</p>

6. 表格：<table><tr><th>/<td>

7. 列表：<ul>/<ol>/<li>

注意：优先使用 class，非必要不使用内联 style。
`;

// 内置预设 - 精简为2个，每个都可编辑
export const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    id: 'academic',
    name: '学术论文',
    isBuiltIn: true,
    formatDescription: `正文使用宋体小四号字（12pt），首行缩进2字符，1.5倍行距。
一级标题黑体三号居中，二级标题黑体四号左对齐，三级标题黑体小四号左对齐。
段落间距段前0.5行段后0.5行。
参考文献使用 [1] [2] 格式标注。`,
    cssStyles: `
p.title {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 22pt;
  font-weight: bold;
  text-align: center;
  margin: 24pt 0;
}
p.content {
  font-family: 宋体, SimSun, serif;
  font-size: 12pt;
  line-height: 150%;
  mso-line-height-rule: exactly;
  text-indent: 2em;
  mso-char-indent-count: 2;
  margin: 6pt 0;
}
p.heading1 {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 16pt;
  font-weight: bold;
  text-align: center;
  text-indent: 0;
  margin: 12pt 0;
  mso-outline-level: 1;
}
p.heading2 {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  text-align: left;
  text-indent: 0;
  margin: 10pt 0;
  mso-outline-level: 2;
}
p.heading3 {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: left;
  text-indent: 0;
  margin: 8pt 0;
  mso-outline-level: 3;
}
pre.code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 10pt;
  background-color: #f5f5f5;
  padding: 12px;
  border: 1px solid #cccccc;
  white-space: pre-wrap;
  margin: 8pt 0;
}
p.quote {
  border-left: 4px solid #667eea;
  padding-left: 16px;
  margin: 12px 0;
  color: #555;
}
table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
th, td { border: 1px solid #999; padding: 8px; font-family: 宋体; font-size: 12pt; }
th { background-color: #f0f0f0; font-weight: bold; }
ul, ol { margin: 8pt 0; padding-left: 24pt; }
li { margin: 4pt 0; font-family: 宋体; font-size: 12pt; }
`,
    classRules: `生成 HTML 时遵循以下规则：
- 文档标题：<p class="title">标题</p>
- 一级标题（大纲第一层）：<p class="heading1">标题</p>
- 二级标题（大纲第二层）：<p class="heading2">标题</p>
- 三级标题（大纲第三层）：<p class="heading3">标题</p>
- 正文：<p class="content">内容</p>
- 代码：<pre class="code">代码</pre>
- 引用：<p class="quote">引用</p>
- 禁止使用 h1~h6 标签
- 优先使用 class，非必要不使用内联 style`,
  },
  {
    id: 'business',
    name: '商务报告',
    isBuiltIn: true,
    formatDescription: `正文使用微软雅黑11pt，不缩进，段间距8px。
一级标题微软雅黑16pt加粗，蓝色(#0066cc)，左对齐。
二级标题微软雅黑14pt加粗，黑色，左对齐。
重点内容使用蓝色强调，数据使用表格呈现。`,
    cssStyles: `
p.title {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 22pt;
  font-weight: bold;
  text-align: center;
  color: #0066cc;
  margin: 24pt 0;
}
p.content {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 11pt;
  line-height: 160%;
  mso-line-height-rule: exactly;
  margin: 8px 0;
}
p.heading1 {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 16pt;
  font-weight: bold;
  color: #0066cc;
  text-align: left;
  text-indent: 0;
  margin: 16pt 0;
  mso-outline-level: 1;
}
p.heading2 {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 14pt;
  font-weight: bold;
  text-align: left;
  text-indent: 0;
  margin: 12pt 0;
  mso-outline-level: 2;
}
p.heading3 {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: left;
  text-indent: 0;
  margin: 10pt 0;
  mso-outline-level: 3;
}
pre.code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 10pt;
  background-color: #f5f5f5;
  padding: 12px;
  border: 1px solid #cccccc;
  white-space: pre-wrap;
  margin: 8pt 0;
}
p.quote {
  border-left: 4px solid #0066cc;
  padding-left: 16px;
  margin: 12px 0;
  color: #555;
}
.highlight { color: #0066cc; font-weight: bold; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
th, td { border: 1px solid #999; padding: 8px; font-family: 微软雅黑; font-size: 11pt; }
th { background-color: #0066cc; color: white; font-weight: bold; }
ul, ol { margin: 8pt 0; padding-left: 24pt; }
li { margin: 4pt 0; font-family: 微软雅黑; font-size: 11pt; }
`,
    classRules: `生成 HTML 时遵循以下规则：
- 文档标题：<p class="title">标题</p>
- 一级标题（大纲第一层）：<p class="heading1">标题</p>
- 二级标题（大纲第二层）：<p class="heading2">标题</p>
- 三级标题（大纲第三层）：<p class="heading3">标题</p>
- 正文：<p class="content">内容</p>
- 代码：<pre class="code">代码</pre>
- 引用：<p class="quote">引用</p>
- 重点强调：<span class="highlight">重点</span>
- 禁止使用 h1~h6 标签
- 优先使用 class，非必要不使用内联 style`,
  },
];

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
