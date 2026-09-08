'use client';

import React from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  Clock,
  ShieldAlert,
  BarChart3,
  Bell,
  Users,
  Cpu,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Zap,
  Network,
} from 'lucide-react';

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    tickets,
    notifications,
    integrationConfig,
    can,
    currentUser,
    isSyncing,
    syncTicketsNow,
    isSidebarCollapsed,
  } = useTicketOps();

  const openTicketsCount = tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
  const breachedCount = tickets.filter(t => t.slaStatus === 'BREACHED' && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
  const unreadNotifsCount = notifications.filter(n => !n.read).length;
  const isConnected = integrationConfig.connectionStatus === 'CONNECTED';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'tickets', label: 'Ticket Management', icon: TicketIcon, badge: openTicketsCount, badgeColor: 'accent' },
    { id: 'worklog', label: 'Worklog', icon: Clock, badge: null },
    { id: 'sla', label: 'SLA Monitoring', icon: ShieldAlert, badge: breachedCount > 0 ? `${breachedCount} Breached` : null, badgeColor: 'danger' },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? unreadNotifsCount : null, badgeColor: 'warning' },
  ];

  const adminItems = [
    { id: 'users', label: 'User Management', icon: Users, perm: 'userManagement' as const },
    { id: 'integration', label: 'Portal Integration', icon: Cpu, perm: 'integration' as const },
    { id: 'audit', label: 'Audit Log', icon: FileSpreadsheet, perm: 'auditLog' as const },
    { id: 'settings', label: 'System Settings', icon: Settings, perm: 'dashboard' as const },
  ];

  const getBadgeBg = (color: string) => {
    if (color === 'danger') return { bg: 'rgba(244,63,94,0.15)', color: '#fb7185', border: 'rgba(244,63,94,0.3)' };
    if (color === 'warning') return { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' };
    return { bg: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: 'rgba(99,102,241,0.35)' };
  };

  const NavButton = ({ item, hasAccess = true }: { item: any; hasAccess?: boolean }) => {
    const Icon = item.icon;
    const active = currentView === item.id;
    const badge = getBadgeBg(item.badgeColor || 'accent');
    return (
      <button
        key={item.id}
        onClick={() => setCurrentView(item.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 13px',
          borderRadius: '10px',
          backgroundColor: active ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
          color: !hasAccess ? 'var(--text-muted)' : active ? '#a5b4fc' : 'var(--text-secondary)',
          border: active ? '1px solid rgba(99, 102, 241, 0.28)' : '1px solid transparent',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: active ? 700 : 500,
          opacity: !hasAccess ? 0.55 : 1,
          transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(99,102,241,0.15)' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.07)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = !hasAccess ? 'var(--text-muted)' : 'var(--text-secondary)';
          }
        }}
      >
        {/* Active indicator bar */}
        {active && (
          <span style={{
            position: 'absolute',
            left: 0, top: '20%', bottom: '20%',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            background: 'linear-gradient(180deg, #6366f1, #06b6d4)',
            boxShadow: '0 0 8px rgba(99,102,241,0.6)',
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: active ? 'rgba(99,102,241,0.2)' : 'transparent',
            color: active ? '#a5b4fc' : !hasAccess ? 'var(--text-muted)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}>
            <Icon size={16} />
          </div>
          <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.badge !== null && item.badge !== undefined && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '100px',
              backgroundColor: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
              letterSpacing: '0.02em',
            }}>
              {item.badge}
            </span>
          )}
          {!hasAccess && (
            <span style={{
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.05)',
              padding: '2px 5px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
            }}>
              Locked
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'linear-gradient(180deg, rgba(10,16,28,0.98) 0%, rgba(8,13,22,0.99) 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      userSelect: 'none',
      boxShadow: isSidebarCollapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.4)',
      transform: isSidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s ease',
      visibility: isSidebarCollapsed ? 'hidden' : 'visible',
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(99,102,241,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: '-20px', left: '-20px',
          width: '100px', height: '100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px', position: 'relative' }}>
          {/* Logo mark */}
          <div style={{
            width: '42px', height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <Network size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{
                fontSize: '1.05rem', fontWeight: 800,
                letterSpacing: '-0.03em', color: '#f0f4ff',
                background: 'linear-gradient(135deg, #f0f4ff 0%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                TicketOps
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '5px',
                backgroundColor: 'rgba(99, 102, 241, 0.18)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                letterSpacing: '0.04em',
              }}>
                v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px', letterSpacing: '0.01em' }}>
              Enterprise Ops Center
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-scroll" style={{ flex: 1, padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Core Ops */}
        <div>
          <div style={{
            fontSize: '0.62rem', fontWeight: 800,
            textTransform: 'uppercase', color: 'var(--text-muted)',
            padding: '0 10px 8px',
            letterSpacing: '0.1em',
          }}>
            Core Operations
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map(item => (
              <NavButton key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* Administration */}
        <div>
          <div style={{
            fontSize: '0.62rem', fontWeight: 800,
            textTransform: 'uppercase', color: 'var(--text-muted)',
            padding: '0 10px 8px',
            letterSpacing: '0.1em',
          }}>
            Administration
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {adminItems.map(item => (
              <NavButton key={item.id} item={item} hasAccess={can(item.perm)} />
            ))}
          </nav>
        </div>
      </div>

      {/* Footer: User + Connection Status */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.25)',
      }}>
        {/* Connection Status */}
        <div style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', display: 'block',
                backgroundColor: isConnected ? '#10b981' : '#f43f5e',
                boxShadow: isConnected ? '0 0 8px #10b981' : '0 0 8px #f43f5e',
              }} />
              {isConnected && (
                <span style={{
                  position: 'absolute', inset: '-2px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  opacity: 0.25,
                  animation: 'pulse-warning 2s ease-in-out infinite',
                }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isConnected ? '#6ee7b7' : '#fda4af' }}>
                {isConnected ? 'iCare Connected' : 'Portal Offline'}
              </div>
              <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>
                {integrationConfig.lastSyncAt
                  ? `Sync: ${new Date(integrationConfig.lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Never synced'
                }
              </div>
            </div>
          </div>
          <button
            onClick={() => syncTicketsNow()}
            disabled={isSyncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 9px', borderRadius: '7px',
              fontSize: '0.68rem', fontWeight: 700,
              color: isSyncing ? 'var(--text-muted)' : '#a5b4fc',
              background: isSyncing ? 'transparent' : 'rgba(99,102,241,0.12)',
              border: `1px solid ${isSyncing ? 'var(--border-subtle)' : 'rgba(99,102,241,0.25)'}`,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: isSyncing ? 0.6 : 1,
            }}
            title="Sync dari iCare Portal"
          >
            <RefreshCw size={11} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Syncing' : 'Sync'}
          </button>
        </div>

        {/* User Profile */}
        <div style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 800, color: '#fff',
            flexShrink: 0, border: '2px solid rgba(99,102,241,0.4)',
            boxShadow: '0 0 10px rgba(99,102,241,0.3)',
          }}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentUser.name.split(' ').slice(0, 2).join(' ')}
            </div>
            <div style={{
              fontSize: '0.65rem', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Zap size={9} color="#6366f1" />
              {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} · DNS/DHCP
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
