// MSAL Redirect Handler - 处理Microsoft登录回调
// 注意：对于popup模式，这个页面只需要存在即可
// MSAL会自动检测URL中的token信息并关闭窗口

import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../services/msalConfig';

// Popup模式下，MSAL会自动处理
// 这个页面只需要初始化MSAL实例并调用handleRedirectPromise
async function handleAuth() {
  try {
    console.log('🔧 Redirect页面加载，初始化MSAL...');
    
    // 覆盖 redirectUri 为当前页面，虽然对于 handleRedirectPromise 来说通常不是必须的
    // 但保持一致是个习惯
    const config = { ...msalConfig };
    config.auth.redirectUri = new URL('redirect.html', window.location.href).href;
    config.auth.navigateToLoginRequestUrl = false;

    const msalInstance = new PublicClientApplication(config);
    await msalInstance.initialize();
    
    console.log('🔄 调用 handleRedirectPromise...');
    const response = await msalInstance.handleRedirectPromise();
    
    if (response) {
      console.log('✅ 收到认证响应，popup模式会自动关闭');
      // Popup模式下窗口会自动关闭，但以防万一：
      if (window.opener) {
        window.close();
      }
    } else {
      console.log('ℹ️ 没有认证响应（可能是popup模式，主窗口处理）');
      // Popup模式下，如果没有响应，窗口可能会保持打开
      // 显示等待消息
      setTimeout(() => {
        if (!window.closed) {
          document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: 'Segoe UI', sans-serif;">
              <h2 style="color: #333;">登录处理中...</h2>
              <p style="color: #666;">如果此窗口没有自动关闭，请手动关闭并重试。</p>
              <button onclick="window.close()" style="
                margin-top: 20px;
                padding: 12px 24px;
                background: #0078d4;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
              ">关闭窗口</button>
            </div>
          `;
        }
      }, 3000);
    }
  } catch (error: any) {
    console.error('❌ Redirect处理错误:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #d32f2f; font-family: 'Segoe UI', sans-serif;">
        <h2>登录失败</h2>
        <p>${error.message || error.errorCode || '未知错误'}</p>
        <button onclick="window.close()" style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">关闭</button>
      </div>
    `;
  }
}

handleAuth();
