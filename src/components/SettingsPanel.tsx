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
        ...shorthands.gap('20px'),
        background: '#ffffff',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('24px'),
    },
    accountGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        ...shorthands.gap('16px', '24px'),
        alignItems: 'end',
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
    infoValue: {
        fontSize: '13px',
        color: '#333',
    },
    tokenValue: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#107c10', // Green
    },
    logoutText: {
        color: '#d13438', // Red
        cursor: 'pointer',
        fontSize: '12px',
        textDecoration: 'none',
        ':hover': {
            textDecoration: 'underline',
        },
        marginTop: '4px',
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
                try { await authService.refreshUserInfo(); } catch (_) { }
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
            <div className={styles.content}>
                {/* Account info section - internal grid */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>账户</div>

                    <div className={styles.accountGrid}>
                        <div className={styles.formGroup}>
                            <Label className={styles.formLabel}>邮箱</Label>
                            <div className={styles.infoValue}>{user ? user.email : '未登录'}</div>
                        </div>

                        <div className={styles.formGroup}>
                            <Label className={styles.formLabel}>账户类型</Label>
                            <div className={styles.infoValue}>{user?.isOfficeUser ? 'Office SSO' : '邮箱账户'}</div>
                        </div>

                        <div className={styles.formGroup}>
                            <Label className={styles.formLabel}>剩余 Token</Label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text className={styles.tokenValue}>{formatTokens(user?.balance || user?.remainingTokens)}</Text>
                                <Button appearance="subtle" size="small" onClick={handleRefreshInfo} disabled={refreshLoading}>
                                    {refreshLoading ? <Spinner size="tiny" /> : '刷新'}
                                </Button>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <Label className={styles.formLabel}>操作</Label>
                            {onLogout && (
                                <div className={styles.logoutText} onClick={onLogout}>
                                    退出登录
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="redeem-section" style={{ marginTop: 8 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>卡密充值</h4>
                        <div className="redeem-form" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Input
                                style={{ flex: 1 }}
                                size="small"
                                value={cardCode}
                                onChange={(e, data) => setCardCode(data.value)}
                                placeholder="输入卡密"
                                disabled={redeemLoading}
                            />
                            <Button
                                size="small"
                                type="button"
                                onClick={handleRedeemCard}
                                disabled={redeemLoading || !cardCode.trim()}
                                appearance="primary"
                            >
                                {redeemLoading ? '兑换中...' : '兑换'}
                            </Button>
                            {redeemMessage && (
                                <div style={{ fontSize: '11px', color: redeemMessage.includes('成功') ? '#107c10' : '#c53030' }}>
                                    {redeemMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
            </div>
        </div>
    );
};

export default SettingsPanel;
