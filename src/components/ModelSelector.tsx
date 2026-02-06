import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Button,
  Text,
  makeStyles,
  shorthands,
  tokens,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Input,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Badge,
} from '@fluentui/react-components';
import {
  Bot24Regular,
  Image24Regular,
  Key24Regular,
  Checkmark24Regular,
  Settings24Regular,
} from '@fluentui/react-icons';
import {
  ModelConfig,
  getAllModels,
  getActiveModel,
  setActiveModelId,
  getApiKey,
  saveApiKey,
  hasApiKey,
} from '../types/modelConfig';

const useStyles = makeStyles({
  triggerBtn: {
    minWidth: 'auto',
    maxWidth: '100px',
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius('4px'),
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ':hover': {
      background: tokens.colorNeutralBackground1Hover,
    },
  },
  popoverContent: {
    width: '320px',
    maxHeight: '450px',
    overflowY: 'auto',
    ...shorthands.padding('12px'),
  },
  popoverHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    paddingBottom: '8px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  modelCard: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('8px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: tokens.colorNeutralBackground1Hover,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
  },
  modelCardActive: {
    ...shorthands.border('2px', 'solid', '#667eea'),
    background: 'rgba(102, 126, 234, 0.05)',
  },
  modelCardDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  modelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  modelName: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    fontWeight: '600',
  },
  modelBadges: {
    display: 'flex',
    ...shorthands.gap('4px'),
  },
  modelDescription: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginBottom: '4px',
  },
  modelStatus: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    fontSize: '11px',
  },
  statusOk: {
    color: '#22c55e',
  },
  statusError: {
    color: '#ef4444',
  },
  formField: {
    marginBottom: '12px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  providerSection: {
    marginBottom: '16px',
  },
  providerTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
  },
});

interface ModelSelectorProps {
  onModelChange?: (model: ModelConfig) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange }) => {
  const styles = useStyles();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = () => {
    const allModels = getAllModels();
    setModels(allModels);
    const active = getActiveModel();
    setActiveModel(active);
  };

  const handleSelectModel = (model: ModelConfig) => {
    // 检查是否有 API Key
    if (model.apiKeyStorageKey && !hasApiKey(model)) {
      setEditingModel(model);
      setApiKeyInput('');
      setIsKeyDialogOpen(true);
      return;
    }

    setActiveModelId(model.id);
    setActiveModel(model);
    onModelChange?.(model);
    setIsOpen(false);
  };

  const handleConfigureKey = (model: ModelConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModel(model);
    setApiKeyInput(model.apiKeyStorageKey ? getApiKey(model.apiKeyStorageKey) : '');
    setIsKeyDialogOpen(true);
  };

  const handleSaveApiKey = () => {
    if (editingModel?.apiKeyStorageKey) {
      saveApiKey(editingModel.apiKeyStorageKey, apiKeyInput);
      // 如果是首次配置，自动选择该模型
      if (!hasApiKey(editingModel) && apiKeyInput) {
        setActiveModelId(editingModel.id);
        setActiveModel(editingModel);
        onModelChange?.(editingModel);
      }
      loadModels();
    }
    setIsKeyDialogOpen(false);
  };

  // 按 provider 分组
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.provider;
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, ModelConfig[]>);

  const providerNames: Record<string, string> = {
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    custom: '自定义',
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={(_, data) => setIsOpen(data.open)}>
        <PopoverTrigger disableButtonEnhancement>
          <Button
            className={styles.triggerBtn}
            icon={<Bot24Regular style={{ width: 16, height: 16 }} />}
            size="small"
            appearance="subtle"
          >
            {activeModel?.name || '模型'}
          </Button>
        </PopoverTrigger>
        <PopoverSurface>
          <div className={styles.popoverContent}>
            <div className={styles.popoverHeader}>
              <Text weight="semibold">选择模型</Text>
            </div>

            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className={styles.providerSection}>
                <Text className={styles.providerTitle}>{providerNames[provider] || provider}</Text>
                {providerModels.map((model) => {
                  const hasKey = !model.apiKeyStorageKey || hasApiKey(model);
                  const isActive = activeModel?.id === model.id;

                  return (
                    <div
                      key={model.id}
                      className={`${styles.modelCard} ${isActive ? styles.modelCardActive : ''}`}
                      onClick={() => handleSelectModel(model)}
                    >
                      <div className={styles.modelHeader}>
                        <div className={styles.modelName}>
                          <span>{model.name}</span>
                          <div className={styles.modelBadges}>
                            {model.supportsVision && (
                              <Badge appearance="outline" size="small" color="informative">
                                <Image24Regular style={{ width: 12, height: 12 }} />
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isActive && <Checkmark24Regular style={{ color: '#667eea' }} />}
                          <Button
                            icon={<Key24Regular />}
                            size="small"
                            appearance="subtle"
                            onClick={(e) => handleConfigureKey(model, e)}
                          />
                        </div>
                      </div>
                      <Text className={styles.modelDescription}>{model.description}</Text>
                      <div className={styles.modelStatus}>
                        {hasKey ? (
                          <span className={styles.statusOk}>API Key 已配置</span>
                        ) : (
                          <span className={styles.statusError}>需要配置 API Key</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </PopoverSurface>
      </Popover>

      {/* API Key 配置对话框 */}
      <Dialog open={isKeyDialogOpen} onOpenChange={(_, data) => setIsKeyDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>配置 API Key</DialogTitle>
            <DialogContent>
              <Text style={{ marginBottom: '12px', display: 'block' }}>
                为 {editingModel?.name} 配置 API Key
              </Text>
              <div className={styles.formField}>
                <label className={styles.formLabel}>API Key</label>
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(_, data) => setApiKeyInput(data.value)}
                  placeholder="sk-..."
                  style={{ width: '100%' }}
                />
              </div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                API Key 将安全存储在本地浏览器中
              </Text>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">取消</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleSaveApiKey}>
                保存
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default ModelSelector;
