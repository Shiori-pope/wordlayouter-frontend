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
    getUserAddedModels,
    getUserAddedModelsGroupedByProvider,
    addModelToUserList,
    removeModelFromUserList,
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

    // Dialog 状态
    const [showAddModelDialog, setShowAddModelDialog] = useState(false);
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
    const [apiKeyInput, setApiKeyInput] = useState('');

    // 添加自定义模型表单状态
    const [newModelName, setNewModelName] = useState('');
    const [newModelId, setNewModelId] = useState('');
    const [newModelApiUrl, setNewModelApiUrl] = useState('');
    const [newModelApiKey, setNewModelApiKey] = useState('');
    const [newModelMaxTokens, setNewModelMaxTokens] = useState('8192');

    useEffect(() => {
        const loaded = getSettings();
        setSettings(loaded);
        setLoading(false);
        loadData();
    }, []);

    const loadData = () => {
        setGroupedModels(getUserAddedModelsGroupedByProvider());
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

    const handleAddCustomModel = () => {
        if (!newModelName.trim() || !newModelId.trim() || !newModelApiUrl.trim()) return;

        const apiKeyStorageKey = `custom-model-key-${Date.now()}`;

        // 保存 API Key（如果提供）
        if (newModelApiKey.trim()) {
            saveApiKey(apiKeyStorageKey, newModelApiKey.trim());
        }

        // 智能判断 URL：自动补全 /v1/chat/completions
        let apiUrl = newModelApiUrl.trim();
        if (!apiUrl.includes('/v1/chat/completions')) {
            apiUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';
        }

        const newModel: ModelConfig = {
            id: newModelId.trim(),  // 使用用户输入的模型 ID（如 deepseek-chat）
            name: newModelName.trim(),
            provider: 'custom',
            apiUrl: apiUrl,
            apiKeyStorageKey: apiKeyStorageKey,
            supportsVision: false,
            supportsStreaming: true,
            maxTokens: parseInt(newModelMaxTokens) || 8192,
            description: `自定义模型: ${newModelName.trim()}`,
        };

        addModelToUserList(newModel);
        loadData();
        closeAddModelDialog();

        // 通知 ModelSelector 刷新模型列表
        window.dispatchEvent(new CustomEvent('models-updated'));
    };

    const closeAddModelDialog = () => {
        setShowAddModelDialog(false);
        setNewModelName('');
        setNewModelId('');
        setNewModelApiUrl('');
        setNewModelApiKey('');
        setNewModelMaxTokens('8192');
    };

    const getProviderDisplayName = (providerId: string): string => {
        if (providerId === 'custom') return '自定义';
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
                        </div>
                    </div>
                </div>

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

            {/* 添加模型 Dialog */}
            <Dialog open={showAddModelDialog} onOpenChange={(_, data) => {
                if (!data.open) closeAddModelDialog();
            }}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>添加自定义模型</DialogTitle>
                        <DialogContent>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>模型名称 *</Label>
                                <Input
                                    className={styles.formInput}
                                    value={newModelName}
                                    onChange={(e, data) => setNewModelName(data.value)}
                                    placeholder="例如: GPT-4o"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>模型 ID *</Label>
                                <Input
                                    className={styles.formInput}
                                    value={newModelId}
                                    onChange={(e, data) => setNewModelId(data.value)}
                                    placeholder="例如: gpt-4o"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>API URL *</Label>
                                <Input
                                    className={styles.formInput}
                                    value={newModelApiUrl}
                                    onChange={(e, data) => setNewModelApiUrl(data.value)}
                                    placeholder="例如: https://api.deepseek.com（自动补全路径）"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>API Key</Label>
                                <Input
                                    className={styles.formInput}
                                    type="password"
                                    value={newModelApiKey}
                                    onChange={(e, data) => setNewModelApiKey(data.value)}
                                    placeholder="sk-... (可选)"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>最大 Token 数</Label>
                                <Input
                                    className={styles.formInput}
                                    value={newModelMaxTokens}
                                    onChange={(e, data) => setNewModelMaxTokens(data.value)}
                                    placeholder="默认: 8192"
                                />
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <DialogTrigger disableButtonEnhancement>
                                <Button appearance="secondary" onClick={closeAddModelDialog}>取消</Button>
                            </DialogTrigger>
                            <Button
                                appearance="primary"
                                onClick={handleAddCustomModel}
                                disabled={!newModelName.trim() || !newModelId.trim() || !newModelApiUrl.trim()}
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