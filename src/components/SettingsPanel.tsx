import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  shorthands,
  Button,
  Input,
  Label,
  Spinner,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    ...shorthands.padding('16px'),
    background: '#ffffff',
    borderRadius: '4px',
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
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '8px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#555',
  },
  formInput: {
    fontSize: '12px',
  },
  buttonGroup: {
    display: 'flex',
    ...shorthands.gap('8px'),
    marginTop: '16px',
  },
  successMessage: {
    fontSize: '12px',
    color: '#107c10',
    padding: '8px',
    backgroundColor: '#f0f8f0',
    borderRadius: '4px',
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

  useEffect(() => {
    // 加载设置
    const loaded = getSettings();
    setSettings(loaded);
    setLoading(false);
  }, []);

  const handleChange = (key: keyof PluginSettings, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        [key]: value,
      });
      setSaved(false);
    }
  };

  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  if (loading || !settings) {
    return <Spinner label="加载设置中..." />;
  }

  return (
    <div className={styles.root}>
      <h2>插件设置</h2>

      {/* 数学公式设置 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>数学公式</div>

        <div className={styles.formGroup}>
          <Label className={styles.formLabel}>公式默认字体</Label>
          <Input
            className={styles.formInput}
            value={settings.mathFormulaFont}
            onChange={(e, data) =>
              handleChange('mathFormulaFont', data.value)
            }
            placeholder="输入字体名称，如：宋体、微软雅黑、Times New Roman"
          />
          <div style={{ fontSize: '11px', color: '#999' }}>
            输入任意 Word 支持的字体名称。常用字体：宋体、黑体、微软雅黑、Times New Roman、Arial
          </div>
        </div>

        <div className={styles.formGroup}>
          <Label className={styles.formLabel}>公式默认字号</Label>
          <Dropdown
            className={styles.formInput}
            value={settings.mathFormulaFontSize}
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
          <div style={{ fontSize: '11px', color: '#999' }}>
            选择 Word 标准字号
          </div>
        </div>
      </div>

      {/* 保存提示 */}
      {saved && <div className={styles.successMessage}>✓ 设置已保存</div>}

      {/* 按钮组 */}
      <div className={styles.buttonGroup}>
        <Button appearance="primary" onClick={handleSave}>
          保存设置
        </Button>
        <Button appearance="secondary" onClick={handleReset}>
          重置为默认
        </Button>
        {onClose && (
          <Button appearance="secondary" onClick={onClose}>
            关闭
          </Button>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
