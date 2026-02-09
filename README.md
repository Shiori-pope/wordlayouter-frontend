<div align="center">

# ✨ Word Layouter

### 🚀 智能 Word 文档排版助手

<p align="center">
  <img src="https://img.shields.io/badge/Word-2B579A?style=for-the-badge&logo=microsoft-word&logoColor=white" alt="Word" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/DeepSeek-FF6B6B?style=for-the-badge" alt="DeepSeek" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/yourusername/word-ai-assistant?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [技术架构](#-技术架构) • [开发文档](#-开发文档) • [常见问题](#-常见问题)

---

</div>

## 🎯 项目简介

**Word Layouter** 是一款革命性的 Microsoft Word 插件，将大语言模型的强大能力直接整合到文档编辑流程中。与传统的 AI 写作工具不同，本插件能够：

- 🎨 **理解并生成 Word 原生格式**（HTML 而非 Markdown）
- 🔮 **支持完整的数学公式渲染**（LaTeX/TeX 格式）
- ⚡ **实时流式输出**，即时查看 AI 生成过程
- 🎯 **一键插入保持格式**，无需手动调整排版

> 💡 **为什么选择它？** 大多数 AI 写作工具只能生成纯文本或 Markdown，需要手动转换和排版。Word Layouter 直接生成 Word 可识别的 HTML 格式，保留完整的字体、颜色、对齐、数学公式等信息。

---

## ✨ 功能特性

### 🎨 智能格式生成

<table>
<tr>
<td width="50%">

**📝 完整排版支持**
- 标题层级（H1-H6）
- 段落样式（缩进、行距）
- 文本格式（粗体、斜体、下划线）
- 颜色和对齐
- 列表（有序/无序）

</td>
<td width="50%">

**🧮 专业数学公式**
- LaTeX/TeX 语法
- 行内公式 `$...$`
- 独立公式 `$$...$$`
- 积分、求和、矩阵
- 自动渲染为 Unicode

</td>
</tr>
</table>

### ⚡ 现代化交互体验

- **🌊 流式响应**：实时查看 AI 生成内容，无需等待
- **💬 对话式交互**：保持对话历史，支持上下文连贯
- **🎯 智能预览**：生成内容提供格式化预览
- **📋 一键插入**：点击即可将内容插入到文档中

### 🛠️ 技术亮点

```typescript
// 示例：AI 生成的 HTML 内容直接插入 Word
<h1>量子力学基础</h1>
<p style="text-indent: 2em; line-height: 1.5">
  薛定谔方程描述了量子系统的演化：
</p>
$$ i\hbar\frac{\partial}{\partial t}\Psi = \hat{H}\Psi $$
```

---

## 📸 效果展示

### 对话界面
```
┌─────────────────────────────────┐
│  ✨ Word Layouter              │
│     智能排版 · TeX 公式          │
├──────────────────────────  ────┤
│  💬 请写一个关于勾股定理的说明   │
│  ┌──────────────────────────┐  │
│  │ 📑 勾股定理              │  │
│  │ 📄 数学定理              │  │
│  │ 勾股定理指出...           │  │
│  │ 📐 包含数学公式          │  │
│  │ [插入格式化内容] ✓        │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### 生成效果

**输入提示**：
> 写一篇关于机器学习的报告，要求首行缩进、1.5倍行距

**AI 输出**（直接插入 Word）：
- ✅ 自动添加标题格式
- ✅ 正文首行缩进 2em
- ✅ 设置 1.5 倍行距
- ✅ 数学公式正确渲染

---

## 🚀 快速开始

### 📋 前置要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| **Node.js** | 16.x+ | [下载地址](https://nodejs.org/) |
| **npm/yarn** | 最新版 | 包管理器 |
| **Microsoft Word** | 2016+ | 桌面版或 Office 365 |
| **DeepSeek API Key** | - | [获取地址](https://platform.deepseek.com/) |

### ⚡ 一键安装

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/word-ai-assistant.git
cd word-ai-assistant

# 2. 安装依赖
npm install

# 3. 生成开发证书（首次运行需要）
npx office-addin-dev-certs install

# 4. 配置 API 密钥
echo "DEEPSEEK_API_KEY=your_api_key_here" > .env
echo "DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions" >> .env

# 5. 启动开发服务器
npm start
```

### 🔧 加载到 Word

#### Windows 用户

**方法 1: 自动安装（推荐）**
```bash
# 运行安装脚本
.\installer\install.bat
```

**方法 2: 手动侧载**
1. 打开 Word
2. **文件** → **选项** → **信任中心** → **信任中心设置**
3. 选择 **受信任的加载项目录**
4. 点击 **添加新位置**，选择项目根目录
5. 重启 Word
6. **插入** → **加载项** → **我的加载项** → 选择 **Word Layouter**

#### macOS 用户

```bash
# 复制 manifest 到 Word 加载项目录
cp manifest.xml ~/Library/Containers/com.microsoft.Word/Data/Documents/wef/

# 重启 Word 后在"我的加载项"中找到插件
```

#### 使用 Office Online

1. 访问 [Office.com](https://www.office.com) 并创建新文档
2. **插入** → **Office 加载项** → **上传我的加载项**
3. 上传 `manifest.xml` 文件
4. 开始使用！

> 💡 **提示**：开发服务器必须保持运行状态（`https://localhost:3000`）

---

## 📖 使用指南

### 基础操作

#### 1️⃣ 打开插件
- 点击 Word 功能区的 **"显示任务窗格"** 按钮
- 或通过 **插入** → **我的加载项** 打开

#### 2️⃣ 开始对话
```
输入示例：
📝 "写一篇关于人工智能的报告，要求首行缩进、1.5倍行距"
🧮 "解释微积分基本定理，包含数学公式"
📊 "生成项目进度报告大纲"
```

#### 3️⃣ 查看和插入
- AI 实时流式生成内容
- 预览格式化效果
- 点击 **"插入格式化内容"** 按钮

### 高级技巧

#### 🎯 使用格式化指令
```
✅ "生成标题，使用黑体、22号字、居中"
✅ "写段落，首行缩进2字符，行距1.5倍"
✅ "创建项目列表，使用编号格式"
```

#### 🧮 数学公式支持
插件完全支持 LaTeX 数学公式：

```latex
行内公式: 设 $x$ 是实数变量...
独立公式: $$E = mc^2$$
复杂公式: $$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
```

#### 📋 多轮对话
- 保持对话历史，支持上下文理解
- 可以说 "继续写"、"改成正式语气" 等

---

## 🏗️ 技术架构

---

## 🏗️ 技术架构

### 核心技术栈

```mermaid
graph LR
    A[用户输入] --> B[React UI]
    B --> C[DeepSeek API]
    C --> D[流式响应]
    D --> E[HTML 解析]
    E --> F[Word OOXML]
    F --> G[文档插入]
```

| 技术 | 版本 | 用途 |
|------|------|------|
| **TypeScript** | 5.2+ | 类型安全的开发 |
| **React** | 18.2+ | UI 组件框架 |
| **Fluent UI** | 9.x | Microsoft 设计语言 |
| **Office.js** | Latest | Word API 集成 |
| **Webpack** | 5.x | 模块打包 |
| **Axios** | 1.6+ | HTTP 请求 |

### 项目结构

```
word-ai-assistant/
├── 📁 src/
│   ├── 📁 taskpane/              # 任务窗格 UI
│   │   ├── App.tsx               # 主应用组件（对话界面）
│   │   ├── index.tsx             # React 入口
│   │   ├── taskpane.html         # HTML 模板
│   │   └── taskpane.css          # 样式文件
│   ├── 📁 commands/              # Ribbon 命令
│   │   ├── commands.ts           # 快速输入命令
│   │   └── commands.html         # 命令页面
│   ├── 📁 services/              # 业务逻辑
│   │   └── deepseekService.ts   # DeepSeek API 集成
│   ├── 📁 utils/                 # 工具函数
│   │   ├── htmlParser.ts         # HTML → OOXML 转换
│   │   ├── wordUtils.ts          # Word API 封装
│   │   └── formatUtils.ts        # 格式处理工具
├── 📁 assets/                    # 静态资源
│   └── icon-*.png                # 插件图标
├── 📁 docs/                      # 文档
├── 📁 installer/                 # 安装脚本
├── manifest.xml                  # Office 插件清单
├── package.json                  # NPM 配置
├── tsconfig.json                 # TypeScript 配置
├── webpack.config.js             # Webpack 配置
└── .env                          # 环境变量（需自行创建）
```

### 关键实现

#### 🔄 流式响应处理

```typescript
// src/services/deepseekService.ts
export async function* streamDeepSeek(
  conversationHistory: Message[],
  userMessage: string,
  context?: { text: string } | null
): AsyncGenerator<string, void, unknown> {
  // 构建请求
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: buildMessages(conversationHistory, userMessage),
      stream: true,
    }),
  });

  // 流式读取
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield parseChunk(value);
  }
}
```

#### 📝 HTML 到 Word OOXML 转换

```typescript
// src/utils/htmlParser.ts
export async function insertHtmlContent(
  context: Word.RequestContext,
  html: string
): Promise<void> {
  // 清理和验证 HTML
  const sanitized = sanitizeHtml(html);
  
  // 处理数学公式（TeX → Unicode）
  const processed = containsMathFormula(sanitized)
    ? texToUnicode(sanitized)
    : sanitized;
  
  // 插入到文档
  const selection = context.document.getSelection();
  selection.insertHtml(processed, Word.InsertLocation.end);
  await context.sync();
}
```

#### 🧮 数学公式渲染

```typescript
// TeX 公式转 Unicode（示例）
texToUnicode("$x^2$")        // → x²
texToUnicode("$\\frac{1}{2}$") // → ½
texToUnicode("$\\alpha$")    // → α
```

---

## 🛠️ 开发指南

### 本地开发

```bash
# 启动开发服务器（支持热重载）
npm start

# 构建生产版本
npm run build

# 验证 manifest 文件
npm run validate
```

### 调试技巧

#### 1. 任务窗格调试
1. 在 Word 中打开插件
2. 右键点击任务窗格 → **检查元素**
3. 使用浏览器开发者工具调试

#### 2. 查看日志
```javascript
// 在代码中添加日志
console.log('[Debug]', data);

// 在浏览器控制台查看
```

#### 3. 断点调试
- 在 VS Code 中设置断点
- 使用 `debugger;` 语句
- F12 开发者工具 → Sources 标签

### 环境变量配置

创建 `.env` 文件：

```env
# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# 开发服务器配置（可选）
PORT=3000
HTTPS=true
```

### 构建部署

```bash
# 生产构建
npm run build

# 输出目录：dist/
# 包含：taskpane.html, commands.html, bundle.js, manifest.xml
```

---

## 🧪 测试

---

## 🧪 测试

### 功能测试清单

#### ✅ 基础功能
- [x] 插件成功加载到 Word
- [x] 任务窗格正常显示
- [x] AI 对话功能正常
- [x] 实时流式输出
- [x] 内容成功插入文档

#### ✅ 格式测试
创建测试用例文档，验证以下格式：

```markdown
测试项目：
1. 标题格式（H1-H6）
2. 文本样式（粗体、斜体、下划线）
3. 颜色和高亮
4. 段落对齐（左、中、右、两端）
5. 行距和缩进
6. 数学公式渲染
7. 列表格式
```

#### ✅ 数学公式测试

```latex
测试用例：
行内：The equation $E = mc^2$ is famous.
独立：$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
复杂：$$\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$$
```

### 性能测试

| 场景 | 预期响应时间 | 实测 |
|------|-------------|------|
| 启动插件 | < 2s | ✅ |
| 发送消息 | < 1s | ✅ |
| 流式首字 | < 2s | ✅ |
| 插入内容 | < 500ms | ✅ |

---

## ❓ 常见问题

<details>
<summary><b>Q1: 插件无法加载怎么办？</b></summary>

**可能原因及解决方案：**

1. **证书问题**
   ```bash
   # 重新安装证书
   npx office-addin-dev-certs install --force
   ```

2. **端口占用**
   ```bash
   # 检查 3000 端口
   netstat -ano | findstr :3000
   # 修改 webpack.config.js 中的端口
   ```

3. **manifest.xml 路径错误**
   - 确保路径指向正确的 `https://localhost:3000`
   - 检查 `<SourceLocation>` 标签

4. **Word 缓存问题**
   - 清除 Office 缓存：`%LOCALAPPDATA%\Microsoft\Office\16.0\Wef`
   - 重启 Word

</details>

<details>
<summary><b>Q2: API 调用失败？</b></summary>

**检查清单：**

1. **API Key 是否正确**
   ```bash
   # 检查 .env 文件
   cat .env
   # 确保格式为：DEEPSEEK_API_KEY=sk-...
   ```

2. **网络连接**
   ```bash
   # 测试 API 连通性
   curl -I https://api.deepseek.com
   ```

3. **配额检查**
   - 登录 DeepSeek 控制台查看剩余额度
   - 查看 API 调用日志

4. **防火墙/代理**
   - 确保允许 HTTPS 出站连接
   - 配置代理（如需要）

**常见错误码：**
- `401` - API Key 无效
- `429` - 请求过多，触发限流
- `500` - 服务器错误，稍后重试

</details>

<details>
<summary><b>Q3: 数学公式显示不正确？</b></summary>

**解决方案：**

1. **使用标准 LaTeX 语法**
   ```latex
   ✅ 正确：$\frac{1}{2}$
   ❌ 错误：1/2
   
   ✅ 正确：$x^2$
   ❌ 错误：x²（Unicode 上标）
   ```

2. **检查公式边界**
   ```latex
   行内公式：$...$（单美元符号）
   独立公式：$$...$$（双美元符号）
   ```

3. **特殊字符转义**
   ```latex
   { } _ ^ \ 需要用 \ 转义
   例如：\{ \} \_ 等
   ```

</details>

<details>
<summary><b>Q4: 如何贡献代码？</b></summary>

我们欢迎任何形式的贡献！

```bash
# 1. Fork 项目
# 2. 创建特性分支
git checkout -b feature/amazing-feature

# 3. 提交改动
git commit -m "Add some amazing feature"

# 4. 推送到分支
git push origin feature/amazing-feature

# 5. 提交 Pull Request
```

**贡献指南：**
- 遵循现有代码风格
- 添加必要的测试
- 更新相关文档
- 一个 PR 只做一件事

</details>

<details>
<summary><b>Q5: 如何自定义 AI 提示词？</b></summary>

编辑 `src/services/deepseekService.ts` 中的 `buildSystemPrompt()` 函数：

```typescript
function buildSystemPrompt(): string {
  return `你是 Word 文档写作助手...
  
  # 自定义规则
  1. 你的规则 1
  2. 你的规则 2
  ...
  `;
}
```

**建议自定义场景：**
- 学术论文写作（添加引用格式）
- 商务报告（调整语气风格）
- 技术文档（强调代码格式）
- 创意写作（更多修辞手法）

</details>

---

## 🗺️ 路线图

### 🚀 v1.0（当前版本）
- [x] 基础对话功能
- [x] HTML 格式支持
- [x] 数学公式渲染
- [x] 流式响应
- [x] 快速输入命令

### 🔮 v1.1（计划中）
- [ ] 图片生成与插入
- [ ] 表格智能生成
- [ ] 文档模板库
- [ ] 多语言支持
- [ ] 导出/导入对话历史

### 🌟 v2.0（未来）
- [ ] 本地模型支持（Ollama）
- [ ] 协作编辑集成
- [ ] 语音输入
- [ ] 文档智能校对
- [ ] 插件市场

---

## 🤝 贡献

感谢所有贡献者的付出！

<a href="https://github.com/yourusername/word-ai-assistant/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=yourusername/word-ai-assistant" />
</a>

### 如何贡献

1. **报告 Bug** - 使用 [Issue](https://github.com/yourusername/word-ai-assistant/issues) 报告问题
2. **提出建议** - 在 [Discussions](https://github.com/yourusername/word-ai-assistant/discussions) 讨论新功能
3. **提交代码** - Fork 并提交 Pull Request
4. **完善文档** - 帮助改进文档和示例

### 开发规范

```bash
# 代码风格
npm run lint          # ESLint 检查
npm run format        # Prettier 格式化

# 提交规范（Conventional Commits）
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具
```

---

## 📜 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2026 Word Layouter Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 致谢

特别感谢以下项目和服务：

- [DeepSeek](https://www.deepseek.com/) - 提供强大的 AI 能力
- [Microsoft Office.js](https://docs.microsoft.com/office/dev/add-ins/) - Office 插件框架
- [Fluent UI](https://react.fluentui.dev/) - 精美的 UI 组件库
- [React](https://react.dev/) - 前端框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全

---

## 📞 联系方式

- **GitHub Issues**: [提交问题](https://github.com/yourusername/word-ai-assistant/issues)
- **Discussions**: [参与讨论](https://github.com/yourusername/word-ai-assistant/discussions)
- **Email**: your.email@example.com
- **Twitter**: [@yourusername](https://twitter.com/yourusername)

---

<div align="center">

### 🌟 如果这个项目对你有帮助，请点个 Star！

**让 AI 写作更智能，让排版更轻松**

[⬆ 回到顶部](#-word-ai-assistant)

</div>

### Q: 格式丢失？
A: 当前版本支持的格式：
- 基础文本格式（粗体、斜体、下划线）
- 字体和字号
- 段落对齐
- 简单列表

复杂格式（如表格、图片）需要后续版本支持。

## 下一步开发计划

1. ✅ 基础框架搭建
2. ✅ UI 组件实现
3. ⏳ DeepSeek API 集成
4. ⏳ 格式提取和插入
5. ⏳ 错误处理和用户反馈
6. ⏳ 性能优化
7. ⏳ 跨平台测试

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

GPL 
