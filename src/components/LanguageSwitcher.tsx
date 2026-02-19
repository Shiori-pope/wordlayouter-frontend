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
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      gap: '10px'
    }}>
      <button
        onClick={() => changeLanguage('zh')}
        style={{
          padding: '8px 12px',
          background: i18n.language === 'zh' ? '#4f46e5' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        中文
      </button>
      <button
        onClick={() => changeLanguage('en')}
        style={{
          padding: '8px 12px',
          background: i18n.language === 'en' ? '#4f46e5' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        English
      </button>
      <button
        onClick={() => changeLanguage('ja')}
        style={{
          padding: '8px 12px',
          background: i18n.language === 'ja' ? '#4f46e5' : 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        日本語
      </button>
    </div>
  );
};

export default LanguageSwitcher;