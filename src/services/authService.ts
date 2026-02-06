// Office Add-in 认证服务 - 使用标准 MSAL (照搬 word-login-sample 方案)
import { 
  InteractionRequiredAuthError,
  IPublicClientApplication
} from '@azure/msal-browser';
import { msalInstance } from '../taskpane/MsalWrapper';
import { msalConfig, loginRequest, graphConfig } from './msalConfig';

export interface UserInfo {
  oid: string;
  email: string;
  name: string;
  balance: number;
  totalUsed: number;
  authType: 'sso' | 'email';
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserInfo;
  error?: string;
}

export interface RedeemResponse {
  success: boolean;
  tokens?: number;
  tokensAdded?: number;
  newBalance?: number;
  error?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user?: UserInfo;
}

// API 基础地址 - 从环境变量读取
const API_BASE = (process.env.REACT_APP_API_BASE || 'http://localhost:3001') + '/api';

// Azure AD 配置 - 从环境变量读取
const AZURE_CLIENT_ID = process.env.REACT_APP_AZURE_CLIENT_ID || 'aa584c91-54b8-4109-a3ad-635b43cf5478';
const AZURE_TENANT_ID = process.env.REACT_APP_AZURE_TENANT_ID || '2cd5468c-1faa-4ddc-96ee-1f4a51a21c86';
const PUBLIC_URL = process.env.REACT_APP_PUBLIC_URL || window.location.origin;

// 导出 msalConfig 供其他模块使用 (兼容层)
export const config = msalConfig;

// Microsoft Graph API权限（按需请求）
const graphRequest = {
  scopes: ['User.Read'],
};

/**
 * 获取 MSAL 实例 - 直接使用 MsalWrapper 中同步创建的实例
 */
function getMsalInstance(): IPublicClientApplication {
  return msalInstance;
}

/**
 * 获取存储的认证 Token
 * 优先从 Office.context.roamingSettings 读取（持久化），回退到 localStorage
 */
function getStoredToken(): string | null {
  // 优先从 Office roamingSettings 读取，但不要因为 roamingSettings 抛错而放弃 localStorage
  try {
    if (typeof Office !== 'undefined' && Office.context?.roamingSettings) {
      try {
        const token = Office.context.roamingSettings.get('wordai_auth_token');
        if (token) return token;
      } catch (err) {
        console.warn('Office roamingSettings.get 失败，回退到 localStorage', err);
      }
    }
  } catch (err) {
    console.warn('读取 Office roamingSettings 时发生错误，继续尝试 localStorage', err);
  }

  try {
    return localStorage.getItem('wordai_auth_token');
  } catch (err) {
    console.error('读取 localStorage 失败:', err);
    return null;
  }
}

/**
 * 存储认证 Token
 * 同时存储到 Office.context.roamingSettings 和 localStorage
 */
function storeToken(token: string): void {
  try {
    // 先写入 localStorage（同步），以确保刷新时可用
    try {
      localStorage.setItem('wordai_auth_token', token);
    } catch (err) {
      console.warn('写入 localStorage 失败:', err);
    }

    // 再尝试写入 Office roamingSettings（异步），但不应阻塞主流程
    if (typeof Office !== 'undefined' && Office.context?.roamingSettings) {
      try {
        Office.context.roamingSettings.set('wordai_auth_token', token);
        Office.context.roamingSettings.saveAsync((result) => {
          if (result.status === Office.AsyncResultStatus.Failed) {
            console.error('Office roamingSettings 保存失败:', result.error?.message);
          } else {
            console.log('✅ Token 已保存到 Office roamingSettings');
          }
        });
      } catch (err) {
        console.warn('保存到 Office roamingSettings 失败:', err);
      }
    }
  } catch (error) {
    console.error('存储 Token 失败:', error);
  }
}

/**
 * 清除认证信息
 */
function clearAuth(): void {
  try {
    // 移除 localStorage 中的认证信息（优先）
    try {
      localStorage.removeItem('wordai_auth_token');
      localStorage.removeItem('wordai_user_info');
    } catch (err) {
      console.warn('清除 localStorage 认证信息失败:', err);
    }

    // 再尝试清除 Office roamingSettings（若可用）
    if (typeof Office !== 'undefined' && Office.context?.roamingSettings) {
      try {
        Office.context.roamingSettings.remove('wordai_auth_token');
        Office.context.roamingSettings.saveAsync();
      } catch (err) {
        console.warn('清除 Office roamingSettings 失败:', err);
      }
    }

    // 清除 MSAL 缓存（以包含 msal 前缀的 localStorage 键为准）
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('msal')) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.warn('清除 MSAL 本地缓存失败:', err);
    }
  } catch (error) {
    console.error('清除认证信息失败:', error);
  }
}

/**
 * API 请求封装
 */
async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getStoredToken();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token 无效，清除认证信息
    clearAuth();
    throw new Error('认证已过期，请重新登录');
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  
  return data;
}

/**
 * Office SSO 获取 ID Token
 * 
 * 使用标准 MSAL 方案 (照搬 word-login-sample)
 * 注意：发送给后端的是 idToken（身份令牌），不是 accessToken
 * 
 * 流程：
 * 1. 尝试 acquireTokenSilent 利用缓存的账户
 * 2. 如果失败，使用 loginPopup 进行交互式登录
 */
export async function getOfficeIdToken(): Promise<string> {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();
    
    console.log('🔐 获取 Microsoft ID Token...');
    console.log(`[Auth] Cached accounts: ${accounts.length}`);

    // 场景 1: 有缓存账户，尝试静默获取
    if (accounts.length > 0) {
      try {
        console.log('[Auth] Trying acquireTokenSilent with cached account...');
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        console.log('✅ 静默获取令牌成功:', response.account?.username);
        // 关键：返回 idToken 而非 accessToken
        return response.idToken;
      } catch (silentError: any) {
        console.log('[Auth] Silent acquisition failed:', silentError.message);
        // 静默失败，继续尝试交互式
      }
    }
    
    // 场景 2: 交互式登录 (Popup)
    console.log('[Auth] Trying loginPopup...');
    try {
      const response = await instance.loginPopup(loginRequest);
      console.log('✅ Popup登录成功:', response.account?.username);
      // 关键：返回 idToken 而非 accessToken
      return response.idToken;
    } catch (popupError: any) {
      console.error('[Auth] Popup failed:', popupError);
      throw popupError;
    }
    
  } catch (error: any) {
    console.error('❌ 获取令牌失败:', error);
    
    const errorCode = error.errorCode || '';
    const errorMsg = error.message || '';
    
    if (errorCode === 'popup_window_error') {
      throw new Error('弹出窗口被阻止，请允许弹出窗口后重试');
    } else if (errorCode === 'user_cancelled' || errorCode === 'user_canceled') {
      throw new Error('用户取消了登录');
    } else if (errorCode === 'interaction_in_progress') {
      throw new Error('已有登录窗口打开，请完成登录');
    } else {
      throw new Error(`Microsoft 登录失败: ${errorCode || errorMsg || '请使用邮箱登录'}`);
    }
  }
}

/**
 * 获取Microsoft Graph用户信息（演示增量权限请求）
 */
export async function getUserProfile(): Promise<any> {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();
    
    if (accounts.length === 0) {
      throw new Error('未登录');
    }
    
    // 尝试无提示获取Graph权限
    let tokenResponse;
    try {
      tokenResponse = await instance.acquireTokenSilent({
        ...graphRequest,
        account: accounts[0],
      });
    } catch (error) {
      // 需要用户同意新权限
      if (error instanceof InteractionRequiredAuthError) {
        tokenResponse = await instance.acquireTokenPopup(graphRequest);
      } else {
        throw error;
      }
    }
    
    // 调用Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

/**
 * 使用 MSAL SSO 登录
 */
export async function loginWithSSO(): Promise<AuthResponse> {
  try {
    const idToken = await getOfficeIdToken();
    
    console.log('🚀 正在向服务器验证 Microsoft ID Token...');
    // 关键：发送 idToken（与 word-login-sample 一致）
    const apiResponse = await apiRequest('/auth/sso', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    if (apiResponse.success) {
      storeToken(apiResponse.token);
      console.log('✅ Microsoft登录成功:', apiResponse.user.name);
      return { success: true, user: apiResponse.user, token: apiResponse.token };
    } else {
      return { success: false, error: apiResponse.error || 'Microsoft登录失败' };
    }
  } catch (error) {
    console.error('❌ Microsoft登录失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Microsoft登录失败，请使用邮箱登录' 
    };
  }
}

/**
 * 登出（清除MSAL缓存）
 */
export async function logoutSSO(): Promise<void> {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();
    
    if (accounts.length > 0) {
      // 清除本地缓存
      await instance.logoutPopup({
        account: accounts[0],
        postLogoutRedirectUri: '/',
        mainWindowRedirectUri: '/'
      });
    }
    
    clearAuth();
    console.log('✅ 已退出Microsoft账户');
  } catch (error) {
    console.error('退出登录失败:', error);
    clearAuth(); // 至少清除本地token
  }
}

/**
 * 邮箱密码注册
 */
export async function registerWithEmail(email: string, password: string, cardCode?: string): Promise<AuthResponse> {
  try {
    const requestBody: any = { email, password };
    if (cardCode) {
      requestBody.cardCode = cardCode;
    }
    
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (response.success) {
      storeToken(response.token);
      console.log('✅ 邮箱注册成功:', response.user.name);
      return { success: true, user: response.user, token: response.token };
    } else {
      return { success: false, error: response.error || '注册失败' };
    }
  } catch (error) {
    console.error('❌ 注册失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '注册失败' };
  }
}

/**
 * 邮箱密码登录
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      storeToken(response.token);
      console.log('✅ 邮箱登录成功:', response.user.name);
      return { success: true, user: response.user, token: response.token };
    } else {
      return { success: false, error: response.error || '登录失败' };
    }
  } catch (error) {
    console.error('❌ 登录失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '登录失败' };
  }
}

/**
 * 验证当前 Token 是否有效
 */
export async function verifyAuth(): Promise<UserInfo | null> {
  try {
    const token = getStoredToken();
    if (!token) {
      return null;
    }
    // 后端没有单独的 /auth/verify 路由，使用受保护的 /user/info 来验证 token
    const response = await apiRequest('/user/info');
    
    if (response.success) {
      return response.user;
    } else {
      clearAuth();
      return null;
    }
  } catch (error) {
    console.error('Token 验证失败:', error);
    clearAuth();
    return null;
  }
}

/**
 * 退出登录
 */
export function logout(): void {
  clearAuth();
  console.log('✅ 已退出登录');
}

/**
 * 自动登录（优先使用 SSO，失败后提示用户）
 */
/**
 * 自动登录：仅验证现有 Token，不触发 MSAL 登录
 */
export async function autoLogin(): Promise<AuthResponse> {
  try {
    // 只验证现有 Token，不要自动触发 MSAL
    const existingUser = await verifyAuth();
    if (existingUser) {
      console.log('🔄 使用现有认证:', existingUser.name);
      return { success: true, user: existingUser };
    }

    // 尝试使用 MSAL 的缓存进行静默 SSO（仅在有缓存账户时）以换取后端 token
    try {
      const instance = getMsalInstance();
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        try {
          const silentResponse = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
          const idToken = silentResponse.idToken;
          if (idToken) {
            // 向后端换取应用级 token
            const apiResponse = await apiRequest('/auth/sso', {
              method: 'POST',
              body: JSON.stringify({ idToken }),
            });
            if (apiResponse.success) {
              storeToken(apiResponse.token);
              console.log('🔄 静默 SSO 成功，已获取后端 token');
              return { success: true, user: apiResponse.user, token: apiResponse.token };
            }
          }
        } catch (err) {
          console.info('静默 SSO 失败，不进行交互式登录:', err);
        }
      }
    } catch (err) {
      console.warn('尝试静默 SSO 时出错:', err);
    }

    // 不自动调用交互式 SSO，以免在插件中触发弹窗/重定向问题
    console.log('⚠️ 无现有认证，需要用户手动登录');
    return { success: false, error: '需要登录' };
  } catch (error) {
    console.error('自动登录失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '自动登录失败' };
  }
}

/**
 * 获取用户信息
 */
export async function getUserInfo(): Promise<UserInfo> {
  const response = await apiRequest('/user/info');
  return response.user;
}

/**
 * 获取用户余额
 */
export async function getUserBalance(): Promise<{ balance: number; totalUsed: number; lastUpdated: string }> {
  const response = await apiRequest('/user/balance');
  return response;
}

/**
 * 兑换卡密
 */
export async function redeemCard(code: string): Promise<RedeemResponse> {
  try {
    const response = await apiRequest('/card/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    
    if (response.success) {
      return { success: true, tokensAdded: response.data.tokensAdded, newBalance: response.data.newBalance };
    } else {
      return { success: false, error: response.error || '兑换失败' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '兑换失败' };
  }
}

/**
 * 获取使用历史
 */
export async function getUsageHistory(limit: number = 50, page: number = 1): Promise<any> {
  const response = await apiRequest(`/user/usage?limit=${limit}&page=${page}`);
  return response.data;
}

/**
 * 检查是否已认证
 */
export function isAuthenticated(): boolean {
  return getStoredToken() !== null;
}

/**
 * 获取认证状态信息
 */
export async function getAuthStatus(): Promise<{ authenticated: boolean; user?: UserInfo }> {
  try {
    if (!isAuthenticated()) {
      return { authenticated: false };
    }

    const user = await getUserInfo();
    return { authenticated: true, user };
  } catch (error) {
    clearAuth();
    return { authenticated: false };
  }
}

// 导出服务对象
export const authService = {
  autoLogin,
  loginWithSSO,
  loginWithEmail,
  registerWithEmail,
  getUserInfo,
  getUserBalance,
  getUsageHistory,
  redeemCard,
  logout,
  verifyAuth,
  getAuthStatus,
  getOfficeIdToken,
  refreshUserInfo: getUserInfo  // 添加refresh方法，指向getUserInfo
};