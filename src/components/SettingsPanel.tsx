import React, { useState, useEffect, useCallback } from 'react';
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
    Tab,
    TabList,
} from '@fluentui/react-components';
import {
    Key24Regular,
    Delete24Regular,
    Add24Regular,
    Bot24Regular,
    Globe24Regular,
    CheckmarkCircle20Filled,
    DismissCircle20Filled,
} from '@fluentui/react-icons';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';
import {
    ModelConfig,
    getUserAddedModels,
    getUserAddedModelsGroupedByProvider,
    addModelToUserList,
    removeModelFromUserList,
    getApiKey,
    saveApiKey,
    hasApiKey,
    getProviderName,
    buildModelFromCatalog,
    addProviderRecommendedModels,
    getProviderPreset,
    PROVIDER_CATALOG,
    CATEGORY_META,
    getProvidersByCategory,
    ProviderPreset,
    ProviderCategory,
} from '../types/modelConfig';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        height: '100%',
    },
    tabContent: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('16px'),
        ...shorthands.padding('12px', '0'),
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('10px'),
    },
    sectionTitle: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#333',
        ...shorthands.borderBottom('1px', 'solid', '#e0e0e0'),
        paddingBottom: '6px',
    },
    // 模型列表
    modelList: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('6px'),
        maxHeight: '280px',
        overflowY: 'auto',
    },
    providerGroup: {
        ...shorthands.padding('8px'),
        ...shorthands.borderRadius('6px'),
        border: '1px solid #e8e8e8',
        background: '#fafafa',
    },
    providerGroupHeader: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
        marginBottom: '6px',
    },
    providerGroupName: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#667eea',
        flex: 1,
    },
    keyStatus: {
        fontSize: '11px',
    },
    keyOk: { color: '#22c55e' },
    keyMissing: { color: '#ef4444' },
    modelItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shorthands.padding('4px', '8px'),
        ...shorthands.borderRadius('4px'),
        background: '#fff',
        marginBottom: '2px',
        ':hover': { background: '#f0f0f0' },
    },
    modelItemInfo: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('6px'),
        fontSize: '12px',
    },
    modelItemActions: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('2px'),
    },
    quickAddRow: {
        display: 'flex',
        ...shorthands.gap('6px'),
        alignItems: 'center',
        marginTop: '6px',
    },
    quickAddInput: {
        flex: 1,
        fontSize: '12px',
    },
    emptyText: {
        fontSize: '12px',
        color: '#888',
        textAlign: 'center',
        padding: '20px',
    },
    // 提供商浏览
    categorySection: {
        marginBottom: '12px',
    },
    categoryTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '6px',
    },
    providerCard: {
        ...shorthands.padding('10px'),
        ...shorthands.borderRadius('6px'),
        border: '1px solid #e8e8e8',
        background: '#fafafa',
        marginBottom: '8px',
    },
    providerCardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    providerCardName: {
        fontSize: '13px',
        fontWeight: '600',
    },
    providerCardUrl: {
        fontSize: '11px',
        color: '#888',
        marginBottom: '6px',
        wordBreak: 'break-all',
    },
    providerCardModels: {
        display: 'flex',
        flexWrap: 'wrap',
        ...shorthands.gap('4px'),
        marginBottom: '8px',
    },
    modelChip: {
        fontSize: '11px',
        ...shorthands.padding('2px', '8px'),
        ...shorthands.borderRadius('12px'),
        border: '1px solid #ddd',
        background: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('4px'),
    },
    modelChipAdded: {
        background: '#eef2ff',
        border: '1px solid #667eea',
        color: '#667eea',
    },
    providerCardActions: {
        display: 'flex',
        ...shorthands.gap('6px'),
    },
    // 设置
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
        ...shorthands.gap('8px'),
        ...shorthands.padding('8px', '0', '0'),
        borderTop: '1px solid #eee',
    },
    successMessage: {
        fontSize: '11px',
        color: '#107c10',
        alignSelf: 'center',
        marginRight: 'auto',
    },
    localInput: {
        display: 'flex',
        ...shorthands.gap('6px'),
        alignItems: 'center',
        marginTop: '6px',
    },
});

interface SettingsPanelProps {
    onClose?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const styles = useStyles();
    const [activeTab, setActiveTab] = useState<string>('models');
    const [groupedModels, setGroupedModels] = useState<Record<string, ModelConfig[]>>({});
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [showKeyDialog, setShowKeyDialog] = useState(false);
    const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
    const [keyInput, setKeyInput] = useState('');
    const [quickAddModelIds, setQuickAddModelIds] = useState<Record<string, string>>({});
    const [localModelIds, setLocalModelIds] = useState<Record<string, string>>({});

    // Settings
    const [settings, setSettings] = useState<PluginSettings | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadData();
        const loaded = getSettings();
        setSettings(loaded);
    }, []);

    const loadData = () => {
        setGroupedModels(getUserAddedModelsGroupedByProvider());
        refreshApiKeys();
    };

    const refreshApiKeys = () => {
        const keys: Record<string, string> = {};
        for (const preset of PROVIDER_CATALOG) {
            if (!preset.isLocal && preset.apiKeyStorageKey) {
                keys[preset.id] = getApiKey(preset.apiKeyStorageKey);
            }
        }
        setApiKeys(keys);
    };

    const notifyModelUpdate = () => {
        loadData();
        window.dispatchEvent(new CustomEvent('models-updated'));
    };

    // ==================== 模型操作 ====================

    const handleRemoveModel = (modelId: string, providerId: string) => {
        removeModelFromUserList(modelId, providerId);
        notifyModelUpdate();
    };

    const handleQuickAdd = (providerId: string) => {
        const modelId = quickAddModelIds[providerId]?.trim();
        if (!modelId) return;

        const model = buildModelFromCatalog(providerId, modelId);
        addModelToUserList(model);
        setQuickAddModelIds(prev => ({ ...prev, [providerId]: '' }));
        notifyModelUpdate();
    };

    const handleAddRecommendedModel = (providerId: string, modelId: string, modelName: string) => {
        const model = buildModelFromCatalog(providerId, modelId, modelName);
        addModelToUserList(model);
        notifyModelUpdate();
    };

    const handleAddAllRecommended = (providerId: string) => {
        addProviderRecommendedModels(providerId);
        notifyModelUpdate();
    };

    const handleAddLocalModel = (providerId: string) => {
        const modelId = localModelIds[providerId]?.trim();
        if (!modelId) return;

        const model = buildModelFromCatalog(providerId, modelId);
        addModelToUserList(model);
        setLocalModelIds(prev => ({ ...prev, [providerId]: '' }));
        notifyModelUpdate();
    };

    // ==================== API Key ====================
    const handleOpenKeyDialog = (providerId: string) => {
        const preset = getProviderPreset(providerId);
        setEditingProviderId(providerId);
        setKeyInput(preset ? getApiKey(preset.apiKeyStorageKey) : '');
        setShowKeyDialog(true);
    };

    const handleSaveKey = () => {
        if (!editingProviderId) return;
        const preset = getProviderPreset(editingProviderId);
        if (!preset) return;
        saveApiKey(preset.apiKeyStorageKey, keyInput);
        refreshApiKeys();
        setShowKeyDialog(false);
    };

    const isProviderKeyConfigured = (providerId: string): boolean => {
        return !!apiKeys[providerId];
    };

    // ==================== 设置 ====================

    const handleSettingChange = (key: keyof PluginSettings, value: any) => {
        if (settings) {
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);
            saveSettings(newSettings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleReset = () => {
        if (window.confirm('确定要重置为默认设置吗？')) {
            resetSettings();
            setSettings(getSettings());
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    // ==================== 渲染 ====================

    const totalModels = Object.values(groupedModels).flat().length;
    const providerCategories = getProvidersByCategory();

    const renderModelsTab = () => (
        <div className={styles.section}>
            <div className={styles.sectionTitle}>我的模型 ({totalModels})</div>

            {totalModels === 0 ? (
                <div className={styles.emptyText}>
                    尚未添加任何模型，请前往「提供商」Tab 浏览并添加
                </div>
            ) : (
                <div className={styles.modelList}>
                    {Object.entries(groupedModels).map(([providerId, models]) => {
                        const preset = getProviderPreset(providerId);
                        const hasKey = !preset || preset.isLocal || isProviderKeyConfigured(providerId);

                        return (
                            <div key={providerId} className={styles.providerGroup}>
                                <div className={styles.providerGroupHeader}>
                                    <Globe24Regular style={{ width: 14, height: 14, color: '#667eea' }} />
                                    <span className={styles.providerGroupName}>
                                        {getProviderName(providerId)}
                                    </span>
                                    {preset && !preset.isLocal && (
                                        <span className={`${styles.keyStatus} ${hasKey ? styles.keyOk : styles.keyMissing}`}>
                                            {hasKey ? '已配置' : '未配置'}
                                        </span>
                                    )}
                                    {preset && !preset.isLocal && (
                                        <Button
                                            icon={<Key24Regular />}
                                            size="small"
                                            appearance="subtle"
                                            onClick={() => handleOpenKeyDialog(providerId)}
                                        />
                                    )}
                                </div>

                                {models.map(model => (
                                    <div key={model.id} className={styles.modelItem}>
                                        <div className={styles.modelItemInfo}>
                                            <Bot24Regular style={{ width: 12, height: 12, color: '#888' }} />
                                            <span>{model.name}</span>
                                            <Text size={100} style={{ color: '#aaa' }}>{model.id}</Text>
                                        </div>
                                        <div className={styles.modelItemActions}>
                                            <Button
                                                icon={<Delete24Regular />}
                                                size="small"
                                                appearance="subtle"
                                                onClick={() => handleRemoveModel(model.id, model.provider)}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* 快速添加 */}
                                {preset && (
                                    <div className={styles.quickAddRow}>
                                        <Input
                                            className={styles.quickAddInput}
                                            size="small"
                                            placeholder={
                                                preset.isLocal
                                                    ? `输入模型名称（如 llama3）`
                                                    : `输入模型 ID（如 ${preset.recommendedModels[0]?.id || 'gpt-4o'}）`
                                            }
                                            value={quickAddModelIds[providerId] || ''}
                                            onChange={(_, data) =>
                                                setQuickAddModelIds(prev => ({ ...prev, [providerId]: data.value }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleQuickAdd(providerId);
                                            }}
                                            disabled={!preset.isLocal && !isProviderKeyConfigured(providerId)}
                                        />
                                        <Button
                                            icon={<Add24Regular />}
                                            size="small"
                                            appearance="primary"
                                            onClick={() => handleQuickAdd(providerId)}
                                            disabled={
                                                preset.isLocal
                                                    ? !localModelIds[providerId]?.trim()
                                                    : !isProviderKeyConfigured(providerId) || !quickAddModelIds[providerId]?.trim()
                                            }
                                        >
                                            添加
                                        </Button>
                                    </div>
                                )}

                                {preset && !preset.isLocal && !isProviderKeyConfigured(providerId) && (
                                    <Text size={100} style={{ color: '#ef4444', marginTop: '4px', display: 'block' }}>
                                        请先配置 API Key
                                    </Text>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderProvidersTab = () => (
        <div className={styles.section}>
            <div className={styles.sectionTitle}>浏览提供商</div>

            {(Object.entries(providerCategories) as [ProviderCategory, ProviderPreset[]][])
                .sort(([a], [b]) => (CATEGORY_META[a]?.order || 99) - (CATEGORY_META[b]?.order || 99))
                .map(([category, providers]) => {
                    if (providers.length === 0) return null;
                    const meta = CATEGORY_META[category];

                    return (
                        <div key={category} className={styles.categorySection}>
                            <div className={styles.categoryTitle}>{meta.name}</div>
                            {providers.map(preset => {
                                const hasKey = preset.isLocal || isProviderKeyConfigured(preset.id);
                                const userModels = groupedModels[preset.id] || [];
                                const addedModelIds = new Set(userModels.map(m => m.id));

                                return (
                                    <div key={preset.id} className={styles.providerCard}>
                                        <div className={styles.providerCardHeader}>
                                            <span className={styles.providerCardName}>{preset.name}</span>
                                            {!preset.isLocal && (
                                                <span className={`${styles.keyStatus} ${hasKey ? styles.keyOk : styles.keyMissing}`}>
                                                    {hasKey ? '已配置' : '未配置'}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.providerCardUrl}>
                                            {preset.baseUrl}{preset.chatPath}
                                        </div>

                                        {/* 推荐模型 */}
                                        {preset.recommendedModels.length > 0 && (
                                            <div className={styles.providerCardModels}>
                                                {preset.recommendedModels.map(rm => {
                                                    const isAdded = addedModelIds.has(rm.id);
                                                    return (
                                                        <span
                                                            key={rm.id}
                                                            className={`${styles.modelChip} ${isAdded ? styles.modelChipAdded : ''}`}
                                                            onClick={() => {
                                                                if (!isAdded) {
                                                                    handleAddRecommendedModel(preset.id, rm.id, rm.name);
                                                                }
                                                            }}
                                                            title={isAdded ? '已添加' : '点击添加'}
                                                        >
                                                            {isAdded && <CheckmarkCircle20Filled style={{ width: 12, height: 12 }} />}
                                                            {rm.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* 本地供应商模型输入 */}
                                        {preset.isLocal && (
                                            <div className={styles.localInput}>
                                                <Input
                                                    className={styles.quickAddInput}
                                                    size="small"
                                                    placeholder="输入模型名称（如 llama3）"
                                                    value={localModelIds[preset.id] || ''}
                                                    onChange={(_, data) =>
                                                        setLocalModelIds(prev => ({ ...prev, [preset.id]: data.value }))
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddLocalModel(preset.id);
                                                    }}
                                                />
                                                <Button
                                                    icon={<Add24Regular />}
                                                    size="small"
                                                    appearance="primary"
                                                    onClick={() => handleAddLocalModel(preset.id)}
                                                    disabled={!localModelIds[preset.id]?.trim()}
                                                >
                                                    添加
                                                </Button>
                                            </div>
                                        )}

                                        <div className={styles.providerCardActions}>
                                            {!preset.isLocal && (
                                                <>
                                                    <Button
                                                        icon={<Key24Regular />}
                                                        size="small"
                                                        appearance="subtle"
                                                        onClick={() => handleOpenKeyDialog(preset.id)}
                                                    >
                                                        {hasKey ? '修改 Key' : '配置 Key'}
                                                    </Button>
                                                    {preset.apiKeyUrl && (
                                                        <Button
                                                            size="small"
                                                            appearance="subtle"
                                                            onClick={() => window.open(preset.apiKeyUrl, '_blank')}
                                                        >
                                                            获取 Key
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {preset.recommendedModels.length > 0 && (
                                                <Button
                                                    icon={<Add24Regular />}
                                                    size="small"
                                                    appearance="subtle"
                                                    onClick={() => handleAddAllRecommended(preset.id)}
                                                >
                                                    添加全部推荐
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
        </div>
    );

    const renderSettingsTab = () => (
        <div className={styles.section}>
            <div className={styles.sectionTitle}>插入设置</div>

            <div className={styles.formGroup}>
                <Label className={styles.formLabel}>公式默认字体</Label>
                <Input
                    className={styles.formInput}
                    value={settings?.mathFormulaFont ?? ''}
                    onChange={(_, data) => handleSettingChange('mathFormulaFont', data.value)}
                    placeholder="例如 Cambria Math"
                />
                <Text size={100} style={{ color: '#888' }}>
                    默认使用 Cambria Math（建议方案）
                </Text>
            </div>

            <div className={styles.formGroup}>
                <Label className={styles.formLabel}>公式默认字号</Label>
                <Dropdown
                    className={styles.formInput}
                    value={settings?.mathFormulaFontSize ?? '小四'}
                    onOptionSelect={(_, data) =>
                        handleSettingChange('mathFormulaFontSize', data.optionValue || '小四')
                    }
                >
                    {WORD_FONT_SIZES.map(size => (
                        <Option key={size.name} value={size.name} text={`${size.name} (${size.value}pt)`}>
                            {size.name} ({size.value}pt)
                        </Option>
                    ))}
                </Dropdown>
            </div>
        </div>
    );

    return (
        <div className={styles.root}>
            <TabList
                selectedValue={activeTab}
                onTabSelect={(_, data) => setActiveTab(data.value as string)}
                style={{ marginBottom: '4px' }}
            >
                <Tab value="models">我的模型</Tab>
                <Tab value="providers">提供商</Tab>
                <Tab value="settings">插件设置</Tab>
            </TabList>

            <div className={styles.tabContent}>
                {activeTab === 'models' && renderModelsTab()}
                {activeTab === 'providers' && renderProvidersTab()}
                {activeTab === 'settings' && renderSettingsTab()}
            </div>

            <div className={styles.footer}>
                {saved && <span className={styles.successMessage}>已自动保存</span>}
                <Button size="small" appearance="subtle" onClick={handleReset}>重置</Button>
            </div>

            {/* API Key 配置 Dialog */}
            <Dialog open={showKeyDialog} onOpenChange={(_, data) => setShowKeyDialog(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>
                            配置 {editingProviderId ? getProviderName(editingProviderId) : ''} API Key
                        </DialogTitle>
                        <DialogContent>
                            <Text style={{ marginBottom: '12px', display: 'block' }}>
                                该提供商的全部模型将共享此 Key
                            </Text>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>API Key</Label>
                                <Input
                                    type="password"
                                    value={keyInput}
                                    onChange={(_, data) => setKeyInput(data.value)}
                                    placeholder="sk-..."
                                />
                            </div>
                            <Text size={200} style={{ color: '#888' }}>
                                API Key 将安全存储在本地浏览器中
                            </Text>
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary">取消</Button>
                            </DialogTrigger>
                            <Button appearance="primary" onClick={handleSaveKey}>保存</Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
};

export default SettingsPanel;
