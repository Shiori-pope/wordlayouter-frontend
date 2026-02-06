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
  Text,
} from '@fluentui/react-components';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';
import { authService } from '../services/authService';

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

interface UserInfo {
  email: string;
  isOfficeUser?: boolean;
  balance?: number;
  remainingTokens?: number;
  createdAt?: string;
}

interface SettingsPanelProps {
  onClose?: () => void;
  user?: UserInfo;
  onLogout?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, user, onLogout }) => {
  const styles = useStyles();
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  // Redeem / account
  const [cardCode, setCardCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState('');
  const [refreshLoading, setRefreshLoading] = useState(false);

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
  const handleRedeemCard = async (e?: React.FormEvent) => {
    e && e.preventDefault();
    if (!cardCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMessage('');
    try {
      const result = await authService.redeemCard(cardCode.trim());
      if (result.success) {
        setRedeemMessage(`成功兑换 ${result.tokensAdded || 0} Token!`);
        setCardCode('');
        // 尝试刷新 user info if provided
        try { await authService.refreshUserInfo(); } catch (_) {}
      } else {
        setRedeemMessage(result.error || '兑换失败');
      }
    } catch (err) {
      console.error('Redeem Error:', err);
      setRedeemMessage('兑换失败，请重试');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleRefreshInfo = async () => {
    setRefreshLoading(true);
    try {
      await authService.refreshUserInfo();
    } catch (err) {
      console.error('Refresh Error:', err);
    } finally {
      setRefreshLoading(false);
    }
  };

  const formatTokens = (tokens: number | undefined): string => {
    if (tokens === undefined || tokens === null) {
      return '0';
    }
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className={styles.root}>
      <h2>设置</h2>

      {/* Account / User Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>账户</div>
        <div className={styles.formGroup}>
          <Label className={styles.formLabel}>邮箱</Label>
          <div className={styles.formInput}>{user ? user.email : '未登录'}</div>
        </div>

        <div className={styles.formGroup}>
          <Label className={styles.formLabel}>账户类型</Label>
          <div className={styles.formInput}>{user?.isOfficeUser ? 'Office SSO' : '邮箱账户'}</div>
        </div>

        <div className={styles.formGroup}>
          <Label className={styles.formLabel}>剩余 Token</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>{formatTokens(user?.balance || user?.remainingTokens)}</Text>
            <Button appearance="subtle" onClick={handleRefreshInfo} disabled={refreshLoading}>{refreshLoading ? '⟳' : '刷新'}</Button>
          </div>
        </div>

        <div className="redeem-section" style={{ marginTop: 8 }}>
          <h4 style={{ margin: '8px 0' }}>卡密充值</h4>
          <form onSubmit={handleRedeemCard} className="redeem-form" style={{ display: 'flex', gap: 8 }}>
            <Input
              value={cardCode}
              onChange={(e, data) => setCardCode(data.value)}
              placeholder="输入卡密"
              disabled={redeemLoading}
            />
            <Button type="submit" disabled={redeemLoading || !cardCode.trim()} appearance="primary">
              {redeemLoading ? '兑换中...' : '兑换'}
            </Button>
          </form>
          {redeemMessage && (
            <div style={{ marginTop: 8, color: redeemMessage.includes('成功') ? '#107c10' : '#c53030' }}>{redeemMessage}</div>
          )}
        </div>
      </div>

      {/* Math Formula Settings */}
      <div className={styles.section} style={{ marginTop: 12 }}>
        <div className={styles.sectionTitle}>数学公式</div>

        <div className={styles.formGroup}>
          <Label className={styles.formLabel}>公式默认字体</Label>
          <Input
            className={styles.formInput}
            value={settings.mathFormulaFont}
            onChange={(e, data) =>
              handleChange('mathFormulaFont', data.value)
            }
            placeholder="建议使用 Cambria Math（Word 内置数学字体）"
          />
          <div style={{ fontSize: '11px', color: '#999' }}>
            默认使用 Word 的数学字体（Cambria Math）。如需更改可输入其它 Word 支持的字体。
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
        {onLogout && (
          <Button appearance="outline" onClick={onLogout}>退出登录</Button>
        )}
      </div>
    </div>
  );
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
