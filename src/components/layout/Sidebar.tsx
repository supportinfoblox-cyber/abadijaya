'use client';

import { useTicketOps } from '@/context/TicketOpsContext';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  CalendarCheck,
  ClipboardCheck,
  HardDrive,
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
  X,
  CalendarDays,
} from 'lucide-react';

import UserAvatar from '@/components/common/UserAvatar';

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
    setIsSidebarCollapsed,
    disabledMenus,
  } = useTicketOps();

  const openTicketsCount = tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
  const breachedCount = tickets.filter(t => t.slaStatus === 'BREACHED' && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
  const unreadNotifsCount = notifications.filter(n => !n.read).length;
  const isConnected = integrationConfig.connectionStatus === 'CONNECTED';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'tickets', label: 'Ticket Management', icon: TicketIcon, badge: openTicketsCount, badgeColor: 'accent' },
    { id: 'shift-schedule', label: 'Jadwal Shift Kerja', icon: CalendarDays, badge: null },
    { id: 'pm-schedule', label: 'Jadwal Preventive Maintenance', icon: CalendarCheck, badge: null },
    { id: 'icare-attendance', label: 'Absen iCare', icon: ClipboardCheck, badge: null },
    { id: 'ms-devices', label: 'Daftar Perangkat Manage Services', icon: HardDrive, badge: null },
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

  const visibleNavItems = navItems.filter(item => !disabledMenus.includes(item.id));
  const visibleAdminItems = adminItems.filter(item => !disabledMenus.includes(item.id));

  // Detect current theme for color-aware badge backgrounds
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') !== 'light';
  const getBadgeBg = (color: string) => {
    if (color === 'danger') return isDark
      ? { bg: 'rgba(244,63,94,0.15)', color: '#fb7185', border: 'rgba(244,63,94,0.3)' }
      : { bg: 'rgba(220,38,38,0.09)', color: '#991b1b', border: 'rgba(220,38,38,0.28)' };
    if (color === 'warning') return isDark
      ? { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' }
      : { bg: 'rgba(217,119,6,0.09)', color: '#92400e', border: 'rgba(217,119,6,0.3)' };
    return isDark
      ? { bg: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: 'rgba(99,102,241,0.35)' }
      : { bg: 'rgba(79,70,229,0.1)', color: '#4338ca', border: 'rgba(79,70,229,0.28)' };
  };

  const NavButton = ({ item, hasAccess = true }: { item: any; hasAccess?: boolean }) => {
    const Icon = item.icon;
    const active = currentView === item.id;
    const badge = getBadgeBg(item.badgeColor || 'accent');
    const activeColor = isDark ? '#a5b4fc' : '#4f46e5';
    const activeBg = isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(79, 70, 229, 0.09)';
    const activeBorder = isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(79, 70, 229, 0.22)';
    const activeIconBg = isDark ? 'rgba(99,102,241,0.2)' : 'rgba(79,70,229,0.12)';
    const hoverBg = isDark ? 'rgba(99,102,241,0.07)' : 'rgba(79,70,229,0.05)';
    const tooltip = `${item.label}${item.badge ? ` (${item.badge})` : ''}`;

    return (
      <button
        key={item.id}
        onClick={() => {
          setCurrentView(item.id);
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarCollapsed(true);
          }
        }}
        title={tooltip}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          width: '100%',
          padding: isSidebarCollapsed ? '9px 0' : '10px 13px',
          borderRadius: '10px',
          backgroundColor: active ? activeBg : 'transparent',
          color: !hasAccess ? 'var(--text-muted)' : active ? activeColor : 'var(--text-secondary)',
          border: active ? `1px solid ${activeBorder}` : '1px solid transparent',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: active ? 700 : 500,
          opacity: !hasAccess ? 0.55 : 1,
          transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: active
            ? isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(99,102,241,0.15)'
              : '0 1px 4px rgba(79,70,229,0.1)'
            : 'none',
          position: 'relative',
          overflow: 'visible',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.backgroundColor = hoverBg;
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
            background: 'linear-gradient(180deg, var(--accent-primary), var(--accent-cyan))',
            boxShadow: '0 0 8px var(--accent-primary-muted)',
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', position: 'relative' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: active ? activeIconBg : 'transparent',
            color: active ? activeColor : !hasAccess ? 'var(--text-muted)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            position: 'relative',
          }}>
            <Icon size={17} />
            {/* Minimalist dot indicator for badges when mini */}
            {isSidebarCollapsed && item.badge !== null && item.badge !== undefined && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.badgeColor === 'danger' ? 'var(--color-danger)' : item.badgeColor === 'warning' ? 'var(--color-warning)' : 'var(--accent-primary)',
                boxShadow: '0 0 6px rgba(0,0,0,0.4)',
              }} />
            )}
          </div>
          {!isSidebarCollapsed && (
            <span style={{ letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{item.label}</span>
          )}
        </div>

        {!isSidebarCollapsed && (
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
                whiteSpace: 'nowrap',
              }}>
                {item.badge}
              </span>
            )}
            {!hasAccess && (
              <span style={{
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-glass)',
                padding: '2px 5px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
              }}>
                Locked
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`app-sidebar ${isSidebarCollapsed ? 'sidebar-mini' : 'sidebar-full'}`}
      style={{
        width: isSidebarCollapsed ? 'var(--sidebar-mini-width, 68px)' : 'var(--sidebar-width, 260px)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        userSelect: 'none',
        boxShadow: isDark ? '4px 0 24px rgba(0,0,0,0.3)' : '2px 0 16px rgba(15,23,42,0.07), 1px 0 0 #e2e8f0',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
        overflowX: 'hidden',
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: isSidebarCollapsed ? '16px 8px' : '18px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: '-20px', left: '-20px',
          width: '100px', height: '100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSidebarCollapsed ? '0' : '10px',
          position: 'relative',
          width: '100%',
          justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
        }}>
          {/* Logo mark */}
          <button
            onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
            style={{
              width: isSidebarCollapsed ? '38px' : '42px',
              height: isSidebarCollapsed ? '38px' : '42px',
              borderRadius: '11px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '3px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
              cursor: isSidebarCollapsed ? 'pointer' : 'default',
            }}
            title={isSidebarCollapsed ? "Klik untuk memperluas menu" : undefined}
          >
            <img
              src="/logo-icon.png"
              alt="Portal Abadi Jaya"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </button>
          {!isSidebarCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.98rem', fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  Portal Abadi Jaya
                </span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '5px',
                  backgroundColor: 'var(--accent-primary-light)',
                  color: 'var(--text-accent)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}>
                  v1.0
                </span>
              </div>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 600 }}>
                BSI Infoblox Ops Center
              </p>
            </div>
          )}
          {/* Mobile close button when expanded */}
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="mobile-close-sidebar hide-desktop"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Sembunyikan Menu (Kecilkan Icon)"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-scroll" style={{ flex: 1, padding: isSidebarCollapsed ? '14px 6px' : '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Core Ops */}
        <div>
          {!isSidebarCollapsed ? (
            <div style={{
              fontSize: '0.62rem', fontWeight: 800,
              textTransform: 'uppercase', color: 'var(--text-muted)',
              padding: '0 10px 8px',
              letterSpacing: '0.1em',
            }}>
              Core Operations
            </div>
          ) : (
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 6px 8px' }} />
          )}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
            {visibleNavItems.map(item => (
              <NavButton key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* Administration */}
        <div>
          {!isSidebarCollapsed ? (
            <div style={{
              fontSize: '0.62rem', fontWeight: 800,
              textTransform: 'uppercase', color: 'var(--text-muted)',
              padding: '0 10px 8px',
              letterSpacing: '0.1em',
            }}>
              Administration
            </div>
          ) : (
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '10px 6px 8px' }} />
          )}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
            {visibleAdminItems.map(item => (
              <NavButton key={item.id} item={item} hasAccess={can(item.perm)} />
            ))}
          </nav>
        </div>
      </div>

      {/* Footer: User + Connection Status */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
      }}>
        {/* Connection Status */}
        <div style={{
          padding: isSidebarCollapsed ? '10px 4px' : '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <div
              title={isConnected ? (integrationConfig.lastSyncAt ? `iCare Connected (Sync: ${new Date(integrationConfig.lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : 'iCare Connected') : 'Portal Offline'}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', display: 'block',
                backgroundColor: isConnected ? 'var(--color-success)' : 'var(--color-danger)',
                boxShadow: isConnected ? '0 0 8px rgba(5,150,105,0.6)' : '0 0 8px rgba(220,38,38,0.6)',
              }} />
              {isConnected && (
                <span style={{
                  position: 'absolute', inset: '-2px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success)',
                  opacity: 0.25,
                  animation: 'pulse-warning 2s ease-in-out infinite',
                }} />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isConnected ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {isConnected ? 'iCare Connected' : 'Portal Offline'}
                </div>
                <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>
                  {integrationConfig.lastSyncAt
                    ? `Sync: ${new Date(integrationConfig.lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Never synced'
                  }
                </div>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={() => syncTicketsNow()}
              disabled={isSyncing}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 9px', borderRadius: '7px',
                fontSize: '0.68rem', fontWeight: 700,
                color: isSyncing ? 'var(--text-muted)' : 'var(--text-accent)',
                background: isSyncing ? 'transparent' : 'var(--accent-primary-light)',
                border: `1px solid ${isSyncing ? 'var(--border-subtle)' : 'rgba(79,70,229,0.25)'}`,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                opacity: isSyncing ? 0.6 : 1,
              }}
              title="Sync dari iCare Portal"
            >
              <RefreshCw size={11} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              {isSyncing ? 'Syncing' : 'Sync'}
            </button>
          )}
        </div>

        {/* User Profile */}
        <div style={{
          padding: isSidebarCollapsed ? '10px 4px' : '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
        }}>
          <UserAvatar name={currentUser?.name || currentUser?.username || 'User'} avatarUrl={currentUser?.avatarUrl} size={isSidebarCollapsed ? 32 : 34} />
          {!isSidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {(currentUser?.name || currentUser?.username || 'User').split(' ').slice(0, 2).join(' ')}
              </div>
              <div style={{
                fontSize: '0.65rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <Zap size={9} color="var(--accent-primary)" />
                {((currentUser?.role || 'engineer').charAt(0).toUpperCase() + (currentUser?.role || 'engineer').slice(1))} · DNS/DHCP
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
