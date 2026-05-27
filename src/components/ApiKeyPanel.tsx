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
    getProviderPreset,
    getProvidersByCategory,
    CATEGORY_META,
    PROVIDER_CATALOG,
    getApiKey,
    saveApiKey,
    ProviderCategory,
    ProviderPreset,
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
    categorySection: {
        marginBottom: '8px',
    },
    categoryTitle: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#555',
        marginBottom: '4px',
    },
    providerRow: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('10px'),
        ...shorthands.padding('8px', '10px'),
        ...shorthands.borderRadius('6px'),
        border: '1px solid #e8e8e8',
        background: '#fafafa',
        marginBottom: '6px',
    },
    providerName: {
        fontSize: '13px',
        fontWeight: '600',
        minWidth: '120px',
    },
    providerUrl: {
        fontSize: '11px',
        color: '#888',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    inputRow: {
        display: 'flex',
        ...shorthands.gap('6px'),
        alignItems: 'center',
        minWidth: '260px',
    },
    input: {
        width: '180px',
        fontSize: '12px',
    },
    statusIcon: {
        fontSize: '11px',
        fontWeight: '500',
    },
    configured: {
        color: '#107c10',
    },
    notConfigured: {
        color: '#d13438',
    },
    testButton: {
        minWidth: '50px',
    },
    message: {
        fontSize: '12px',
        padding: '6px',
        ...shorthands.borderRadius('4px'),
        marginTop: '4px',
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
        const keys: Record<string, string> = {};
        for (const preset of PROVIDER_CATALOG) {
            if (!preset.isLocal && preset.apiKeyStorageKey) {
                keys[preset.id] = getApiKey(preset.apiKeyStorageKey);
            }
        }
        setApiKeys(keys);
    }, []);

    const handleSaveKey = (providerId: string, value: string) => {
        const preset = getProviderPreset(providerId);
        if (!preset) return;
        saveApiKey(preset.apiKeyStorageKey, value);
        setApiKeys(prev => ({ ...prev, [providerId]: value }));
    };

    const handleTestKey = async (preset: ProviderPreset) => {
        const apiKey = apiKeys[preset.id];

        if (!apiKey) {
            setTestResult({ key: preset.id, success: false, message: '请先输入 API Key' });
            return;
        }

        // Use first recommended model or a generic test
        const testModelId = preset.recommendedModels[0]?.id || 'test';
        const apiUrl = preset.baseUrl + preset.chatPath;

        setTesting(preset.id);
        setTestResult(null);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: testModelId,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5,
                }),
            });

            if (response.ok) {
                setTestResult({ key: preset.id, success: true, message: '连接成功！' });
            } else if (response.status === 401 || response.status === 403) {
                setTestResult({ key: preset.id, success: false, message: 'API Key 无效' });
            } else if (response.status === 400) {
                const errorData = await response.json().catch(() => ({}));
                setTestResult({
                    key: preset.id,
                    success: false,
                    message: errorData.error?.message || '请求格式错误，请检查模型配置',
                });
            } else {
                const errorData = await response.json().catch(() => ({}));
                setTestResult({
                    key: preset.id,
                    success: false,
                    message: errorData.error?.message || `错误 (${response.status})`,
                });
            }
        } catch {
            setTestResult({ key: preset.id, success: false, message: '连接失败，请检查网络' });
        } finally {
            setTesting(null);
        }
    };

    const providerCategories = getProvidersByCategory();
    const nonLocalProviders = Object.entries(providerCategories)
        .filter(([, providers]) => providers.some(p => !p.isLocal))
        .map(([category, providers]) => ({
            category: category as ProviderCategory,
            providers: providers.filter(p => !p.isLocal),
        }));

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <Text weight="semibold" size={500}>API Key 配置</Text>
                <Text className={styles.description}>
                    配置您从各厂商获取的 API Key。所有 Key 仅存储在本地浏览器中。
                </Text>
            </div>

            <Accordion multiple>
                {nonLocalProviders.map(({ category, providers }) => (
                    <AccordionItem key={category} value={category}>
                        <AccordionHeader>
                            <Text weight="semibold" size={400}>
                                {CATEGORY_META[category]?.name ?? category}
                            </Text>
                        </AccordionHeader>
                        <AccordionPanel>
                            {providers.map(preset => {
                                const isConfigured = !!apiKeys[preset.id];
                                const currentKey = apiKeys[preset.id] || '';

                                return (
                                    <div key={preset.id} className={styles.providerRow}>
                                        <span className={styles.providerName}>{preset.name}</span>
                                        <span className={styles.providerUrl}>
                                            {preset.baseUrl}{preset.chatPath}
                                        </span>
                                        <span className={`${styles.statusIcon} ${isConfigured ? styles.configured : styles.notConfigured}`}>
                                            {isConfigured ? '已配置' : '未配置'}
                                        </span>
                                        <div className={styles.inputRow}>
                                            <Input
                                                className={styles.input}
                                                type="password"
                                                size="small"
                                                value={currentKey}
                                                onChange={(_, data) => handleSaveKey(preset.id, data.value)}
                                                placeholder="sk-..."
                                            />
                                            <Button
                                                className={styles.testButton}
                                                size="small"
                                                appearance="primary"
                                                onClick={() => handleTestKey(preset)}
                                                disabled={testing === preset.id}
                                            >
                                                {testing === preset.id ? <Spinner size="tiny" /> : '测试'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {testResult && providers.some(p => p.id === testResult.key) && (
                                <div className={`${styles.message} ${testResult.success ? styles.successMessage : styles.errorMessage}`}>
                                    {testResult.message}
                                </div>
                            )}
                        </AccordionPanel>
                    </AccordionItem>
                ))}
            </Accordion>

            <div className={styles.footer}>
                <Text className={styles.link}>如何获取 API Key?</Text>
                <Text size={200} style={{ color: '#888' }}>API Key 仅存储在本地</Text>
            </div>
        </div>
    );
};

export default ApiKeyPanel;
