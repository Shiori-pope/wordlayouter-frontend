// MSAL 配置 - 照搬 word-login-sample 的标准方案
import { LogLevel, Configuration } from "@azure/msal-browser";

const AZURE_CLIENT_ID = process.env.REACT_APP_AZURE_CLIENT_ID || 'aa584c91-54b8-4109-a3ad-635b43cf5478';
const PUBLIC_URL = process.env.REACT_APP_PUBLIC_URL || window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    // 关键：Office Add-in 使用专门的 redirect 页面
    redirectUri: `${PUBLIC_URL}/office-auth-redirect.html`,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        const logFn = {
          [LogLevel.Error]: console.error,
          [LogLevel.Warning]: console.warn,
          [LogLevel.Info]: console.info,
          [LogLevel.Verbose]: console.debug,
          [LogLevel.Trace]: console.trace,
        }[level];
        logFn?.(message);
      }
    }
  }
};

// 登录请求 - idToken 需要 openid scope
export const loginRequest = { 
  scopes: ['openid', 'profile', 'email', 'User.Read'] 
};

// Microsoft Graph API 配置
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};
