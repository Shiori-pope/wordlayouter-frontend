import { LayoutPreset } from '../types/layoutPreset';

// =========================================================================================
// CSS 样式定义
// =========================================================================================

/**
 * HTML 解析器使用的 CSS 样式映射
 */
export const CLASS_STYLE_MAP: Record<string, string> = {
    'p.title': 'font-family: 黑体, SimHei, sans-serif; font-size: 22pt; font-weight: bold; text-align: center; text-indent: 0;',
    'p.heading1': 'font-family: 黑体, SimHei, sans-serif; font-size: 16pt; font-weight: bold; text-align: left;text-indent: 0; mso-outline-level: 1;',
    'p.heading2': 'font-family: 黑体, SimHei, sans-serif; font-size: 14pt; font-weight: bold; text-align: left; text-indent: 0; mso-outline-level: 2;',
    'p.heading3': 'font-family: 黑体, SimHei, sans-serif; font-size: 12pt; font-weight: bold; text-align: left; text-indent: 0; mso-outline-level: 3;',
    'p': 'font-family: 宋体, SimSun, serif; font-size: 12pt; line-height: 150%; text-indent: 2em; mso-char-indent-count: 2;',
    'pre.code': 'font-family: Consolas, "Courier New", monospace; font-size: 10pt; background-color: #f5f5f5; padding: 12px; border: 1px solid #cccccc; white-space: pre-wrap;',
    'p.quote': 'border-left: 4px solid #667eea; margin: 12px 0; color: #555; text-indent: 0;',
    'table': 'border-collapse: collapse; width: 98%; text-align: center;',
    'th, td': 'border: 1px solid #999; padding: 8px; font-family: 宋体; font-size: 12pt;',
    'th': 'background-color: #f0f0f0; font-weight: bold;',
    'ul,ol,li': '',
    'p.withoutIndent': 'font-family: 宋体, SimSun, serif; font-size: 12pt; line-height: 150%;'
};

/**
 * 默认 CSS 样式模板 (用于 html-docx-js 渲染)
 */
export const DEFAULT_CSS_STYLES = `
/* 文档标题 - 独立于大纲 */
${Object.entries(CLASS_STYLE_MAP).map(([selector, style]) => `${selector} {\n  ${style.replace(/; /g, ';\n  ')}\n}`).join('\n')}
`;

// =========================================================================================
// Class 规则定义
// =========================================================================================

/**
 * 默认 Class 使用规则 (指导 AI 生成 HTML)
 */
export const DEFAULT_CLASS_RULES = `
生成 HTML 时遵循以下规则：
- 文档标题：<p class="title">标题</p>
- 一级标题（大纲第一层）：<p class="heading1">标题</p>
- 二级标题（大纲第二层）：<p class="heading2">标题</p>
- 三级标题（大纲第三层）：<p class="heading3">标题</p>
- 正文：<p>内容</p>
- 代码：<pre class="code">代码</pre>
- 引用：<p class="quote">引用</p>
- 表格：使用 table, tr, th, td 标签
- 列表：使用 ul, ol, li 标签
`;

// =========================================================================================
// 内置排版预设
// =========================================================================================

export const BUILT_IN_PRESETS: LayoutPreset[] = [
    {
        id: 'academic',
        name: '高阶预设版式1',
        isBuiltIn: true,
        formatDescription: `文章标题使用宋体二号字居中
正文使用宋体小四号字，首行缩进2字符，1.5倍行距。
一级标题黑体三号左对齐，使用一二三、作为序号
二级标题黑体四号左对齐，使用（一）（二）（三）、作为序号
三级标题黑体小四号左对齐，使用123、作为序号`,
        cssStyles: `
p.title {
    font-family: 宋体, SimSun, serif;
    font-size: 22pt;
    text-align: center;
    text-indent: 0;
}
p {
    font-family: 宋体, SimSun, serif;
    font-size: 12pt;
    text-indent: 2em;
    mso-char-indent-count: 2;
    line-height: 150%;
    mso-line-height-rule: exactly;
}
p.heading1 {
    font-family: 黑体, SimHei, sans-serif;
    font-size: 16pt;
    font-weight: bold;
    text-align: left;
    text-indent: 0;
    mso-outline-level: 1;
}
p.heading2 {
    font-family: 黑体, SimHei, sans-serif;
    font-size: 14pt;
    font-weight: bold;
    text-align: left;
    text-indent: 0;
    mso-outline-level: 2;
}
p.heading3 {
    font-family: 黑体, SimHei, sans-serif;
    font-size: 12pt;
    font-weight: bold;
    text-align: left;
    text-indent: 0;
    mso-outline-level: 3;
}
pre.code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 10pt;
    background-color: #f5f5f5;
    border: 1px solid #cccccc;
    white-space: pre-wrap;
}
p.quote {
    border-left: 4px solid #667eea;
    color: #555;
    text-indent: 0;
}
table {
    border-collapse: collapse;
    width: 98%;
    text-align: center;
}
th, td {
    border: 1px solid #999;
    padding: 8px;
    font-family: 宋体;
    font-size: 12pt;
}
th {
    background-color: #f0f0f0;
    font-weight: bold;
}
ul, ol, li {}
p.withoutIndent {
    font-family: 宋体, SimSun, serif;
    font-size: 12pt;
    line-height: 150%;
    mso-line-height-rule: exactly;
}
`,
        classRules: DEFAULT_CLASS_RULES + `内容约束：
 一级标题序号为中文汉字，一二三，序号到文本用顿号、连接；
二级标题序号为中文括号数字，（一）（二）（三），序号到文本用顿号、连接；
三级标题序号为阿拉伯数字，123，序号到文本用顿号、连接`,
    }
];


