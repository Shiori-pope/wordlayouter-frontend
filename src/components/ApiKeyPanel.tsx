import React, { useState, useEffect } from 'react';
import {
    makeStyles,
    shorthands,
    Button,
    Input,
    Label,
    Text,
    Accordion,
    AccordionItem,
    AccordionHeader,
    AccordionPanel,
    Spinner,
} from '@fluentui/react-components';
import {
    PROVIDER_NAMES,
    PROVIDER_API_KEYS,
    getAllModels,
    getApiKey,
    saveApiKey,
    ModelProvider,
    getModelsByProvider,
} from '../types/modelConfig';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('16px'),
        padding: '16px',
        maxWidth: '600px',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('8px'),
    },
    description: {
        fontSize: '13px',
        color: '#666',
    },
    providerSection: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('8px'),
    },
    providerHeader: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
    },
    providerName: {
        fontSize: '14px',
        fontWeight: '600',
    },
    modelList: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('4px'),
        paddingLeft: '16px',
        fontSize: '12px',
        color: '#888',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('4px'),
    },
    inputRow: {
        display: 'flex',
        ...shorthands.gap('8px'),
        alignItems: 'center',
    },
    input: {
        flex: 1,
    },
    statusIcon: {
        width: '16px',
        height: '16px',
    },
    configured: {
        color: '#107c10',
    },
    notConfigured: {
        color: '#d13438',
    },
    testButton: {
        minWidth: '60px',
    },
    message: {
        fontSize: '12px',
        padding: '8px',
        ...shorthands.borderRadius('4px'),
    },
    successMessage: {
        background: '#dff6dd',
        color: '#107c10',
    },
    errorMessage: {
        background: '#fdd',
        color: '#d13438',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '8px',
    },
    link: {
        fontSize: '12px',
        color: '#0078d4',
        cursor: 'pointer',
        textDecoration: 'underline',
    },
});

interface ApiKeyPanelProps {
    onClose?: () => void;
}

const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({ onClose }) => {
    const styles = useStyles();
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ key: string; success: boolean; message: string } | null>(null);

    useEffect(() => {
        // Load all API keys
        const keys: Record<string, string> = {};
        Object.values(PROVIDER_API_KEYS).forEach(storageKey => {
            keys[storageKey] = getApiKey(storageKey);
        });
        setApiKeys(keys);
    }, []);

    const handleSaveKey = (provider: ModelProvider, value: string) => {
        const storageKey = PROVIDER_API_KEYS[provider];
        saveApiKey(storageKey, value);
        setApiKeys(prev => ({ ...prev, [storageKey]: value }));
    };

    const handleTestKey = async (provider: ModelProvider) => {
        const storageKey = PROVIDER_API_KEYS[provider];
        const apiKey = apiKeys[storageKey];

        if (!apiKey) {
            setTestResult({ key: provider, success: false, message: '请先输入 API Key' });
            return;
        }

        setTesting(provider);
        setTestResult(null);

        try {
            // Simple test - try to call models endpoint
            const models = getModelsByProvider()[provider];
            if (!models || models.length === 0) {
                setTestResult({ key: provider, success: false, message: '不支持该提供商' });
                return;
            }

            const testModel = models[0];
            const response = await fetch(testModel.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: testModel.id,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5,
                }),
            });

            if (response.ok) {
                setTestResult({ key: provider, success: true, message: '连接成功！' });
            } else if (response.status === 401 || response.status === 403) {
                setTestResult({ key: provider, success: false, message: 'API Key 无效' });
            } else if (response.status === 400) {
                const errorData = await response.json().catch(() => ({}));
                setTestResult({ key: provider, success: false, message: errorData.error?.message || '请求格式错误，请检查模型配置' });
            } else {
                const errorData = await response.json().catch(() => ({}));
                setTestResult({ key: provider, success: false, message: errorData.error?.message || `错误 (${response.status})` });
            }
        } catch (error) {
            setTestResult({ key: provider, success: false, message: '连接失败，请检查网络' });
        } finally {
            setTesting(null);
        }
    };

    const providers = Object.keys(PROVIDER_NAMES) as ModelProvider[];
    const providerModels = getModelsByProvider();

    const getKeyStatus = (provider: ModelProvider) => {
        const storageKey = PROVIDER_API_KEYS[provider];
        return !!apiKeys[storageKey];
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <Text weight="semibold" size={500}>API Key 配置</Text>
                <Text className={styles.description}>
                    配置您从各厂商获取的 API Key。所有 Key 仅存储在本地浏览器中。
                </Text>
            </div>

            <Accordion multiple defaultOpenItems={[providers[0]]}>
                {providers.map(provider => {
                    const isConfigured = getKeyStatus(provider);
                    const models = providerModels[provider] || [];
                    const storageKey = PROVIDER_API_KEYS[provider];
                    const currentKey = apiKeys[storageKey] || '';

                    return (
                        <AccordionItem key={provider} value={provider}>
                            <AccordionHeader>
                                <div className={styles.providerHeader}>
                                    <Text className={styles.providerName}>
                                        {PROVIDER_NAMES[provider]}
                                    </Text>
                                    <span className={isConfigured ? styles.configured : styles.notConfigured}>
                                        {isConfigured ? '✓ 已配置' : '✗ 未配置'}
                                    </span>
                                </div>
                            </AccordionHeader>
                            <AccordionPanel>
                                <div className={styles.providerSection}>
                                    <div className={styles.modelList}>
                                        {models.map(m => m.name).join(' / ') || '无内置模型'}
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <Label size="small">API Key</Label>
                                        <div className={styles.inputRow}>
                                            <Input
                                                className={styles.input}
                                                type="password"
                                                value={currentKey}
                                                onChange={(e, data) => handleSaveKey(provider, data.value)}
                                                placeholder={`输入 ${PROVIDER_NAMES[provider]} API Key`}
                                            />
                                            <Button
                                                className={styles.testButton}
                                                size="small"
                                                appearance="primary"
                                                onClick={() => handleTestKey(provider)}
                                                disabled={testing === provider}
                                            >
                                                {testing === provider ? <Spinner size="tiny" /> : '测试'}
                                            </Button>
                                        </div>
                                    </div>

                                    {testResult && testResult.key === provider && (
                                        <div className={`${styles.message} ${testResult.success ? styles.successMessage : styles.errorMessage}`}>
                                            {testResult.message}
                                        </div>
                                    )}
                                </div>
                            </AccordionPanel>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            <div className={styles.footer}>
                <Text className={styles.link}>如何获取 API Key?</Text>
                <Text size={200} style={{ color: '#888' }}>API Key 仅存储在本地</Text>
            </div>
        </div>
    );
};

export default ApiKeyPanel;
