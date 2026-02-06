// MsalWrapper - 照搬 word-login-sample 的标准方案 (同步初始化)
import React from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from '../services/msalConfig';
import App from './App';

// 同步创建 MSAL 实例 - 这是关键的区别
// 之前使用 createNestablePublicClientApplication (异步) 会导致各种问题
// 标准的 PublicClientApplication 更加稳定
const msalInstance = new PublicClientApplication(msalConfig);

const MsalProviderWrapper: React.FC = () => {
    return (
        <MsalProvider instance={msalInstance}>
            <App />
        </MsalProvider>
    );
};

// 导出 MSAL 实例供其他模块使用
export { msalInstance };
export default MsalProviderWrapper;
