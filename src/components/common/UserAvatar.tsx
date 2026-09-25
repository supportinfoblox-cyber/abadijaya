'use client';

import React, { useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  showOnlineDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = 32,
  showOnlineDot = false,
  className = '',
  style = {},
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Clean initial letters (e.g. "John Doe" -> "JD", "testing" -> "T")
  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : '?';
  };

  // Deterministic gradient based on name hash
  const getGradient = (n: string) => {
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  // Check if avatarUrl looks invalid (like broken random unsplash mock)
  const isSuspiciousUrl = !avatarUrl || avatarUrl.includes('photo-15') && avatarUrl.length < 50;
  const shouldTryImage = Boolean(avatarUrl) && !imgError && !isSuspiciousUrl;

  return (
    <div
      className={`user-avatar-root ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        flexShrink: 0,
        flexGrow: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid rgba(99, 102, 241, 0.45)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          background: getGradient(name || 'User'),
        }}
      >
        {shouldTryImage ? (
          <img
            src={avatarUrl!}
            alt=""
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span
            style={{
              fontSize: `${Math.max(10, Math.round(size * 0.4))}px`,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              userSelect: 'none',
              lineHeight: 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {getInitials(name)}
          </span>
        )}
      </div>

      {showOnlineDot && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: `${Math.max(6, Math.round(size * 0.28))}px`,
            height: `${Math.max(6, Math.round(size * 0.28))}px`,
            borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
            border: '1.5px solid var(--bg-card, #0c111e)',
            boxShadow: '0 0 6px var(--color-success)',
          }}
        />
      )}
    </div>
  );
}
