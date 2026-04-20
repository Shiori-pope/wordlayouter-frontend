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
  DialogContent,
  DialogActions,
  DialogTrigger as DialogActionsTrigger,
} from '@fluentui/react-components';
import {
  Bot24Regular,
  Settings24Regular,
  Checkmark24Regular,
} from '@fluentui/react-icons';
import {
  ModelConfig,
  getUserAddedModels,
  getActiveModel,
  setActiveModelId,
  getApiKey,
  saveApiKey,
  hasApiKey,
} from '../types/modelConfig';

const useStyles = makeStyles({
  triggerBtn: {
    minWidth: 'auto',
    maxWidth: '120px',
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
    width: '180px',
    maxHeight: '300px',
    overflowY: 'auto',
    ...shorthands.padding('8px'),
  },
  modelItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('8px', '10px'),
    ...shorthands.borderRadius('6px'),
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    fontSize: '13px',
    ':hover': {
      background: tokens.colorNeutralBackground1Hover,
    },
  },
  modelItemActive: {
    background: 'rgba(102, 126, 234, 0.1)',
    fontWeight: '500',
  },
  modelName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyText: {
    fontSize: '12px',
    color: '#888',
    textAlign: 'center',
    padding: '16px',
  },
  emptyLink: {
    fontSize: '12px',
    color: '#667eea',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginTop: '8px',
    display: 'inline-block',
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
});

interface ModelSelectorProps {
  onModelChange?: (model: ModelConfig) => void;
  onOpenSettings?: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, onOpenSettings }) => {
  const styles = useStyles();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [activeModel, setActiveModel] = useState<ModelConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    loadModels();

    // 监听模型列表更新事件
    const handleModelsUpdated = () => {
      loadModels();
    };
    window.addEventListener('models-updated', handleModelsUpdated);

    return () => {
      window.removeEventListener('models-updated', handleModelsUpdated);
    };
  }, []);

  const loadModels = () => {
    const userModels = getUserAddedModels();
    setModels(userModels);
    const active = getActiveModel();
    // 如果当前激活的模型不在用户列表中，设为 null
    if (userModels.find(m => m.id === active.id)) {
      setActiveModel(active);
    } else {
      setActiveModel(userModels.length > 0 ? userModels[0] : null);
      if (userModels.length > 0) {
        setActiveModelId(userModels[0].id);
      }
    }
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
      // 如果是首次配置且有输入，自动选择该模型
      if (!hasApiKey(editingModel) && apiKeyInput) {
        setActiveModelId(editingModel.id);
        setActiveModel(editingModel);
        onModelChange?.(editingModel);
      }
      loadModels();
    }
    setIsKeyDialogOpen(false);
  };

  const handleOpenSettings = () => {
    setIsOpen(false);
    onOpenSettings?.();
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
            {activeModel?.name || '选择模型'}
          </Button>
        </PopoverTrigger>
        <PopoverSurface>
          <div className={styles.popoverContent}>
            {models.length === 0 ? (
              <div className={styles.emptyText}>
                尚未添加模型
                <br />
                <span className={styles.emptyLink} onClick={handleOpenSettings}>
                  去设置页面添加
                </span>
              </div>
            ) : (
              models.map((model) => {
                const isActive = activeModel?.id === model.id;

                return (
                  <div
                    key={model.id}
                    className={`${styles.modelItem} ${isActive ? styles.modelItemActive : ''}`}
                    onClick={() => handleSelectModel(model)}
                  >
                    <Text style={{ fontSize: '10px', color: isActive ? '#667eea' : '#ccc' }}>
                      {isActive ? '●' : '○'}
                    </Text>
                    <span className={styles.modelName}>{model.name}</span>
                    {isActive && <Checkmark24Regular style={{ width: 14, height: 14, color: '#667eea' }} />}
                    {model.apiKeyStorageKey && (
                      <Button
                        icon={<Settings24Regular style={{ width: 12, height: 12 }} />}
                        size="small"
                        appearance="subtle"
                        onClick={(e) => handleConfigureKey(model, e)}
                        style={{ minWidth: 20, width: 20, height: 20 }}
                      />
                    )}
                  </div>
                );
              })
            )}
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
    </>
  );
};

export default ModelSelector;