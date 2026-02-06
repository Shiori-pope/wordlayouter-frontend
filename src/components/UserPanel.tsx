import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface UserInfo {
  id?: string;
  oid?: string;
  email: string;
  name?: string;
  isOfficeUser?: boolean;
  balance?: number;
  remainingTokens?: number;
  plan?: string;
  createdAt?: string;
  authType?: string;
}

interface UserPanelProps {
  user: UserInfo;
  onLogout: () => void;
}

export const UserPanel: React.FC<UserPanelProps> = ({ user, onLogout }) => {
  const [cardCode, setCardCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState('');
  const [refreshLoading, setRefreshLoading] = useState(false);

  const handleRedeemCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardCode.trim()) return;

    setRedeemLoading(true);
    setRedeemMessage('');

    try {
      const result = await authService.redeemCard(cardCode.trim());
      if (result.success) {
        setRedeemMessage(`成功兑换 ${result.tokens} Token!`);
        setCardCode('');
        // 刷新用户信息
        await handleRefreshInfo();
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (err) {
      console.error('Logout Error:', err);
      onLogout(); // 强制登出
    }
  };

  const formatTokens = (tokens: number | undefined): string => {
    if (tokens === undefined || tokens === null) {
      return '0';
    }
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getTokenColor = (tokens: number | undefined): string => {
    if (!tokens || tokens < 1000) return '#ff4444';
    if (tokens < 5000) return '#ff8800';
    return '#00aa00';
  };

  return (
    <div className="user-panel">
      <div className="user-header">
        <h3>用户信息</h3>
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          title="退出登录"
        >
          退出
        </button>
      </div>

      <div className="user-info">
        <div className="info-row">
          <span className="label">邮箱:</span>
          <span className="value">{user.email}</span>
        </div>
        
        <div className="info-row">
          <span className="label">账户类型:</span>
          <span className="value">
            {user.isOfficeUser ? 'Office SSO' : '邮箱账户'}
          </span>
        </div>

        <div className="info-row">
          <span className="label">剩余Token:</span>
          <span 
            className="value token-count"
            style={{ color: getTokenColor(user.balance || user.remainingTokens) }}
          >
            {formatTokens(user.balance || user.remainingTokens)}
          </span>
          <button 
            className="refresh-btn"
            onClick={handleRefreshInfo}
            disabled={refreshLoading}
            title="刷新Token余额"
          >
            {refreshLoading ? '⟳' : '↻'}
          </button>
        </div>

        <div className="info-row">
          <span className="label">注册时间:</span>
          <span className="value">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
          </span>
        </div>
      </div>

      {/* Token充值区域 */}
      <div className="redeem-section">
        <h4>卡密充值</h4>
        <form onSubmit={handleRedeemCard} className="redeem-form">
          <input
            type="text"
            value={cardCode}
            onChange={(e) => setCardCode(e.target.value)}
            placeholder="输入卡密"
            disabled={redeemLoading}
            className="redeem-input"
          />
          <button 
            type="submit"
            disabled={redeemLoading || !cardCode.trim()}
            className="redeem-btn"
          >
            {redeemLoading ? '兑换中...' : '兑换'}
          </button>
        </form>
        
        {redeemMessage && (
          <div className={`redeem-message ${redeemMessage.includes('成功') ? 'success' : 'error'}`}>
            {redeemMessage}
          </div>
        )}
      </div>

      {/* Token使用提示 */}
      <div className="token-tips">
        <h4>Token说明</h4>
        <ul>
          <li>每次AI对话消耗Token (输入+输出)</li>
          <li>文档解析和格式化消耗Token</li>
          <li>流式响应实时扣费</li>
          <li>Token不足时将提示充值</li>
        </ul>
      </div>
    </div>
  );
};