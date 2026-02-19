import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import LandingPage from './LandingPage';
import './landing.css';
import '../i18n'; // 导入i18n配置
import { HelmetProvider } from 'react-helmet-async';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <HelmetProvider>
            <LandingPage />
        </HelmetProvider>
    </React.StrictMode>
);
