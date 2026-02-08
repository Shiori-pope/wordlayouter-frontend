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
    'table': 'border-collapse: collapse; width: 100%; margin: 8pt 0;',
    'th, td': 'border: 1px solid #999; padding: 8px; font-family: 宋体; font-size: 12pt;',
    'th': 'background-color: #f0f0f0; font-weight: bold;',
    'ul, ol': 'margin: 0; padding-left: 0;',
    'li': 'font-family: 宋体, SimSun, serif; font-size: 12pt; line-height: 150%; text-indent: 2em; mso-char-indent-count: 2;'
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
- 禁止使用 h1~h6 标签
- 优先使用 class，非必要不使用内联 style
`;

// =========================================================================================
// 内置排版预设
// =========================================================================================

export const BUILT_IN_PRESETS: LayoutPreset[] = [
    {
        id: 'academic',
        name: '学术论文',
        isBuiltIn: true,
        formatDescription: `正文使用宋体小四号字，首行缩进2字符，1.5倍行距。
一级标题黑体三号左对齐，二级标题黑体四号左对齐，三级标题黑体小四号左对齐。
段落间距段前0.5行段后0.5行。`,
        cssStyles: `
p.title {
  font-family: 黑体, SimHei, sans-serif;
  font-size: 22pt;
  font-weight: bold;
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
table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
th, td { border: 1px solid #999; padding: 8px; font-family: 宋体; font-size: 12pt; }
th { background-color: #f0f0f0; font-weight: bold; }
ul, ol { margin: 8pt 0; padding-left: 24pt; }
li { margin: 4pt 0; font-family: 宋体; font-size: 12pt; }
`,
        classRules: DEFAULT_CLASS_RULES,
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
  text-indent: 0;
  color: #0066cc;
}
p {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 11pt;
  line-height: 160%;
  mso-line-height-rule: exactly;
}
p.heading1 {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 16pt;
  font-weight: bold;
  color: #0066cc;
  text-align: left;
  text-indent: 0;
  mso-outline-level: 1;
}
p.heading2 {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
  font-size: 14pt;
  font-weight: bold;
  text-align: left;
  text-indent: 0;
  mso-outline-level: 2;
}
p.heading3 {
  font-family: 微软雅黑, "Microsoft YaHei", sans-serif;
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
  border-left: 4px solid #0066cc;
  color: #555;
}
.highlight { color: #0066cc; font-weight: bold; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
th, td { border: 1px solid #999; padding: 8px; font-family: 微软雅黑; font-size: 11pt; }
th { background-color: #0066cc; color: white; font-weight: bold; }
ul, ol { margin: 8pt 0; padding-left: 24pt; }
li { margin: 4pt 0; font-family: 微软雅黑; font-size: 11pt; }
`,
        classRules: DEFAULT_CLASS_RULES + `
- 重点强调：<span class="highlight">重点</span>`,
    },
];


