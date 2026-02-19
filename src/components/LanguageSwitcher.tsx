import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  };

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '16px',
      zIndex: 99,
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      maxWidth: 'calc(100% - 32px)'
    }}>
      <button
        onClick={() => changeLanguage('zh')}
        style={{
          padding: '6px 10px',
          background: i18n.language === 'zh' ? '#4f46e5' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
          fontWeight: 500,
          transition: 'all 0.3s'
        }}
      >
        中文
      </button>
      <button
        onClick={() => changeLanguage('en')}
        style={{
          padding: '6px 10px',
          background: i18n.language === 'en' ? '#4f46e5' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
          fontWeight: 500,
          transition: 'all 0.3s'
        }}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('ja')}
        style={{
          padding: '6px 10px',
          background: i18n.language === 'ja' ? '#4f46e5' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
          fontWeight: 500,
          transition: 'all 0.3s'
        }}
      >
        日本語
      </button>
    </div>
  );
};

export default LanguageSwitcher;