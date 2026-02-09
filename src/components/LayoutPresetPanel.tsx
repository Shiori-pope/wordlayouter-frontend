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
  Spinner,
} from '@fluentui/react-components';
import {
  TextDescription24Regular,
  Add24Regular,
  Delete24Regular,
  Checkmark24Regular,
  Edit24Regular,
  ArrowReset24Regular,
  ChevronDown24Regular,
  ChevronRight24Regular,
} from '@fluentui/react-icons';
import {
  LayoutPreset,
  getAllPresets,
  getActivePreset,
  setActivePresetId,
  savePreset,
  deletePreset,
  BUILT_IN_PRESETS,
} from '../types/layoutPreset';
import { generateStylesFromDescription, GeneratedStyles } from '../services/deepseekService';
import { getActiveModel } from '../types/modelConfig';

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
    width: '280px',
    maxHeight: '350px',
    overflowY: 'auto',
    ...shorthands.padding('8px'),
  },
  popoverHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    paddingBottom: '6px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  presetItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('8px', '10px'),
    ...shorthands.borderRadius('6px'),
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': {
      background: tokens.colorNeutralBackground1Hover,
    },
  },
  presetItemActive: {
    background: 'rgba(102, 126, 234, 0.1)',
    ...shorthands.border('1px', 'solid', 'rgba(102, 126, 234, 0.3)'),
  },
  presetName: {
    fontSize: '13px',
    fontWeight: '500',
  },
  presetActions: {
    display: 'flex',
    ...shorthands.gap('2px'),
  },
  actionBtn: {
    minWidth: '24px',
    width: '24px',
    height: '24px',
    ...shorthands.padding('0'),
  },
  formField: {
    marginBottom: '12px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: tokens.colorNeutralForeground2,
  },
  formatTextarea: {
    width: '100%',
    minHeight: '150px',
    maxHeight: '300px',
    fontFamily: 'inherit',
    fontSize: '12px',
    lineHeight: '1.5',
    boxSizing: 'border-box',
  },
  formatHint: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginTop: '4px',
  },
  generateBtn: {
    marginTop: '8px',
  },
  previewSection: {
    marginTop: '12px',
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    paddingTop: '12px',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    ...shorthands.gap('4px'),
    marginBottom: '8px',
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
    fontWeight: '500',
  },
  previewContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  previewBox: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('8px'),
    maxHeight: '150px',
    overflowY: 'auto',
  },
  previewBoxLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: tokens.colorNeutralForeground2,
    marginBottom: '4px',
  },
  previewBoxContent: {
    fontFamily: 'Consolas, monospace',
    fontSize: '11px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: tokens.colorNeutralForeground1,
  },
});

interface LayoutPresetPanelProps {
  onPresetChange?: (preset: LayoutPreset | null) => void;
}

const LayoutPresetPanel: React.FC<LayoutPresetPanelProps> = ({ onPresetChange }) => {
  const styles = useStyles();
  const [presets, setPresets] = useState<LayoutPreset[]>([]);
  const [activePreset, setActivePreset] = useState<LayoutPreset | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<LayoutPreset | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCssStyles, setFormCssStyles] = useState('');
  const [formClassRules, setFormClassRules] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    const allPresets = getAllPresets();
    setPresets(allPresets);
    const active = getActivePreset();
    setActivePreset(active);
  };

  const handleSelectPreset = (preset: LayoutPreset | null) => {
    setActivePresetId(preset?.id || null);
    setActivePreset(preset);
    onPresetChange?.(preset);
    setIsOpen(false);
  };

  const handleCreatePreset = () => {
    setEditingPreset(null);
    setFormName('');
    setFormDescription('');
    setFormCssStyles('');
    setFormClassRules('');
    setShowPreview(false);
    setGenerateError(null);
    setIsDialogOpen(true);
  };

  const handleEditPreset = (preset: LayoutPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPreset(preset);
    setFormName(preset.name);
    setFormDescription(preset.formatDescription);
    setFormCssStyles(preset.cssStyles || '');
    setFormClassRules(preset.classRules || '');
    setShowPreview(!!(preset.cssStyles || preset.classRules));
    setGenerateError(null);
    setIsDialogOpen(true);
  };

  const handleDeletePreset = (preset: LayoutPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePreset(preset.id);
    if (activePreset?.id === preset.id) {
      handleSelectPreset(null);
    }
    loadPresets();
  };

  const handleResetPreset = (preset: LayoutPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const original = BUILT_IN_PRESETS.find(p => p.id === preset.id);
    if (original) {
      deletePreset(preset.id);
      loadPresets();
    }
  };

  const handleSavePreset = () => {
    const newPreset: LayoutPreset = {
      id: editingPreset?.id || `custom-${Date.now()}`,
      name: formName,
      formatDescription: formDescription,
      cssStyles: formCssStyles || undefined,
      classRules: formClassRules || undefined,
      isBuiltIn: editingPreset?.isBuiltIn || false,
    };
    savePreset(newPreset);
    loadPresets();
    setIsDialogOpen(false);

    if (activePreset?.id === newPreset.id) {
      setActivePreset(newPreset);
      onPresetChange?.(newPreset);
    }
  };

  const handleGenerateStyles = async () => {
    if (!formDescription.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const model = getActiveModel();
      const result: GeneratedStyles = await generateStylesFromDescription(formDescription, model);
      setFormCssStyles(result.cssStyles);
      setFormClassRules(result.classRules);
      setShowPreview(true);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const isPresetModified = (preset: LayoutPreset): boolean => {
    if (!preset.isBuiltIn) return false;
    const original = BUILT_IN_PRESETS.find(p => p.id === preset.id);
    if (!original) return false;

    return original.name !== preset.name ||
           original.formatDescription !== preset.formatDescription ||
           original.cssStyles !== preset.cssStyles ||
           original.classRules !== preset.classRules;
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={(_, data) => setIsOpen(data.open)}>
        <PopoverTrigger disableButtonEnhancement>
          <Button
            className={styles.triggerBtn}
            icon={<TextDescription24Regular style={{ width: 16, height: 16 }} />}
            size="small"
            appearance="subtle"
          >
            {activePreset?.name || '版式'}
          </Button>
        </PopoverTrigger>
        <PopoverSurface>
          <div className={styles.popoverContent}>
            <div className={styles.popoverHeader}>
              <Text size={200} weight="semibold">版式预设</Text>
              <Button
                icon={<Add24Regular />}
                size="small"
                appearance="subtle"
                onClick={handleCreatePreset}
              />
            </div>

            <div
              className={`${styles.presetItem} ${!activePreset ? styles.presetItemActive : ''}`}
              onClick={() => handleSelectPreset(null)}
            >
              <span className={styles.presetName}>无版式</span>
              {!activePreset && <Checkmark24Regular style={{ width: 16, height: 16, color: '#667eea' }} />}
            </div>

            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`${styles.presetItem} ${activePreset?.id === preset.id ? styles.presetItemActive : ''}`}
                onClick={() => handleSelectPreset(preset)}
              >
                <span className={styles.presetName}>
                  {preset.name}
                  {isPresetModified(preset) && <span style={{ color: '#667eea', marginLeft: 4 }}>*</span>}
                </span>
                <div className={styles.presetActions}>
                  {activePreset?.id === preset.id && (
                    <Checkmark24Regular style={{ width: 16, height: 16, color: '#667eea' }} />
                  )}
                  <Button
                    className={styles.actionBtn}
                    icon={<Edit24Regular style={{ width: 14, height: 14 }} />}
                    size="small"
                    appearance="subtle"
                    onClick={(e) => handleEditPreset(preset, e)}
                  />
                  {preset.isBuiltIn ? (
                    <Button
                      className={styles.actionBtn}
                      icon={<ArrowReset24Regular style={{ width: 14, height: 14 }} />}
                      size="small"
                      appearance="subtle"
                      onClick={(e) => handleResetPreset(preset, e)}
                      title="重置为默认"
                    />
                  ) : (
                    <Button
                      className={styles.actionBtn}
                      icon={<Delete24Regular style={{ width: 14, height: 14 }} />}
                      size="small"
                      appearance="subtle"
                      onClick={(e) => handleDeletePreset(preset, e)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </PopoverSurface>
      </Popover>

      <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '550px' }}>
          <DialogBody>
            <DialogTitle>{editingPreset ? '编辑版式预设' : '新建版式预设'}</DialogTitle>
            <DialogContent>
              <div className={styles.formField}>
                <label className={styles.formLabel}>预设名称</label>
                <Input
                  value={formName}
                  onChange={(_, data) => setFormName(data.value)}
                  placeholder="如：我的论文格式"
                  style={{ width: '100%' }}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>排版要求（自然语言描述）</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={`用自然语言描述你想要的排版格式，例如：

正文使用宋体小四号字，首行缩进2字符，1.5倍行距。
一级标题黑体三号居中，二级标题黑体四号左对齐。
段落间距段前0.5行段后0.5行。
代码块使用等宽字体，灰色背景。`}
                  style={{
                    width: '100%',
                    height: '120px',
                    padding: '8px 12px',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <Button
                    className={styles.generateBtn}
                    appearance="secondary"
                    onClick={handleGenerateStyles}
                    disabled={!formDescription.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Spinner size="tiny" style={{ marginRight: '6px' }} />
                        生成中...
                      </>
                    ) : (
                      '生成样式'
                    )}
                  </Button>
                  {generateError && (
                    <Text style={{ color: '#dc2626', fontSize: '12px' }}>{generateError}</Text>
                  )}
                </div>
              </div>

              {(formCssStyles || formClassRules) && (
                <div className={styles.previewSection}>
                  <div
                    className={styles.previewHeader}
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? (
                      <ChevronDown24Regular style={{ width: 16, height: 16 }} />
                    ) : (
                      <ChevronRight24Regular style={{ width: 16, height: 16 }} />
                    )}
                    <span>查看生成的样式</span>
                  </div>

                  {showPreview && (
                    <div className={styles.previewContent}>
                      {formCssStyles && (
                        <div>
                          <div className={styles.previewBoxLabel}>CSS 样式</div>
                          <div className={styles.previewBox}>
                            <div className={styles.previewBoxContent}>{formCssStyles}</div>
                          </div>
                        </div>
                      )}
                      {formClassRules && (
                        <div>
                          <div className={styles.previewBoxLabel}>Class 规范</div>
                          <div className={styles.previewBox}>
                            <div className={styles.previewBoxContent}>{formClassRules}</div>
                          </div>
                        </div>
                      )}
                    </div>
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
                onClick={handleSavePreset}
                disabled={!formName.trim() || !formDescription.trim()}
              >
                保存
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default LayoutPresetPanel;
