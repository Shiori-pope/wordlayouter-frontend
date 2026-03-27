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
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogContent,
    DialogActions,
    DialogTrigger as DialogActionsTrigger,
} from '@fluentui/react-components';
import { Key24Regular, Delete24Regular, Add24Regular, Bot24Regular } from '@fluentui/react-icons';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';
import {
    ModelConfig,
    getUserAddedModels,
    addModelToUserList,
    removeModelFromUserList,
    getAvailableModelsForAdd,
    getApiKey,
    saveApiKey,
    hasApiKey,
    getActiveModel,
    setActiveModelId,
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
        ...shorthands.gap('8px'),
        maxHeight: '200px',
        overflowY: 'auto',
    },
    modelItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shorthands.padding('8px', '12px'),
        ...shorthands.borderRadius('6px'),
        border: '1px solid #e0e0e0',
        background: '#fafafa',
    },
    modelItemInfo: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
    },
    modelItemName: {
        fontSize: '13px',
        fontWeight: '500',
    },
    modelItemActions: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('4px'),
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
        color: '#888',
    },
    apiKeyOk: {
        color: '#22c55e',
    },
    apiKeyMissing: {
        color: '#ef4444',
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
    const [userAddedModels, setUserAddedModels] = useState<ModelConfig[]>([]);
    const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [selectedBuiltInModel, setSelectedBuiltInModel] = useState<string>('');
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
    const [apiKeyInput, setApiKeyInput] = useState('');

    // 自定义模型表单状态
    const [customModelName, setCustomModelName] = useState('');
    const [customModelUrl, setCustomModelUrl] = useState('');
    const [customModelKey, setCustomModelKey] = useState('');
    const [customModelDesc, setCustomModelDesc] = useState('');

    useEffect(() => {
        // 加载设置
        const loaded = getSettings();
        setSettings(loaded);
        setLoading(false);

        // 加载模型列表
        loadModels();
    }, []);

    const loadModels = () => {
        setUserAddedModels(getUserAddedModels());
        setAvailableModels(getAvailableModelsForAdd());
    };

    const handleChange = (key: keyof PluginSettings, value: any) => {
        if (settings) {
            const newSettings = {
                ...settings,
                [key]: value,
            };
            setSettings(newSettings);

            // Auto save
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

    // 模型管理相关函数
    const handleAddFromBuiltIn = () => {
        if (selectedBuiltInModel) {
            const model = availableModels.find(m => m.id === selectedBuiltInModel);
            if (model) {
                addModelToUserList(model);
                loadModels();
                setShowAddDialog(false);
                setSelectedBuiltInModel('');
            }
        }
    };

    const handleAddCustomModel = () => {
        if (!customModelName.trim() || !customModelUrl.trim()) return;

        const newModel: ModelConfig = {
            id: `custom-${Date.now()}`,
            name: customModelName.trim(),
            description: customModelDesc.trim() || '自定义模型',
            provider: 'custom' as any,
            apiUrl: customModelUrl.trim(),
            apiKeyStorageKey: `custom-api-key-${Date.now()}`,
            supportsVision: false,
            supportsStreaming: true,
            maxTokens: 4096,
        };

        // 保存 API Key
        if (customModelKey.trim()) {
            saveApiKey(newModel.apiKeyStorageKey!, customModelKey.trim());
        }

        addModelToUserList(newModel);
        loadModels();

        // 重置表单
        setCustomModelName('');
        setCustomModelUrl('');
        setCustomModelKey('');
        setCustomModelDesc('');
        setShowCustomForm(false);
    };

    const handleRemoveModel = (modelId: string) => {
        removeModelFromUserList(modelId);
        loadModels();
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

    if (loading) {
        return <div>加载中...</div>;
    }

    return (
        <div className={styles.root}>
            <div className={styles.content}>
                {/* 模型管理区域 */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>模型管理</div>

                    {/* 已添加的模型列表 */}
                    {userAddedModels.length === 0 ? (
                        <div className={styles.emptyText}>
                            尚未添加任何模型，请从下方添加
                        </div>
                    ) : (
                        <div className={styles.modelList}>
                            {userAddedModels.map((model) => {
                                const hasKey = !model.apiKeyStorageKey || hasApiKey(model);
                                return (
                                    <div key={model.id} className={styles.modelItem}>
                                        <div className={styles.modelItemInfo}>
                                            <Bot24Regular style={{ width: 16, height: 16, color: '#667eea' }} />
                                            <span className={styles.modelItemName}>{model.name}</span>
                                            <span className={hasKey ? styles.apiKeyOk : styles.apiKeyMissing}>
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
                    )}

                    {/* 添加按钮 */}
                    <div className={styles.addButton} style={{ display: 'flex', gap: '8px' }}>
                        <Button
                            icon={<Add24Regular />}
                            size="small"
                            appearance="primary"
                            onClick={() => setShowAddDialog(true)}
                            disabled={availableModels.length === 0}
                        >
                            从内置模型添加
                        </Button>
                        <Button
                            icon={<Add24Regular />}
                            size="small"
                            appearance="secondary"
                            onClick={() => setShowCustomForm(!showCustomForm)}
                        >
                            添加自定义模型
                        </Button>
                    </div>

                    {/* 自定义模型表单 */}
                    {showCustomForm && (
                        <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '8px' }}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>模型名称 *</Label>
                                    <Input
                                        className={styles.formInput}
                                        value={customModelName}
                                        onChange={(e, data) => setCustomModelName(data.value)}
                                        placeholder="例如: My Custom Model"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>API URL *</Label>
                                    <Input
                                        className={styles.formInput}
                                        value={customModelUrl}
                                        onChange={(e, data) => setCustomModelUrl(data.value)}
                                        placeholder="https://api.example.com/v1/chat/completions"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>API Key</Label>
                                    <Input
                                        className={styles.formInput}
                                        type="password"
                                        value={customModelKey}
                                        onChange={(e, data) => setCustomModelKey(data.value)}
                                        placeholder="sk-..."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Label className={styles.formLabel}>描述</Label>
                                    <Input
                                        className={styles.formInput}
                                        value={customModelDesc}
                                        onChange={(e, data) => setCustomModelDesc(data.value)}
                                        placeholder="可选描述"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <Button size="small" appearance="primary" onClick={handleAddCustomModel}>
                                        确认添加
                                    </Button>
                                    <Button size="small" appearance="secondary" onClick={() => setShowCustomForm(false)}>
                                        取消
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 插入设置区域 */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>插入设置</div>

                    <div className={styles.formGroup}>
                        <Label className={styles.formLabel}>公式默认字体</Label>
                        <Input
                            className={styles.formInput}
                            value={settings?.mathFormulaFont ?? ''}
                            onChange={(e, data) =>
                                handleChange('mathFormulaFont', data.value)
                            }
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
                            onOptionSelect={(e, data) =>
                                handleChange('mathFormulaFontSize', data.optionValue || '小四')
                            }
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
                <Button size="small" appearance="subtle" onClick={handleSave}>
                    保存
                </Button>
                <Button size="small" appearance="subtle" onClick={handleReset}>
                    重置
                </Button>
            </div>

            {/* 从内置模型添加的 Dialog */}
            <Dialog open={showAddDialog} onOpenChange={(_, data) => setShowAddDialog(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>从内置模型添加</DialogTitle>
                        <DialogContent>
                            <div className={styles.formGroup}>
                                <Label className={styles.formLabel}>选择模型</Label>
                                <Dropdown
                                    placeholder="选择一个模型"
                                    value={availableModels.find(m => m.id === selectedBuiltInModel)?.name || ''}
                                    onOptionSelect={(e, data) => setSelectedBuiltInModel(data.optionValue || '')}
                                    style={{ minWidth: '300px' }}
                                >
                                    {availableModels.map((model) => (
                                        <Option key={model.id} value={model.id}>
                                            {model.name}
                                        </Option>
                                    ))}
                                </Dropdown>
                            </div>
                        </DialogContent>
                        <DialogActions>
                            <DialogActionsTrigger disableButtonEnhancement>
                                <Button appearance="secondary">取消</Button>
                            </DialogActionsTrigger>
                            <Button appearance="primary" onClick={handleAddFromBuiltIn} disabled={!selectedBuiltInModel}>
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
                            <DialogActionsTrigger disableButtonEnhancement>
                                <Button appearance="secondary">取消</Button>
                            </DialogActionsTrigger>
                            <Button appearance="primary" onClick={handleSaveApiKey}>
                                保存
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
};

export default SettingsPanel;