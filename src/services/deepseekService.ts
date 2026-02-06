import axios from 'axios';
import { LayoutPreset, DEFAULT_CLASS_RULES } from '../types/layoutPreset';
import { ModelConfig, getApiKey } from '../types/modelConfig';
import { ParsedFile, getImageDataUrl } from '../utils/fileParser';
import { isAuthenticated } from './authService';
import systemPromptTemplate from '../prompts/system.txt';
import generateStylesPromptTemplate from '../prompts/generateStyles.txt';

// API 配置 - 从环境变量读取
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

// 环境变量在webpack构建时注入（备用直连方式）
declare const DEEPSEEK_API_URL: string;
declare const DEEPSEEK_API_KEY: string;

const DEFAULT_API_URL = typeof DEEPSEEK_API_URL !== 'undefined' ? DEEPSEEK_API_URL : 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_API_KEY = typeof DEEPSEEK_API_KEY !== 'undefined' ? DEEPSEEK_API_KEY : '';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * 简单的模板引擎，支持 {{variable}} 和 {{#if variable}}...{{/if}}
 */
function renderTemplate(template: string, data: Record<string, string | undefined>): string {
  let result = template;

  // 处理 {{#if variable}}...{{/if}} 条件块
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
    return data[key] ? content : '';
  });

  // 处理 {{variable}} 变量替换
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] || '';
  });

  return result.trim();
}

/**
 * 构建系统提示词，使用模板文件
 */
export function buildSystemPrompt(layoutPreset?: LayoutPreset | null): string {
  const classRules = layoutPreset?.classRules || DEFAULT_CLASS_RULES;

  return renderTemplate(systemPromptTemplate, {
    classRules,
  });
}

/**
 * 获取模型的 API Key
 */
function getModelApiKey(model: ModelConfig): string {
  if (model.apiKeyStorageKey) {
    const storedKey = getApiKey(model.apiKeyStorageKey);
    if (storedKey) return storedKey;
  }
  return DEFAULT_API_KEY;
}

/**
 * 构建消息数组
 */
function buildMessages(
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  context: { text: string } | null | undefined,
  layoutPreset: LayoutPreset | null | undefined,
  uploadedFiles: ParsedFile[] | undefined,
  model: ModelConfig
): Message[] {
  const messages: Message[] = [];

  messages.push({
    role: 'system',
    content: buildSystemPrompt(layoutPreset),
  });

  if (context && context.text) {
    messages.push({
      role: 'system',
      content: `用户当前选中的文档内容：\n\n${context.text}\n\n请基于这个上下文回答用户的问题。`,
    });
  }

  if (uploadedFiles && uploadedFiles.length > 0) {
    const textFiles = uploadedFiles.filter(f => f.type === 'text');
    for (const file of textFiles) {
      messages.push({
        role: 'system',
        content: `用户上传的文件 "${file.fileName}"：\n\n${file.content}`,
      });
    }
  }

  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach((msg) => {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  });

  const imageFiles = uploadedFiles?.filter(f => f.type === 'image') || [];
  if (imageFiles.length > 0 && model.supportsVision) {
    const content: MessageContent[] = [
      { type: 'text', text: userMessage },
    ];
    for (const img of imageFiles) {
      content.push({
        type: 'image_url',
        image_url: {
          url: getImageDataUrl(img),
        },
      });
    }
    messages.push({
      role: 'user',
      content,
    });
  } else {
    messages.push({
      role: 'user',
      content: userMessage,
    });
  }

  return messages;
}

/**
 * 调用 AI API（支持多模型）
 */
export async function callDeepSeek(
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  context?: { text: string } | null,
  layoutPreset?: LayoutPreset | null,
  uploadedFiles?: ParsedFile[],
  model?: ModelConfig
): Promise<string> {
  const currentModel: ModelConfig = model || {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    apiUrl: DEFAULT_API_URL,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 4096,
    description: '',
  };

  const apiKey = getModelApiKey(currentModel);
  if (!apiKey) {
    throw new Error('请先配置 API Key');
  }

  try {
    const messages = buildMessages(
      conversationHistory,
      userMessage,
      context,
      layoutPreset,
      uploadedFiles,
      currentModel
    );

    if (currentModel.provider === 'anthropic') {
      return await callAnthropicApi(currentModel, apiKey, messages);
    }

    const response = await axios.post<DeepSeekResponse>(
      currentModel.apiUrl,
      {
        model: currentModel.id,
        messages: messages,
        temperature: 0.7,
        max_tokens: currentModel.maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('API Error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('API 密钥无效，请检查配置');
      } else if (error.response?.status === 429) {
        throw new Error('API 调用次数超限，请稍后重试');
      } else if (error.response?.status === 500) {
        throw new Error('API 服务器错误，请稍后重试');
      }
    }

    throw new Error('调用 AI 服务失败，请检查网络连接');
  }
}

async function callAnthropicApi(
  model: ModelConfig,
  apiKey: string,
  messages: Message[]
): Promise<string> {
  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m =>
    typeof m.content === 'string' ? m.content : ''
  ).join('\n\n');

  const anthropicMessages = chatMessages.map(m => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    const content = (m.content as MessageContent[]).map(c => {
      if (c.type === 'text') {
        return { type: 'text', text: c.text };
      }
      if (c.type === 'image_url' && c.image_url) {
        const url = c.image_url.url;
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1],
              data: match[2],
            },
          };
        }
      }
      return null;
    }).filter(Boolean);
    return { role: m.role, content };
  });

  const response = await axios.post(
    model.apiUrl,
    {
      model: model.id,
      max_tokens: model.maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.content[0].text;
}

/**
 * 流式调用 AI API
 */
export async function* streamDeepSeek(
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  context?: { text: string } | null,
  layoutPreset?: LayoutPreset | null,
  uploadedFiles?: ParsedFile[],
  model?: ModelConfig
): AsyncGenerator<string, void, unknown> {
  const currentModel: ModelConfig = model || {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    apiUrl: DEFAULT_API_URL,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 4096,
    description: '',
  };

  const messages = buildMessages(
    conversationHistory,
    userMessage,
    context,
    layoutPreset,
    uploadedFiles,
    currentModel
  );

  // 如果用户已认证，优先使用后端代理
  if (isAuthenticated()) {
    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        },
        body: JSON.stringify({
          model: currentModel.id,
          messages: messages,
          temperature: 0.7,
          maxTokens: currentModel.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error('Response body is unavailable');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.trim().substring(6);
            if (jsonStr === '[DONE]') return;

            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
      return;
    } catch (error) {
      console.warn('Backend proxy failed, falling back to direct API:', error);
    }
  }

  // 备用方案：直接调用API
  const apiKey = getModelApiKey(currentModel);
  if (!apiKey) {
    throw new Error('请先配置 API Key 或登录账户');
  }

  if (currentModel.provider === 'anthropic') {
    yield* streamAnthropicApi(currentModel, apiKey, messages);
    return;
  }

  try {
    const response = await fetch(currentModel.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: currentModel.id,
        messages: messages,
        temperature: 0.7,
        max_tokens: currentModel.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    if (!reader) throw new Error('Response body is unavailable');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const jsonStr = line.trim().substring(6);
          if (jsonStr === '[DONE]') return;

          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';
            if (content) {
              yield content;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream API Error:', error);
    throw error;
  }
}

async function* streamAnthropicApi(
  model: ModelConfig,
  apiKey: string,
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m =>
    typeof m.content === 'string' ? m.content : ''
  ).join('\n\n');

  const anthropicMessages = chatMessages.map(m => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    const content = (m.content as MessageContent[]).map(c => {
      if (c.type === 'text') {
        return { type: 'text', text: c.text };
      }
      if (c.type === 'image_url' && c.image_url) {
        const url = c.image_url.url;
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1],
              data: match[2],
            },
          };
        }
      }
      return null;
    }).filter(Boolean);
    return { role: m.role, content };
  });

  try {
    const response = await fetch(model.apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: model.maxTokens,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    if (!reader) throw new Error('Response body is unavailable');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const json = JSON.parse(jsonStr);
            if (json.type === 'content_block_delta' && json.delta?.text) {
              yield json.delta.text;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('Anthropic Stream API Error:', error);
    throw error;
  }
}

/**
 * 生成样式接口返回类型
 */
export interface GeneratedStyles {
  cssStyles: string;
  classRules: string;
}

/**
 * 根据排版描述生成 CSS 样式和 class 规则
 */
export async function generateStylesFromDescription(
  formatDescription: string,
  model: ModelConfig
): Promise<GeneratedStyles> {
  const apiKey = getModelApiKey(model);
  if (!apiKey) {
    throw new Error('请先配置 API Key');
  }

  const messages: Message[] = [
    {
      role: 'system',
      content: generateStylesPromptTemplate,
    },
    {
      role: 'user',
      content: formatDescription,
    },
  ];

  try {
    let responseText: string;

    if (model.provider === 'anthropic') {
      responseText = await callAnthropicApi(model, apiKey, messages);
    } else {
      const response = await axios.post<DeepSeekResponse>(
        model.apiUrl,
        {
          model: model.id,
          messages: messages,
          temperature: 0.3,
          max_tokens: model.maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      responseText = response.data.choices[0].message.content;
    }

    // 解析 JSON 响应
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return {
        cssStyles: parsed.cssStyles || '',
        classRules: parsed.classRules || '',
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('AI 返回的格式无法解析，请重试');
    }
  } catch (error) {
    console.error('Generate styles error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('API 密钥无效，请检查配置');
      } else if (error.response?.status === 429) {
        throw new Error('API 调用次数超限，请稍后重试');
      }
    }
    throw error;
  }
}
