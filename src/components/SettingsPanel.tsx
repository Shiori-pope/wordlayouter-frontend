import React, { useState, useEffect } from 'react';
import {
    makeStyles,
    shorthands,
    Button,
    Input,
    Label,
    Dropdown,
    Option,
    Text,
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogContent,
    DialogActions,
    DialogTrigger,
} from '@fluentui/react-components';
import { Key24Regular, Delete24Regular, Add24Regular, Bot24Regular, Settings24Regular, Globe24Regular } from '@fluentui/react-icons';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';
import {
    ModelConfig,
    CustomProvider,
    getUserAddedModels,
    getUserAddedModelsGroupedByProvider,
    addModelToUserList,
    removeModelFromUserList,
    getAvailableModelsForAdd,
    getCustomProviders,
    saveCustomProvider,
    deleteCustomProvider,
    getBuiltInProviders,
    getApiKey,
    saveApiKey,
    hasApiKey,
} from '../types/modelConfig';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('20px'),
        background: '#ffffff',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('24px'),
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('12px'),
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333',
        ...shorthands.borderBottom('1px', 'solid', '#e0e0e0'),
        paddingBottom: '8px',
        marginBottom: '8px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('4px'),
    },
    formLabel: {
        fontSize: '12px',
        fontWeight: '500',
        color: '#555',
    },
    formInput: {
        fontSize: '12px',
    },
    footer: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '8px',
    },
    successMessage: {
        fontSize: '11px',
        color: '#107c10',
        alignSelf: 'center',
        marginRight: 'auto',
    },
    // 模型管理样式
    modelList: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('4px'),
        maxHeight: '250px',
        overflowY: 'auto',
    },
    providerGroup: {
        marginBottom: '8px',
    },
    providerGroupHeader: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
        padding: '6px 0',
        borderBottom: '1px solid #eee',
        marginBottom: '4px',
    },
    providerGroupName: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#667eea',
    },
    modelItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        ...shorthands.borderRadius('4px'),
        background: '#fafafa',
        ':hover': {
            background: '#f0f0f0',
        },
    },
    modelItemInfo: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
    },
    modelItemName: {
        fontSize: '13px',
    },
    modelItemActions: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('2px'),
    },
    emptyText: {
        fontSize: '12px',
        color: '#888',
        textAlign: 'center',
        padding: '16px',
    },
    addButton: {
        marginTop: '8px',
    },
    formRow: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('8px'),
    },
    apiKeyStatus: {
        fontSize: '11px',
    },
    apiKeyOk: {
        color: '#22c55e',
    },
    apiKeyMissing: {
        color: '#ef4444',
    },
    subSection: {
        ...shorthands.padding('8px'),
        border: '1px solid #e8e8e8',
        borderRadius: '6px',
        background: '#fafafa',
    },
    subSectionTitle: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '8px',
    },
    customProviderItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        background: '#fff',
        marginBottom: '6px',
    },
    customProviderInfo: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('2px'),
    },
    customProviderName: {
        fontSize: '13px',
        fontWeight: '500',
    },
    customProviderUrl: {
        fontSize: '11px',
        color: '#888',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '300px',
    },
    inlineForm: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('8px'),
    },
    buttonGroup: {
        display: 'flex',
        flexWrap: 'wrap',
        ...shorthands.gap('6px'),
    },
});

interface SettingsPanelProps {
    onClose?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const styles = useStyles();
    const [settings, setSettings] = useState<PluginSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    // 模型管理状态
    const [groupedModels, setGroupedModels] = useState<Record<string, ModelConfig[]>>({});
    const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
    const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
    const [builtInProviders, setBuiltInProviders] = useState<string[]>([]);

    // Dialog 状态
    const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);
    const [showAddModelDialog, setShowAddModelDialog] = useState(false);
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
    const [editingProvider, setEditingProvider] = useState<CustomProvider | null>(null);
    const [apiKeyInput, setApiKeyInput] = useState('');

    // 添加自定义提供商表单
    const [providerName, setProviderName] = useState('');
    const [providerBaseUrl, setProviderBaseUrl] = useState('');
    const [providerChatPath, setProviderChatPath] = useState('/v1/chat/completions');
    const [providerApiKey, setProviderApiKey] = useState('');

    // 添加模型状态
    const [selectedBuiltInProvider, setSelectedBuiltInProvider] = useState<string>('');
    const [selectedBuiltInModel, setSelectedBuiltInModel] = useState<string>('');
    const [selectedCustomProvider, setSelectedCustomProvider] = useState<string>('');
    const [customModelName, setCustomModelName] = useState('');
    const [customProviderModels, setCustomProviderModels] = useState<string[]>([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    useEffect(() => {
        const loaded = getSettings();
        setSettings(loaded);
        setLoading(false);
        loadData();
    }, []);

    const loadData = () => {
        setGroupedModels(getUserAddedModelsGroupedByProvider());
        setCustomProviders(getCustomProviders());
        setAvailableModels(getAvailableModelsForAdd());
        setBuiltInProviders(getBuiltInProviders());
    };

    const handleChange = (key: keyof PluginSettings, value: any) => {
        if (settings) {
            const newSettings = {
                ...settings,
                [key]: value,
            };
            setSettings(newSettings);
            saveSettings(newSettings);
            setSaved(true);
            const timer = setTimeout(() => setSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    };

    const handleSave = () => {
        if (settings) {
            saveSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleReset = () => {
        if (window.confirm('确定要重置为默认设置吗？')) {
            resetSettings();
            const loaded = getSettings();
            setSettings(loaded);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    // 自定义提供商管理
    const handleSaveProvider = () => {
        if (!providerName.trim() || !providerBaseUrl.trim()) return;

        const newProvider: CustomProvider = {
            id: editingProvider?.id || `custom-provider-${Date.now()}`,
            name: providerName.trim(),
            baseUrl: providerBaseUrl.trim().replace(/\/$/, ''),  // 去除末尾斜杠
            chatPath: providerChatPath.trim() || '/v1/chat/completions',
            apiKeyStorageKey: editingProvider?.apiKeyStorageKey || `custom-provider-key-${Date.now()}`,
        };

        if (providerApiKey.trim()) {
            saveApiKey(newProvider.apiKeyStorageKey, providerApiKey.trim());
        }

        saveCustomProvider(newProvider);
        loadData();
        closeProviderDialog();
    };

    const handleDeleteProvider = (providerId: string) => {
        if (window.confirm('删除该提供商？该提供商下的所有模型也会被移除。')) {
            // 先移除该提供商下的所有模型
            const modelsToRemove = getUserAddedModels().filter(m => m.provider === providerId);
            for (const model of modelsToRemove) {
                removeModelFromUserList(model.id);
            }
            // 再删除提供商
            deleteCustomProvider(providerId);
            loadData();
        }
    };

    const handleEditProvider = (provider: CustomProvider) => {
        setEditingProvider(provider);
        setProviderName(provider.name);
        setProviderBaseUrl(provider.baseUrl);
        setProviderChatPath(provider.chatPath || '/v1/chat/completions');
        setProviderApiKey(getApiKey(provider.apiKeyStorageKey));
        setShowAddProviderDialog(true);
    };

    const closeProviderDialog = () => {
        setShowAddProviderDialog(false);
        setEditingProvider(null);
        setProviderName('');
        setProviderBaseUrl('');
        setProviderChatPath('/v1/chat/completions');
        setProviderApiKey('');
    };

    // 添加内置模型
    const getModelsByBuiltInProvider = (provider: string): ModelConfig[] => {
        return availableModels.filter(m => m.provider === provider);
    };

    const handleAddBuiltInModel = () => {
        if (!selectedBuiltInModel) return;
        const model = availableModels.find(m => m.id === selectedBuiltInModel);
        if (model) {
            addModelToUserList(model);
            loadData();
        }
        closeAddModelDialog();
    };

    // 添加自定义提供商模型
    const handleAddCustomProviderModel = () => {
        if (!selectedCustomProvider || !customModelName.trim()) return;

        const provider = customProviders.find(p => p.id === selectedCustomProvider);
        if (!provider) return;

        const newModel: ModelConfig = {
            id: `custom-${provider.id}-${Date.now()}`,
            name: customModelName.trim(),
            provider: provider.id,
            apiUrl: `${provider.baseUrl}${provider.chatPath || '/v1/chat/completions'}`,
            apiKeyStorageKey: provider.apiKeyStorageKey,
            supportsVision: false,
            supportsStreaming: true,
            maxTokens: 4096,
            description: `自定义模型 - ${provider.name}`,
        };

        addModelToUserList(newModel);
        loadData();
        setCustomModelName('');
        closeAddModelDialog();
    };

    const closeAddModelDialog = () => {
        setShowAddModelDialog(false);
        setSelectedBuiltInProvider('');
        setSelectedBuiltInModel('');
        setSelectedCustomProvider('');
        setCustomModelName('');
        setCustomProviderModels([]);
    };

    // 从自定义提供商获取模型列表
    const fetchModelsFromProvider = async (provider: CustomProvider) => {
        if (!provider.baseUrl) return;
        setFetchingModels(true);
        setCustomProviderModels([]);

        try {
            const apiKey = getApiKey(provider.apiKeyStorageKey);
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(`${provider.baseUrl}/v1/models`, {
                method: 'GET',
                headers,
            });

            if (response.ok) {
                const data = await response.json();
                // 尝试解析不同格式的响应
                let models: string[] = [];
                if (data.data && Array.isArray(data.data)) {
                    models = data.data.map((m: any) => m.id || m.name);
                } else if (Array.isArray(data)) {
                    models = data.map((m: any) => m.id || m.name);
                }
                setCustomProviderModels(models);
            }
        } catch (error) {
            console.log('Failed to fetch models from provider:', error);
        } finally {
            setFetchingModels(false);
        }
    };

    const handleCustomProviderChange = (providerId: string) => {
        setSelectedCustomProvider(providerId);
        setCustomModelName('');
        setCustomProviderModels([]);

        const provider = customProviders.find(p => p.id === providerId);
        if (provider) {
            fetchModelsFromProvider(provider);
        }
    };

    // 模型操作
    const handleRemoveModel = (modelId: string) => {
        removeModelFromUserList(modelId);
        loadData();
    };

    const handleConfigureKey = (model: ModelConfig) => {
        setEditingModel(model);
        setApiKeyInput(model.apiKeyStorageKey ? getApiKey(model.apiKeyStorageKey) : '');
        setIsKeyDialogOpen(true);
    };

    const handleSaveApiKey = () => {
        if (editingModel?.apiKeyStorageKey) {
            saveApiKey(editingModel.apiKeyStorageKey, apiKeyInput);
        }
        setIsKeyDialogOpen(false);
    };

    const handleConfigureProviderKey = (provider: CustomProvider) => {
        setEditingModel({
            id: provider.id,
            name: provider.name,
            provider: provider.id,
            apiUrl: provider.baseUrl,
            apiKeyStorageKey: provider.apiKeyStorageKey,
            supportsVision: false,
            supportsStreaming: true,
            maxTokens: 4096,
            description: '',
        } as ModelConfig);
        setApiKeyInput(getApiKey(provider.apiKeyStorageKey));
        setIsKeyDialogOpen(true);
    };

    const getProviderDisplayName = (providerId: string): string => {
        // 检查是否是自定义提供商
        const customProvider = customProviders.find(p => p.id === providerId);
        if (customProvider) return customProvider.name;
        // 内置提供商首字母大写
        return providerId.charAt(0).toUpperCase() + providerId.slice(1);
    };

    if (loading) {
        return <div>加载中...</div>;
    }

    const totalModels = Object.values(groupedModels).flat().length;

    return (
        <div className={styles.root}>
            <div className={styles.content}>
                {/* 模型管理区域 */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>模型管理</div>

                    {/* 已添加的模型列表 */}
                    {totalModels === 0 ? (
                        <div className={styles.emptyText}>
                            尚未添加任何模型，请从下方添加
                        </div>
                    ) : (
                        <div className={styles.modelList}>
                            {Object.entries(groupedModels).map(([providerId, models]) => (
                                <div key={providerId} className={styles.providerGroup}>
                                    <div className={styles.providerGroupHeader}>
                                        <Globe24Regular style={{ width: 14, height: 14, color: '#667eea' }} />
                                        <span className={styles.providerGroupName}>
                                            {getProviderDisplayName(providerId)}
                                        </span>
                                    </div>
                                    {models.map((model) => {
                                        const hasKey = !model.apiKeyStorageKey || hasApiKey(model);
                                        return (
                                            <div key={model.id} className={styles.modelItem}>
                                                <div className={styles.modelItemInfo}>
                                                    <Bot24Regular style={{ width: 14, height: 14, color: '#888' }} />
                                                    <span className={styles.modelItemName}>{model.name}</span>
                                                    <span className={`${styles.apiKeyStatus} ${hasKey ? styles.apiKeyOk : styles.apiKeyMissing}`}>
                                                        {hasKey ? '已配置' : '需配置'}
                                                    </span>
                                                </div>
                                                <div className={styles.modelItemActions}>
                                                    {model.apiKeyStorageKey && (
                                                        <Button
                                                            icon={<Key24Regular />}
                                                            size="small"
                                                            appearance="subtle"
                                                            onClick={() => handleConfigureKey(model)}
                                                            title="配置 API Key"
                                                        />
                                                    )}
                                                    <Button
                                                        icon={<Delete24Regular />}
                                                        size="small"
                                                        appearance="subtle"
                                                        onClick={() => handleRemoveModel(model.id)}
                                                        title="移除"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 添加按钮组 */}
                    <div className={styles.addButton}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <Button
                                icon={<Add24Regular />}
                                size="small"
                                appearance="primary"
                                onClick={() => setShowAddModelDialog(true)}
                            >
                                添加内置模型
                            </Button>
                            <Button
                                icon={<Globe24Regular />}
                                size="small"
                                appearance="secondary"
                                onClick={() => {
                                    setEditingProvider(null);
                                    setProviderName('');
                                    setProviderBaseUrl('');
                                    setProviderApiKey('');
                                    setShowAddProviderDialog(true);
                                }}
                            >
                                添加自定义提供商
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 自定义提供商管理 */}
                {customProviders.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>自定义提供商</div>
                        <div className={styles.subSection}>
                            {customProviders.map((provider) => {
                                const hasKey = hasApiKey({ apiKeyStorageKey: provider.apiKeyStorageKey } as ModelConfig);
                                return (
                                    <div key={provider.id} className={styles.customProviderItem}>
                                        <div className={styles.customProviderInfo}>
                                            <span className={styles.customProviderName}>{provider.name}</span>
                                            <span className={styles.customProviderUrl}>{provider.baseUrl}</span>
                                            <span className={`${styles.apiKeyStatus} ${hasKey ? styles.apiKeyOk : styles.apiKeyMissing}`}>
                                                {hasKey ? 'API Key 已配置' : '未配置 API Key'}
                                            </span>
                                        </div>
                                        <div className={styles.modelItemActions}>
                                            <Button
                                                icon={<Key24Regular />}
                                                size="small"
                                                appearance="subtle"
                                                onClick={() => handleConfigureProviderKey(provider)}
                                                title="配置 API Key"
                                            />
                                            <Button
                                                icon={<Settings24Regular />}
                                                size="small"
                                                appearance="subtle"
                                                onClick={() => handleEditProvider(provider)}
                                                title="编辑"
                                            />
                                            <Button
                                                icon={<Delete24Regular />}
                                                size="small"
                                                appearance="subtle"
                                                onClick={() => handleDeleteProvider(provider.id)}
                                                title="删除"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 插入设置区域 */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>插入设置</div>

                    <div className={styles.formGroup}>
                        <Label className={styles.formLabel}>公式默认字体</Label>
                        <Input
                            className={styles.formInput}
                            value={settings?.mathFormulaFont ?? ''}
                            onChange={(e, data) => handleChange('mathFormulaFont', data.value)}
                            placeholder="例如 Cambria Math"
                        />
                        <div style={{ fontSize: '11px', color: '#888' }}>
                            默认使用 Cambria Math（建议方案）。
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <Label className={styles.formLabel}>公式默认字号</Label>
                        <Dropdown
                            className={styles.formInput}
                            value={settings?.mathFormulaFontSize ?? '小四'}
                            onOptionSelect={(e, data) => handleChange('mathFormulaFontSize', data.optionValue || '小四')}
                        >
                            {WORD_FONT_SIZES.map((size) => (
                                <Option key={size.name} value={size.name} text={`${size.name} (${size.value}pt)`}>
                                    {size.name} ({size.value}pt)
                                </Option>
                            ))}
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* Footer Area */}
            <div className={styles.footer}>
                {saved && <span className={styles.successMessage}>✓ 已自动保存</span>}
                <Button size="small" appearance="subtle" onClick={handleSave}>保存</Button>
                <Button size="small" appearance="subtle" onClick={handleReset}>重置</Button>
            </div>

            {/* 添加自定义提供商 Dialog */}
            <Dialog open={showAddProviderDialog} onOpenChange={(_, data) => {
                if (!data.open) closeProviderDialog();
            }}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>{editingProvider ? '编辑自定义提供商' : '添加自定义提供商'}</DialogTitle>
                        <DialogContent>
                            <div className={styles.inlineForm}>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>提供商名称 *</Label>
                                    <Input
                                        className={styles.formInput}
                                        value={providerName}
                                        onChange={(e, data) => setProviderName(data.value)}
                                        placeholder="例如: My API"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>Base URL *</Label>
                                    <Input
                                        className={styles.formInput}
                                        value={providerBaseUrl}
                                        onChange={(e, data) => setProviderBaseUrl(data.value)}
                                        placeholder="https://api.example.com/v1"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>Chat 路径</Label>
                                    <Input
                                        className={styles.formInput}
                                        value={providerChatPath}
                                        onChange={(e, data) => setProviderChatPath(data.value)}
                                        placeholder="/v1/chat/completions"
                                    />
                                    <div style={{ fontSize: '11px', color: '#888' }}>
                                        API 调用的路径，默认 /v1/chat/completions
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>API Key</Label>
                                    <Input
                                        className={styles.formInput}
                                        type="password"
                                        value={providerApiKey}
                                        onChange={(e, data) => setProviderApiKey(data.value)}
                                        placeholder="sk-..."
                                    />
                                </div>
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">取消</Button>
                            </DialogTrigger>
                            <Button appearance="primary" onClick={handleSaveProvider} disabled={!providerName.trim() || !providerBaseUrl.trim()}>
                                保存
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>

            {/* 添加模型 Dialog */}
            <Dialog open={showAddModelDialog} onOpenChange={(_, data) => {
                if (!data.open) closeAddModelDialog();
            }}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>添加模型</DialogTitle>
                        <DialogContent>
                            <div className={styles.subSection} style={{ marginBottom: '12px' }}>
                                <div className={styles.subSectionTitle}>从内置提供商添加</div>
                                {/* 选择内置提供商 */}
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>选择提供商</Label>
                                    <div className={styles.buttonGroup}>
                                        {builtInProviders.map((provider) => (
                                            <Button
                                                key={provider}
                                                size="small"
                                                appearance={selectedBuiltInProvider === provider ? 'primary' : 'secondary'}
                                                onClick={() => {
                                                    setSelectedBuiltInProvider(provider);
                                                    setSelectedBuiltInModel('');
                                                }}
                                            >
                                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                {/* 选择模型 */}
                                {selectedBuiltInProvider && (
                                    <div className={styles.formGroup}>
                                        <Label className={styles.formLabel}>选择模型</Label>
                                        <Dropdown
                                            placeholder="选择一个模型"
                                            value={getModelsByBuiltInProvider(selectedBuiltInProvider).find(m => m.id === selectedBuiltInModel)?.name || ''}
                                            onOptionSelect={(e, data) => setSelectedBuiltInModel(data.optionValue || '')}
                                        >
                                            {getModelsByBuiltInProvider(selectedBuiltInProvider).map((model) => (
                                                <Option key={model.id} value={model.id}>
                                                    {model.name}
                                                </Option>
                                            ))}
                                        </Dropdown>
                                    </div>
                                )}
                            </div>

                            {/* 从自定义提供商添加 */}
                            {customProviders.length > 0 && (
                                <div className={styles.subSection}>
                                    <div className={styles.subSectionTitle}>从自定义提供商添加</div>
                                    <div className={styles.formGroup}>
                                        <Label className={styles.formLabel}>选择提供商</Label>
                                        <Dropdown
                                            placeholder="选择提供商"
                                            value={customProviders.find(p => p.id === selectedCustomProvider)?.name || ''}
                                            onOptionSelect={(e, data) => handleCustomProviderChange(data.optionValue || '')}
                                        >
                                            {customProviders.map((p) => (
                                                <Option key={p.id} value={p.id}>
                                                    {p.name}
                                                </Option>
                                            ))}
                                        </Dropdown>
                                    </div>
                                    {selectedCustomProvider && (
                                        fetchingModels ? (
                                            <Text size={200}>正在获取模型列表...</Text>
                                        ) : customProviderModels.length > 0 ? (
                                            <div className={styles.formGroup}>
                                                <Label className={styles.formLabel}>选择模型（从 API 获取）</Label>
                                                <Dropdown
                                                    placeholder="选择一个模型"
                                                    value={customProviderModels.find(m => m === customModelName) || ''}
                                                    onOptionSelect={(e, data) => setCustomModelName(data.optionValue || '')}
                                                >
                                                    {customProviderModels.map((model) => (
                                                        <Option key={model} value={model}>
                                                            {model}
                                                        </Option>
                                                    ))}
                                                </Dropdown>
                                            </div>
                                        ) : (
                                            <div className={styles.formGroup}>
                                                <Label className={styles.formLabel}>模型名称 *</Label>
                                                <Input
                                                    className={styles.formInput}
                                                    value={customModelName}
                                                    onChange={(e, data) => setCustomModelName(data.value)}
                                                    placeholder="例如: gpt-4o"
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">取消</Button>
                            </DialogTrigger>
                            <Button
                                appearance="primary"
                                onClick={selectedBuiltInProvider ? handleAddBuiltInModel : handleAddCustomProviderModel}
                                disabled={
                                    (selectedBuiltInProvider && !selectedBuiltInModel) ||
                                    (!selectedBuiltInProvider && (!selectedCustomProvider || !customModelName.trim()))
                                }
                            >
                                添加
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>

            {/* API Key 配置 Dialog */}
            <Dialog open={isKeyDialogOpen} onOpenChange={(_, data) => setIsKeyDialogOpen(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>配置 API Key</DialogTitle>
                        <DialogContent>
                            <Text style={{ marginBottom: '12px', display: 'block' }}>
                                为 {editingModel?.name} 配置 API Key
                            </Text>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>API Key</label>
                                <Input
                                    type="password"
                                    value={apiKeyInput}
                                    onChange={(e, data) => setApiKeyInput(data.value)}
                                    placeholder="sk-..."
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">取消</Button>
                            </DialogTrigger>
                            <Button appearance="primary" onClick={handleSaveApiKey}>保存</Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
};

export default SettingsPanel;