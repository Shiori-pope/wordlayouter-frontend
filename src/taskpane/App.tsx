import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Text,
  Spinner,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import {
  Send24Regular,
  DocumentAdd24Regular,
  TextBold24Regular,
  Sparkle24Filled,
  Code24Regular,
  ChevronDown16Regular,
  ChevronUp16Regular,
  Delete24Regular,
  Copy24Regular,
  Settings24Regular,
} from '@fluentui/react-icons';
import { streamDeepSeek } from '../services/deepseekService';
import { authService, isAuthenticated } from '../services/authService';
import {
  isHtmlFormat,
  containsMathFormula,
  insertHtmlAsDocx,
  sanitizeHtml,
} from '../utils/htmlParser';
import LayoutPresetPanel from '../components/LayoutPresetPanel';
import ModelSelector from '../components/ModelSelector';
import SettingsPanel from '../components/SettingsPanel';
import { FileUploadButton, FileStrip } from '../components/FileUploadPanel';
import { AuthPanel } from '../components/AuthPanel';
import { UserPanel } from '../components/UserPanel';
import { LayoutPreset, getActivePreset } from '../types/layoutPreset';
import { ModelConfig, getActiveModel } from '../types/modelConfig';
import { ParsedFile } from '../utils/fileParser';

/* global Word */

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    background: '#f5f5f5',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('10px'),
    ...shorthands.padding('12px', '16px'),
    background: '#ffffff',
    ...shorthands.borderBottom('1px', 'solid', '#e0e0e0'),
    flexShrink: 0,
  },
  headerIcon: {
    width: '32px',
    height: '32px',
    ...shorthands.borderRadius('8px'),
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: tokens.colorNeutralForeground1,
  },
  messagesContainer: {
    flex: '1 1 auto',
    overflowY: 'auto',
    overflowX: 'hidden',
    ...shorthands.padding('12px', '16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
    minHeight: 0,
    // 允许用户在流式输出时滚动
    overscrollBehavior: 'contain',
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '85%',
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  assistantWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    ...shorthands.padding('10px', '14px'),
    ...shorthands.borderRadius('12px'),
    lineHeight: '1.5',
    fontSize: '13px',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    background: '#ffffff',
    color: tokens.colorNeutralForeground1,
    borderBottomLeftRadius: '4px',
    ...shorthands.border('1px', 'solid', '#e0e0e0'),
  },
  messageTime: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground4,
    marginTop: '2px',
    paddingInline: '4px',
  },
  htmlPreview: {
    marginTop: '8px',
    ...shorthands.padding('8px'),
    background: '#f0f9ff',
    ...shorthands.borderRadius('8px'),
    ...shorthands.border('1px', 'solid', '#bae6fd'),
  },
  htmlHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    marginBottom: '4px',
    color: '#0369a1',
    fontWeight: '600',
    fontSize: '11px',
  },
  actionBtn: {
    marginTop: '8px',
    ...shorthands.borderRadius('8px'),
    fontSize: '11px',
  },
  bottomArea: {
    flexShrink: 0,
    background: '#ffffff',
    ...shorthands.borderTop('1px', 'solid', '#e0e0e0'),
  },
  debugPanel: {
    ...shorthands.borderBottom('1px', 'solid', '#e0e0e0'),
  },
  debugHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('8px', '16px'),
    cursor: 'pointer',
    background: '#fafafa',
    ':hover': {
      background: '#f0f0f0',
    },
  },
  debugHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
  },
  debugContent: {
    ...shorthands.padding('12px', '16px'),
    background: '#1e1e1e',
  },
  debugTextarea: {
    width: '100%',
    minHeight: '100px',
    maxHeight: '200px',
    ...shorthands.padding('10px'),
    ...shorthands.borderRadius('6px'),
    background: '#2d2d2d',
    color: '#d4d4d4',
    ...shorthands.border('1px', 'solid', '#3c3c3c'),
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  debugActions: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
    marginTop: '10px',
  },
  inputArea: {
    ...shorthands.padding('12px', '16px'),
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    marginBottom: '8px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  inputField: {
    flex: 1,
    ...shorthands.borderRadius('20px'),
    background: '#f5f5f5',
    ...shorthands.border('1px', 'solid', '#e0e0e0'),
    ':focus-within': {
      background: '#ffffff',
      ...shorthands.border('1px', 'solid', '#667eea'),
    },
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    minWidth: '36px',
    ...shorthands.borderRadius('50%'),
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('10px', '14px'),
    background: '#ffffff',
    ...shorthands.borderRadius('12px'),
    ...shorthands.border('1px', 'solid', '#e0e0e0'),
    alignSelf: 'flex-start',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...shorthands.gap('10px'),
    color: tokens.colorNeutralForeground4,
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    ...shorthands.borderRadius('50%'),
    background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamingWindow: {
    ...shorthands.padding('10px', '14px'),
    background: '#ffffff',
    ...shorthands.borderRadius('12px'),
    ...shorthands.border('1px', 'solid', '#e0e0e0'),
    alignSelf: 'flex-start',
    maxWidth: '85%',
    minHeight: '60px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontSize: '13px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    flexShrink: 0,
  },
  streamingHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    marginBottom: '6px',
    color: '#764ba2',
    fontSize: '12px',
    fontWeight: '500',
  },
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
  rawHtml?: string;
  isHtml?: boolean;
  hasMath?: boolean;
  timestamp: Date;
}

const App: React.FC = () => {
  const styles = useStyles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingEndRef = useRef<HTMLDivElement>(null);

  // 认证相关状态
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [debugMode, setDebugMode] = useState(false);
  const [debugHtml, setDebugHtml] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activePreset, setActivePreset] = useState<LayoutPreset | null>(null);
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<ParsedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 错误消息自动消失
  useEffect(() => {
    if (fileError) {
      const timer = setTimeout(() => setFileError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [fileError]);

  useEffect(() => {
    setActivePreset(getActivePreset());
    setActiveModel(getActiveModel());
  }, []);

  // 检查用户认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthLoading(true);
        const autoLoginResult = await authService.autoLogin();
        if (autoLoginResult.success && autoLoginResult.user) {
          setIsUserAuthenticated(true);
          setUserInfo(autoLoginResult.user);
        } else {
          setIsUserAuthenticated(false);
          setUserInfo(null);
        }
      } catch (err) {
        console.error('Auto login failed:', err);
        setIsUserAuthenticated(false);
        setUserInfo(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 认证成功处理
  const handleAuthSuccess = (user: any) => {
    setIsUserAuthenticated(true);
    setUserInfo(user);
  };

  // 登出处理
  const handleLogout = () => {
    setIsUserAuthenticated(false);
    setUserInfo(null);
  };

  // 检测用户是否在手动滚动
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // 检查是否滚动到底部附近（50px 容差）
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      if (!isAtBottom && isStreaming) {
        setUserScrolling(true);
      }
      // 如果滚动到底部，重置状态
      if (isAtBottom) {
        setUserScrolling(false);
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // 滚动停止后检查位置
        const stillAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
        if (stillAtBottom) {
          setUserScrolling(false);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isStreaming]);

  // 新消息时滚动到底部
  useEffect(() => {
    if (!userScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, userScrolling]);

  // 流式输出时滚动（仅当用户没有手动滚动时）
  useEffect(() => {
    if (!userScrolling) {
      streamingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingContent, userScrolling]);

  // 开始新的流式输出时重置滚动状态
  useEffect(() => {
    if (isStreaming) {
      setUserScrolling(false);
    }
  }, [isStreaming]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const currentInput = input;
    const userMessage: Message = {
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    let fullResponse = '';

    try {
      const stream = streamDeepSeek(
        messages,
        currentInput,
        null,
        activePreset,
        uploadedFiles,
        activeModel || undefined
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        setStreamingContent(prev => prev + chunk);
      }

      const response = fullResponse;
      let rawHtml: string | undefined;
      let isHtml = false;
      let hasMath = false;
      let displayContent = response;

      if (isHtmlFormat(response)) {
        isHtml = true;
        rawHtml = sanitizeHtml(response);
        hasMath = containsMathFormula(response);

        const previewLines: string[] = [];
        const h1Match = response.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const h2Match = response.match(/<h2[^>]*>(.*?)<\/h2>/i);
        const pMatch = response.match(/<p[^>]*>(.*?)<\/p>/i);

        if (h1Match) previewLines.push(h1Match[1].substring(0, 30));
        if (h2Match) previewLines.push(h2Match[1].substring(0, 30));
        if (pMatch) {
          const text = pMatch[1].replace(/<[^>]*>/g, '').substring(0, 40);
          previewLines.push(text + '...');
        }
        if (hasMath) previewLines.push('包含数学公式');

        displayContent = previewLines.length > 0
          ? previewLines.join('\n')
          : response.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: displayContent,
        rawHtml,
        isHtml,
        hasMath,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUploadedFiles([]);
    } catch (error) {
      console.error('调用 AI 失败:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `错误：${errorMsg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleInsertContent = async (message: Message) => {
    try {
      await Word.run(async (wordContext) => {
        if (message.isHtml && message.rawHtml) {
          // 获取当前预设的 CSS 样式
          const preset = getActivePreset();
          const cssStyles = preset?.cssStyles;
          await insertHtmlAsDocx(wordContext, message.rawHtml, cssStyles);
        } else {
          const selection = wordContext.document.getSelection();
          selection.insertText(message.content, Word.InsertLocation.after);
          await wordContext.sync();
        }
      });
    } catch (error) {
      console.error('插入失败:', error);
      alert('插入失败');
    }
  };

  const handleDebugInsert = async () => {
    if (!debugHtml.trim()) return;
    try {
      await Word.run(async (wordContext) => {
        // debug 框直接传递完整 HTML，与 AI 插入逻辑一致
        // 认为 debug 输入就是完整的 HTML 内容
        await insertHtmlAsDocx(wordContext, debugHtml);
      });
    } catch (error) {
      console.error('Debug 插入失败:', error);
      alert('插入失败');
    }
  };

  const handleCopyHtml = async (html: string) => {
    try {
      await navigator.clipboard.writeText(html);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = html;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handlePresetChange = (preset: LayoutPreset | null) => {
    setActivePreset(preset);
  };

  const handleModelChange = (model: ModelConfig) => {
    setActiveModel(model);
    if (!model.supportsVision) {
      setUploadedFiles(files => files.filter(f => f.type !== 'image'));
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  // 加载状态
  if (authLoading) {
    return (
      <div className={styles.root}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column'
        }}>
          <Spinner size="medium" />
          <Text style={{ marginTop: '16px' }}>初始化中...</Text>
        </div>
      </div>
    );
  }

  // 未认证状态，显示登录界面
  if (!isUserAuthenticated) {
    return (
      <div className={styles.root}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100vh',
          padding: '16px'
        }}>
          <AuthPanel onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Sparkle24Filled style={{ color: '#ffffff', width: 18, height: 18 }} />
        </div>
        <Text className={styles.headerText}>Word AI 助手</Text>
        <Button
          icon={<Settings24Regular />}
          appearance="subtle"
          onClick={() => setShowSettings(!showSettings)}
          title="打开设置"
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{ borderBottom: '1px solid #e0e0e0', background: '#fafafa' }}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </div>
      )}

      {/* User Panel */}
      {userInfo && (
        <div style={{ borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
          <UserPanel user={userInfo} onLogout={handleLogout} />
        </div>
      )}

      {/* Messages */}
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <TextBold24Regular style={{ color: '#667eea', width: 24, height: 24 }} />
            </div>
            <Text size={300} weight="semibold">开始对话</Text>
            <Text size={100} align="center" style={{ maxWidth: 180 }}>
              输入需求，生成格式化内容
            </Text>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.messageWrapper} ${
                message.role === 'user' ? styles.userWrapper : styles.assistantWrapper
              }`}
            >
              <div className={`${styles.messageBubble} ${
                message.role === 'user' ? styles.userBubble : styles.assistantBubble
              }`}>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>

                {message.role === 'assistant' && message.isHtml && (
                  <div className={styles.htmlPreview}>
                    <div className={styles.htmlHeader}>
                      <DocumentAdd24Regular style={{ width: 14, height: 14 }} />
                      <span>HTML 格式</span>
                      {message.hasMath && <span>· 含公式</span>}
                    </div>
                  </div>
                )}

                {message.role === 'assistant' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    <Button
                      className={styles.actionBtn}
                      appearance={message.isHtml ? 'primary' : 'subtle'}
                      icon={<DocumentAdd24Regular />}
                      onClick={() => handleInsertContent(message)}
                      size="small"
                    >
                      {message.isHtml ? '插入格式化内容' : '插入文本'}
                    </Button>
                    {message.isHtml && message.rawHtml && (
                      <Button
                        className={styles.actionBtn}
                        appearance="subtle"
                        icon={<Copy24Regular />}
                        onClick={() => handleCopyHtml(message.rawHtml!)}
                        size="small"
                      >
                        复制HTML
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Text className={styles.messageTime} style={{
                textAlign: message.role === 'user' ? 'right' : 'left'
              }}>
                {formatTime(message.timestamp)}
              </Text>
            </div>
          ))
        )}

        {loading && !isStreaming && (
          <div className={styles.loadingBox}>
            <Spinner size="tiny" />
            <Text size={200}>思考中...</Text>
          </div>
        )}

        {isStreaming && (
          <div className={styles.streamingWindow}>
            <div className={styles.streamingHeader}>
              <Sparkle24Filled style={{ width: 14, height: 14 }} />
              <span>正在生成...</span>
            </div>
            {streamingContent}
            <div ref={streamingEndRef} />
          </div>
        )}

        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Bottom Area */}
      <div className={styles.bottomArea}>
        {/* Debug Panel */}
        <div className={styles.debugPanel}>
          <div className={styles.debugHeader} onClick={() => setDebugMode(!debugMode)}>
            <div className={styles.debugHeaderLeft}>
              <Code24Regular style={{ width: 14, height: 14 }} />
              <span>Debug HTML</span>
            </div>
            {debugMode ? (
              <ChevronDown16Regular style={{ width: 14, height: 14, color: tokens.colorNeutralForeground3 }} />
            ) : (
              <ChevronUp16Regular style={{ width: 14, height: 14, color: tokens.colorNeutralForeground3 }} />
            )}
          </div>
          {debugMode && (
            <div className={styles.debugContent}>
              <textarea
                className={styles.debugTextarea}
                value={debugHtml}
                onChange={(e) => setDebugHtml(e.target.value)}
                placeholder="输入 HTML 代码测试插入效果..."
              />
              <div className={styles.debugActions}>
                <Button
                  appearance="primary"
                  icon={<DocumentAdd24Regular />}
                  onClick={handleDebugInsert}
                  disabled={!debugHtml.trim()}
                  size="small"
                >
                  插入到 Word
                </Button>
                <Button
                  appearance="subtle"
                  icon={<Delete24Regular />}
                  onClick={() => setDebugHtml('')}
                  size="small"
                >
                  清空
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* File Strip */}
        <FileStrip files={uploadedFiles} onRemove={handleRemoveFile} />

        {/* Input Area */}
        <div className={styles.inputArea}>
          {/* Controls Row - GitHub Copilot style */}
          <div className={styles.controlsRow}>
            <ModelSelector onModelChange={handleModelChange} />
            <LayoutPresetPanel onPresetChange={handlePresetChange} />
            <FileUploadButton
              currentModel={activeModel}
              onFilesChange={setUploadedFiles}
              uploadedFiles={uploadedFiles}
              onError={setFileError}
            />
            {fileError && (
              <Text style={{ fontSize: '11px', color: '#ef4444', marginLeft: '8px' }}>
                {fileError}
              </Text>
            )}
          </div>

          {/* Input Row */}
          <div className={styles.inputRow}>
            <Input
              className={styles.inputField}
              placeholder="输入需求..."
              value={input}
              onChange={(e, data) => setInput(data.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
            />
            <Button
              className={styles.sendBtn}
              icon={<Send24Regular style={{ width: 18, height: 18 }} />}
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              appearance="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
