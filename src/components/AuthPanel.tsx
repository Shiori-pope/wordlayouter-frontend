import React, { useState } from 'react';
import { authService } from '../services/authService';
import '../taskpane/taskpane.css';

interface AuthPanelProps {
  onAuthSuccess: (userInfo: any) => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSSO = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await authService.loginWithSSO();
      if (result.success && result.user) {
        onAuthSuccess(result.user);
      } else {
        setError(result.error || 'Microsoft登录失败');
      }
    } catch (err) {
      console.error('SSO Login Error:', err);
      setError('Microsoft登录失败，请使用邮箱登录');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await authService.loginWithEmail(email, password);
      } else {
        result = await authService.registerWithEmail(email, password, cardCode);
      }

      if (result.success && result.user) {
        onAuthSuccess(result.user);
      } else {
        setError(result.error || '认证失败');
      }
    } catch (err) {
      console.error('Email Auth Error:', err);
      setError('认证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-panel">
      <div className="auth-header">
        <h2>AI助手</h2>
        <p>登录后享受更稳定的服务和Token管理</p>
      </div>

      {/* Microsoft SSO登录按钮 */}
      <div className="auth-section">
        <button 
          className="sso-button"
          onClick={handleSSO}
          disabled={loading}
        >
          {loading ? '登录中...' : '使用Microsoft账户登录'}
        </button>
        <p className="auth-divider">或</p>
      </div>

      {/* 邮箱登录表单 */}
      <form onSubmit={handleEmailAuth} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">邮箱:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">密码:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="cardCode">卡密 (可选):</label>
            <input
              type="text"
              id="cardCode"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder="输入卡密获得额外Token"
              disabled={loading}
            />
          </div>
        )}

        <button 
          type="submit" 
          className="auth-submit"
          disabled={loading}
        >
          {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setIsLogin(!isLogin)}
          disabled={loading}
        >
          {isLogin ? '没有账户？注册' : '已有账户？登录'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="auth-footer">
        <p>新用户注册自动获得10,000 Token</p>
        <p>Token用于AI对话和文档处理</p>
      </div>
    </div>
  );
};