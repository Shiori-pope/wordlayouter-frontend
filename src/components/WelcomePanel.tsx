import React, { useState } from 'react';
import {
    makeStyles,
    shorthands,
    Button,
    Text,
    Spinner,
} from '@fluentui/react-components';
import {
    Sparkle24Filled,
    ArrowRight24Regular,
    Settings24Regular,
    Key24Regular,
} from '@fluentui/react-icons';
import ApiKeyPanel from './ApiKeyPanel';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        ...shorthands.padding('24px'),
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...shorthands.padding('32px', '40px'),
        background: '#ffffff',
        ...shorthands.borderRadius('16px'),
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        maxWidth: '480px',
        width: '100%',
    },
    iconContainer: {
        width: '64px',
        height: '64px',
        ...shorthands.borderRadius('16px'),
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
    },
    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '8px',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px',
        textAlign: 'center',
    },
    featureList: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('12px'),
        marginBottom: '32px',
        width: '100%',
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('12px'),
        fontSize: '14px',
        color: '#555',
    },
    featureIcon: {
        width: '32px',
        height: '32px',
        ...shorthands.borderRadius('8px'),
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    button: {
        width: '100%',
        height: '48px',
        fontSize: '16px',
    },
    secondaryButton: {
        marginTop: '12px',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...shorthands.gap('16px'),
    },
    apiKeyPanel: {
        width: '100%',
        maxHeight: '60vh',
        overflow: 'auto',
    },
});

interface WelcomePanelProps {
    onComplete: () => void;
}

const WelcomePanel: React.FC<WelcomePanelProps> = ({ onComplete }) => {
    const styles = useStyles();
    const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleStart = () => {
        setChecking(true);
        // Check if any API key is configured
        setTimeout(() => {
            setChecking(false);
            setShowApiKeyConfig(true);
        }, 500);
    };

    const handleSkip = () => {
        onComplete();
    };

    const handleApiKeyConfigured = () => {
        onComplete();
    };

    if (checking) {
        return (
            <div className={styles.root}>
                <div className={styles.card}>
                    <div className={styles.loadingContainer}>
                        <Spinner size="large" />
                        <Text>初始化中...</Text>
                    </div>
                </div>
            </div>
        );
    }

    if (showApiKeyConfig) {
        return (
            <div className={styles.root}>
                <div className={styles.card}>
                    <Text className={styles.title}>配置 API Key</Text>
                    <Text className={styles.subtitle}>
                        选择一个 LLM 提供商并配置您的 API Key
                    </Text>
                    <div className={styles.apiKeyPanel}>
                        <ApiKeyPanel onClose={handleApiKeyConfigured} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.card}>
                <div className={styles.iconContainer}>
                    <Sparkle24Filled style={{ color: '#ffffff', width: 32, height: 32 }} />
                </div>

                <Text className={styles.title}>欢迎使用 Word Layouter</Text>
                <Text className={styles.subtitle}>
                    智能 Word 文档排版助手，让 AI 帮您快速生成格式化的文档内容
                </Text>

                <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                        <div className={styles.featureIcon}>
                            <Sparkle24Filled style={{ width: 16, height: 16, color: '#667eea' }} />
                        </div>
                        <span>支持 20+ 种 AI 模型（OpenAI、Claude、Gemini、DeepSeek 等）</span>
                    </div>
                    <div className={styles.featureItem}>
                        <div className={styles.featureIcon}>
                            <Sparkle24Filled style={{ width: 16, height: 16, color: '#667eea' }} />
                        </div>
                        <span>一键生成带完整格式的 Word 文档</span>
                    </div>
                    <div className={styles.featureItem}>
                        <div className={styles.featureIcon}>
                            <Sparkle24Filled style={{ width: 16, height: 16, color: '#667eea' }} />
                        </div>
                        <span>支持数学公式渲染</span>
                    </div>
                    <div className={styles.featureItem}>
                        <div className={styles.featureIcon}>
                            <Settings24Regular style={{ width: 16, height: 16, color: '#667eea' }} />
                        </div>
                        <span>多种排版预设可选</span>
                    </div>
                </div>

                <Button
                    className={styles.button}
                    appearance="primary"
                    onClick={handleStart}
                    icon={<ArrowRight24Regular />}
                    iconPosition="after"
                >
                    开始配置
                </Button>

                <Button
                    className={styles.secondaryButton}
                    appearance="subtle"
                    onClick={handleSkip}
                >
                    跳过，稍后配置
                </Button>
            </div>
        </div>
    );
};

export default WelcomePanel;
