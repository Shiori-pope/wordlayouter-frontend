import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Input,
  Text,
  Spinner,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { Send24Regular, Dismiss24Regular, Checkmark24Regular, Sparkle24Filled } from '@fluentui/react-icons';
import { streamDeepSeek } from '../services/deepseekService';

/* global Office */

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '16px',
    boxSizing: 'border-box',
    background: '#ffffff',
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  input: {
    flex: 1,
  },
  resultArea: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    backgroundColor: '#f9f9f9',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#666',
    marginBottom: '8px',
  }
});

const Popup: React.FC = () => {
  const styles = useStyles();
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const resultEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resultEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result]);

  const handleGenerate = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setResult('');
    
    try {
      // Use empty history for quick popup context
      const stream = streamDeepSeek([], input, null);
      
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setResult(prev => prev + chunk);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = () => {
    if (!result) return;
    // Send message to parent (Taskpane or FunctionFile)
    Office.context.ui.messageParent(JSON.stringify({
      type: 'INSERT',
      content: result
    }));
  };

  const handleCancel = () => {
    Office.context.ui.messageParent(JSON.stringify({
      type: 'CLOSE'
    }));
  };

  return (
    <div className={styles.root}>
      <div className={styles.inputArea}>
        <Input
          className={styles.input}
          placeholder="输入提示词..."
          value={input}
          onChange={(e, data) => setInput(data.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleGenerate();
          }}
          disabled={isLoading}
          autoFocus
        />
        <Button 
          appearance="primary" 
          icon={<Send24Regular />} 
          onClick={handleGenerate}
          disabled={isLoading || !input.trim()}
        />
      </div>

      {(isLoading || result) && (
        <div className={styles.resultArea}>
           {isLoading && (
             <div className={styles.loading}>
               <Sparkle24Filled style={{ color: '#764ba2' }} />
               <Text size={200}>生成中...</Text>
             </div>
           )}
           {result}
           <div ref={resultEndRef} />
        </div>
      )}

      <div className={styles.footer}>
        <Button 
          appearance="secondary" 
          icon={<Dismiss24Regular />}
          onClick={handleCancel}
        >
          取消
        </Button>
        <Button 
          appearance="primary" 
          icon={<Checkmark24Regular />}
          onClick={handleInsert}
          disabled={!result || isLoading}
        >
          插入
        </Button>
      </div>
    </div>
  );
};

export default Popup;
