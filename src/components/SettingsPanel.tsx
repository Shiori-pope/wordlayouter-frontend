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
} from '@fluentui/react-components';
import { getSettings, saveSettings, resetSettings, PluginSettings } from '../types/settings';
import { WORD_FONT_SIZES } from '../types/wordFonts';

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

    if (loading) {
        return <div>加载中...</div>;
    }

    return (
        <div className={styles.root}>
            <div className={styles.content}>
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
        </div>
    );
};

export default SettingsPanel;
