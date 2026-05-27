import React, { useState, useEffect, useMemo } from 'react';
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
    Search24Regular,
} from '@fluentui/react-icons';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';
import {
    ModelConfig,
    getUserAddedModelsGroupedByProvider,
    addModelToUserList,
    removeModelFromUserList,
    getApiKey,
    saveApiKey,
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
    providerToolbar: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
        flexWrap: 'wrap',
    },
    providerSearchInput: {
        flex: '1 1 220px',
        minWidth: '180px',
    },
    providerCategoryFilter: {
        flex: '0 0 160px',
    },
    providerBrowser: {
        display: 'grid',
        gridTemplateColumns: 'minmax(190px, 260px) minmax(0, 1fr)',
        ...shorthands.gap('12px'),
        minHeight: '360px',
        maxHeight: '520px',
        '@media (max-width: 640px)': {
            gridTemplateColumns: '1fr',
            maxHeight: 'none',
        },
    },
    providerListPanel: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...shorthands.border('1px', 'solid', '#e8e8e8'),
        ...shorthands.borderRadius('6px'),
        background: '#fafafa',
    },
    providerListHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...shorthands.padding('8px', '10px'),
        ...shorthands.borderBottom('1px', 'solid', '#e8e8e8'),
        fontSize: '12px',
        fontWeight: '600',
        color: '#333',
    },
    providerList: {
        overflowY: 'auto',
        minHeight: 0,
        ...shorthands.padding('6px'),
        '@media (max-width: 640px)': {
            maxHeight: '220px',
        },
    },
    providerListItem: {
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('4px'),
        ...shorthands.padding('8px'),
        ...shorthands.borderRadius('6px'),
        ...shorthands.border('1px', 'solid', 'transparent'),
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        ':hover': {
            background: '#ffffff',
        },
    },
    providerListItemActive: {
        background: '#ffffff',
        border: '1px solid #667eea',
    },
    providerListName: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#222',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    providerListMeta: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        ...shorthands.gap('4px'),
    },
    providerBadge: {
        fontSize: '10px',
        lineHeight: '16px',
        ...shorthands.padding('0', '6px'),
        ...shorthands.borderRadius('8px'),
        background: '#eef2ff',
        color: '#667eea',
    },
    providerBadgeMuted: {
        background: '#f3f4f6',
        color: '#666',
    },
    providerDetail: {
        minWidth: 0,
        overflowY: 'auto',
        ...shorthands.padding('12px'),
        ...shorthands.border('1px', 'solid', '#e8e8e8'),
        ...shorthands.borderRadius('6px'),
        background: '#ffffff',
    },
    providerDetailHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        ...shorthands.gap('12px'),
        marginBottom: '10px',
        flexWrap: 'wrap',
    },
    providerDetailTitle: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('4px'),
        minWidth: 0,
    },
    providerDetailName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#222',
    },
    providerDetailActions: {
        display: 'flex',
        flexWrap: 'wrap',
        ...shorthands.gap('6px'),
        justifyContent: 'flex-end',
    },
    providerEndpoint: {
        fontSize: '11px',
        color: '#888',
        ...shorthands.padding('6px', '8px'),
        ...shorthands.borderRadius('4px'),
        background: '#fafafa',
        marginBottom: '12px',
        wordBreak: 'break-all',
    },
    providerModelsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#333',
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
        fontFamily: 'inherit',
        lineHeight: '18px',
        ':disabled': {
            cursor: 'default',
        },
    },
    modelChipAdded: {
        background: '#eef2ff',
        border: '1px solid #667eea',
        color: '#667eea',
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

type ProviderCategoryFilter = ProviderCategory | 'all';

const COMMON_PROVIDER_IDS = [
    'deepseek',
    'aliyun',
    'zhipu',
    'moonshot',
    'siliconflow',
    'openrouter',
    'ollama',
    'lmstudio',
    'vllm',
];

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
    const [selectedProviderId, setSelectedProviderId] = useState<string>(PROVIDER_CATALOG[0]?.id || '');
    const [providerSearch, setProviderSearch] = useState('');
    const [providerCategoryFilter, setProviderCategoryFilter] = useState<ProviderCategoryFilter>('all');

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
    const providerCatalogOrder = useMemo(
        () => new Map(PROVIDER_CATALOG.map((provider, index) => [provider.id, index])),
        []
    );
    const commonProviderOrder = useMemo(
        () => new Map(COMMON_PROVIDER_IDS.map((providerId, index) => [providerId, index])),
        []
    );
    const providerCategoryOptions = useMemo(
        () => (Object.keys(providerCategories) as ProviderCategory[])
            .filter(category => providerCategories[category].length > 0)
            .sort((a, b) => (CATEGORY_META[a]?.order || 99) - (CATEGORY_META[b]?.order || 99)),
        [providerCategories]
    );
    const filteredProviders = useMemo(() => {
        const query = providerSearch.trim().toLowerCase();

        const matchesSearch = (provider: ProviderPreset) => {
            if (!query) return true;
            const haystack = [
                provider.name,
                provider.id,
                provider.baseUrl,
                provider.chatPath,
                ...provider.recommendedModels.flatMap(model => [model.id, model.name]),
            ].join(' ').toLowerCase();
            return haystack.includes(query);
        };

        const hasUserState = (provider: ProviderPreset) => {
            const modelCount = groupedModels[provider.id]?.length || 0;
            const hasConfiguredKey = !provider.isLocal && !!apiKeys[provider.id];
            return modelCount > 0 || hasConfiguredKey;
        };

        return PROVIDER_CATALOG
            .filter(provider =>
                (providerCategoryFilter === 'all' || provider.category === providerCategoryFilter)
                && matchesSearch(provider)
            )
            .sort((a, b) => {
                const aUserState = hasUserState(a) ? 0 : 1;
                const bUserState = hasUserState(b) ? 0 : 1;
                if (aUserState !== bUserState) return aUserState - bUserState;

                const aCommon = commonProviderOrder.get(a.id) ?? 999;
                const bCommon = commonProviderOrder.get(b.id) ?? 999;
                if (aCommon !== bCommon) return aCommon - bCommon;

                const aCategory = CATEGORY_META[a.category]?.order || 99;
                const bCategory = CATEGORY_META[b.category]?.order || 99;
                if (aCategory !== bCategory) return aCategory - bCategory;

                return (providerCatalogOrder.get(a.id) ?? 999) - (providerCatalogOrder.get(b.id) ?? 999);
            });
    }, [
        apiKeys,
        commonProviderOrder,
        groupedModels,
        providerCatalogOrder,
        providerCategoryFilter,
        providerSearch,
    ]);
    const selectedProvider = filteredProviders.find(provider => provider.id === selectedProviderId) || filteredProviders[0] || null;
    const selectedCategoryLabel = providerCategoryFilter === 'all'
        ? '全部分类'
        : CATEGORY_META[providerCategoryFilter]?.name || '全部分类';

    useEffect(() => {
        if (filteredProviders.length === 0) return;
        if (!filteredProviders.some(provider => provider.id === selectedProviderId)) {
            setSelectedProviderId(filteredProviders[0].id);
        }
    }, [filteredProviders, selectedProviderId]);

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
                                                    ? !quickAddModelIds[providerId]?.trim()
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

    const renderProvidersTab = () => {
        const selectedUserModels = selectedProvider ? groupedModels[selectedProvider.id] || [] : [];
        const selectedAddedModelIds = new Set(selectedUserModels.map(model => model.id));
        const selectedHasKey = selectedProvider
            ? selectedProvider.isLocal || isProviderKeyConfigured(selectedProvider.id)
            : false;

        return (
            <div className={styles.section}>
                <div className={styles.sectionTitle}>浏览提供商</div>

                <div className={styles.providerToolbar}>
                    <Input
                        className={styles.providerSearchInput}
                        size="small"
                        contentBefore={<Search24Regular style={{ width: 14, height: 14 }} />}
                        placeholder="搜索提供商、模型或 API 地址"
                        value={providerSearch}
                        onChange={(_, data) => setProviderSearch(data.value)}
                    />
                    <Dropdown
                        className={styles.providerCategoryFilter}
                        value={selectedCategoryLabel}
                        selectedOptions={[providerCategoryFilter]}
                        onOptionSelect={(_, data) =>
                            setProviderCategoryFilter((data.optionValue || 'all') as ProviderCategoryFilter)
                        }
                    >
                        <Option value="all" text="全部分类">全部分类</Option>
                        {providerCategoryOptions.map(category => (
                            <Option key={category} value={category} text={CATEGORY_META[category].name}>
                                {CATEGORY_META[category].name}
                            </Option>
                        ))}
                    </Dropdown>
                </div>

                <div className={styles.providerBrowser}>
                    <div className={styles.providerListPanel}>
                        <div className={styles.providerListHeader}>
                            <span>提供商</span>
                            <span>{filteredProviders.length}/{PROVIDER_CATALOG.length}</span>
                        </div>
                        <div className={styles.providerList}>
                            {filteredProviders.length === 0 ? (
                                <div className={styles.emptyText}>没有匹配的提供商</div>
                            ) : (
                                filteredProviders.map(preset => {
                                    const modelCount = groupedModels[preset.id]?.length || 0;
                                    const hasKey = preset.isLocal || isProviderKeyConfigured(preset.id);
                                    const isActive = selectedProvider?.id === preset.id;

                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            className={`${styles.providerListItem} ${isActive ? styles.providerListItemActive : ''}`}
                                            onClick={() => setSelectedProviderId(preset.id)}
                                        >
                                            <span className={styles.providerListName}>{preset.name}</span>
                                            <span className={styles.providerListMeta}>
                                                <span className={styles.providerBadge}>
                                                    {CATEGORY_META[preset.category].name}
                                                </span>
                                                <span className={`${styles.providerBadge} ${preset.isLocal || !hasKey ? styles.providerBadgeMuted : ''}`}>
                                                    {preset.isLocal ? '本地' : hasKey ? '已配置' : '未配置'}
                                                </span>
                                                {modelCount > 0 && (
                                                    <span className={styles.providerBadge}>{modelCount} 模型</span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className={styles.providerDetail}>
                        {!selectedProvider ? (
                            <div className={styles.emptyText}>请选择一个提供商</div>
                        ) : (
                            <>
                                <div className={styles.providerDetailHeader}>
                                    <div className={styles.providerDetailTitle}>
                                        <span className={styles.providerDetailName}>{selectedProvider.name}</span>
                                        <span className={`${styles.keyStatus} ${selectedHasKey ? styles.keyOk : styles.keyMissing}`}>
                                            {selectedProvider.isLocal ? '本地/自部署' : selectedHasKey ? 'API Key 已配置' : 'API Key 未配置'}
                                            {selectedUserModels.length > 0 ? ` · 已添加 ${selectedUserModels.length} 个模型` : ''}
                                        </span>
                                    </div>
                                    <div className={styles.providerDetailActions}>
                                        {!selectedProvider.isLocal && (
                                            <>
                                                <Button
                                                    icon={<Key24Regular />}
                                                    size="small"
                                                    appearance={selectedHasKey ? 'subtle' : 'primary'}
                                                    onClick={() => handleOpenKeyDialog(selectedProvider.id)}
                                                >
                                                    {selectedHasKey ? '修改 Key' : '配置 Key'}
                                                </Button>
                                                {selectedProvider.apiKeyUrl && (
                                                    <Button
                                                        size="small"
                                                        appearance="subtle"
                                                        onClick={() => window.open(selectedProvider.apiKeyUrl, '_blank')}
                                                    >
                                                        获取 Key
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.providerEndpoint}>
                                    {selectedProvider.baseUrl}{selectedProvider.chatPath}
                                </div>

                                {selectedProvider.isLocal && (
                                    <div className={styles.localInput}>
                                        <Input
                                            className={styles.quickAddInput}
                                            size="small"
                                            placeholder="输入模型名称（如 llama3）"
                                            value={localModelIds[selectedProvider.id] || ''}
                                            onChange={(_, data) =>
                                                setLocalModelIds(prev => ({ ...prev, [selectedProvider.id]: data.value }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddLocalModel(selectedProvider.id);
                                            }}
                                        />
                                        <Button
                                            icon={<Add24Regular />}
                                            size="small"
                                            appearance="primary"
                                            onClick={() => handleAddLocalModel(selectedProvider.id)}
                                            disabled={!localModelIds[selectedProvider.id]?.trim()}
                                        >
                                            添加
                                        </Button>
                                    </div>
                                )}

                                {selectedProvider.recommendedModels.length > 0 ? (
                                    <>
                                        <div className={styles.providerModelsHeader}>
                                            <span>推荐模型</span>
                                            <Button
                                                icon={<Add24Regular />}
                                                size="small"
                                                appearance="subtle"
                                                onClick={() => handleAddAllRecommended(selectedProvider.id)}
                                            >
                                                添加全部推荐
                                            </Button>
                                        </div>
                                        <div className={styles.providerCardModels}>
                                            {selectedProvider.recommendedModels.map(model => {
                                                const isAdded = selectedAddedModelIds.has(model.id);
                                                return (
                                                    <button
                                                        key={model.id}
                                                        type="button"
                                                        className={`${styles.modelChip} ${isAdded ? styles.modelChipAdded : ''}`}
                                                        onClick={() => handleAddRecommendedModel(selectedProvider.id, model.id, model.name)}
                                                        disabled={isAdded}
                                                        title={isAdded ? '已添加' : '点击添加'}
                                                    >
                                                        {isAdded && <CheckmarkCircle20Filled style={{ width: 12, height: 12 }} />}
                                                        {model.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : !selectedProvider.isLocal ? (
                                    <div className={styles.emptyText}>该提供商暂无推荐模型，可在「我的模型」中手动添加模型 ID</div>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

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
