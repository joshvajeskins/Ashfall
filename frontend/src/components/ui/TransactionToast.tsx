'use client';

import { useEffect } from 'react';
import {
  useTransactionStore,
  getExplorerUrl,
  truncateHash,
} from '@/stores/transactionStore';

const AUTO_DISMISS_MS = 5000;

export function TransactionToast() {
  const { notifications, removeTransaction } = useTransactionStore();

  useEffect(() => {
    if (notifications.length === 0) return;

    const timers = notifications.map((n) =>
      setTimeout(() => removeTransaction(n.id), AUTO_DISMISS_MS)
    );

    return () => timers.forEach(clearTimeout);
  }, [notifications, removeTransaction]);

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #1a0f0a 0%, #2a1510 100%)',
            border: '2px solid #4a2f1a',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            fontFamily: 'var(--font-retro), monospace',
            fontSize: 14,
            color: '#e8d4b8',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <StatusIcon status={notification.status} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, color: '#ffd700' }}>
              {notification.action}
            </span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              {truncateHash(notification.txHash)}
            </span>
          </div>
          <button
            onClick={() => window.open(getExplorerUrl(notification.txHash), '_blank')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              background: 'rgba(255,215,0,0.15)',
              border: '1px solid #4a2f1a',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,215,0,0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,215,0,0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="View on Explorer"
          >
            <ExternalLinkIcon />
          </button>
          <button
            onClick={() => removeTransaction(notification.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
            title="Dismiss"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function StatusIcon({ status }: { status: 'pending' | 'success' | 'error' }) {
  if (status === 'pending') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd700">
        <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2" strokeLinecap="round">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    );
  }

  if (status === 'error') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path d="M15 9l-6 6M9 9l6 6" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e8d4b8" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
