'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  Search,
  Bell,
  Shield,
  X,
  LogOut,
  Camera,
  ChevronDown,
  Ticket,
  BarChart3,
  Clock,
  ShieldAlert,
  LayoutDashboard,
  CalendarCheck,
  ClipboardCheck,
  HardDrive,
  Users,
  Cpu,
  FileSpreadsheet,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  RefreshCw,
  Cloud,
  CloudOff,
} from 'lucide-react';

import UserAvatar from '@/components/common/UserAvatar';

export default function Navbar() {
  const {
    currentUser,
    logout,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    globalSearchQuery,
    setGlobalSearchQuery,
    currentView,
    setCurrentView,
    setSelectedTicket,
    tickets,
    updateMyProfile,
    isSidebarCollapsed,
    toggleSidebar,
    cloudSyncStatus,
    lastCloudSync,
    syncWithCloudNow,
  } = useTicketOps();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ticketops-theme') as 'dark' | 'light' | null;
      return saved || (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof document !== 'undefined') {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', theme === 'dark' ? '#070a12' : '#ffffff');
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ticketops-theme', next);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (currentView !== 'tickets' && currentView !== 'dashboard') {
          setCurrentView('tickets');
        }
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, setCurrentView]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const viewIcons: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard size={16} />,
    tickets: <Ticket size={16} />,
    'pm-schedule': <CalendarCheck size={16} />,
    'shift-schedule': <CalendarCheck size={16} />,
    'icare-attendance': <ClipboardCheck size={16} />,
    'ms-devices': <HardDrive size={16} />,
    worklog: <Clock size={16} />,
    sla: <ShieldAlert size={16} />,
    reports: <BarChart3 size={16} />,
    notifications: <Bell size={16} />,
    users: <Users size={16} />,
    integration: <Cpu size={16} />,
    audit: <FileSpreadsheet size={16} />,
    settings: <Settings size={16} />,
  };

  const viewMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Operational Command Center', subtitle: 'Real-time monitoring • BSI Infoblox Ops' },
    tickets: { title: 'Ticket Management', subtitle: 'OTRS/iCare queue · OP0899 & OP0968' },
    'pm-schedule': { title: 'Jadwal Preventive Maintenance', subtitle: 'Kalender & checklist inspeksi pemeliharaan rutin perangkat BSI Infoblox' },
    'shift-schedule': { title: 'Jadwal Shift Kerja & Roster', subtitle: 'Manajemen rotasi shift mingguan, non-shift, & tukar shift real-time' },
    'icare-attendance': { title: 'Absen iCare Daily Report', subtitle: 'Pelaporan harian engineer terhubung portal iCare LT Integra' },
    'ms-devices': { title: 'Daftar Perangkat Manage Services', subtitle: 'Inventarisasi hardware Infoblox & monitoring masa aktif lisensi' },
    worklog: { title: 'Engineer Worklog', subtitle: 'Time tracking & work documentation' },
    sla: { title: 'SLA Monitoring', subtitle: 'Compliance matrix · SLA thresholds' },
    reports: { title: 'Analytics & Reporting', subtitle: 'Operational insights & data exports' },
    notifications: { title: 'System Notifications', subtitle: 'Alerts, triggers & in-app events' },
    users: { title: 'User Management', subtitle: 'RBAC access control matrix' },
    integration: { title: 'Portal Integration', subtitle: 'iCare OTRS connector configuration' },
    audit: { title: 'Audit Trail', subtitle: 'System compliance & change log' },
    settings: { title: 'System Settings', subtitle: 'App preferences & configuration' },
  };

  const meta = viewMeta[currentView] || { title: 'Portal Abadi Jaya', subtitle: '' };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, GIF, WebP, dll).');
      return;
    }
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Use updateMyProfile — no RBAC restriction, updates both users[] and currentUser
      updateMyProfile({ avatarUrl: dataUrl });
      setIsProfileOpen(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      alert('Gagal membaca file. Silakan coba lagi.');
    };
    reader.readAsDataURL(file);
  };

  const isDark = theme === 'dark';

  const notifTypeColor = (type: string) => {
    if (type.includes('BREACHED') || type.includes('CRITICAL')) return 'var(--color-danger)';
    if (type.includes('WARNING')) return 'var(--color-warning)';
    if (type.includes('SYNC') || type.includes('CLOSE')) return 'var(--color-success)';
    return 'var(--text-accent)';
  };

  return (
    <header className="main-navbar" style={{
      height: 'var(--navbar-height)',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Left: Breadcrumb / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        {/* Toggle Sidebar Button (Hidden on Mobile) */}
        <button
          onClick={toggleSidebar}
          className="hide-mobile"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '10px',
            background: isSidebarCollapsed 
              ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)') 
              : 'var(--bg-card)',
            border: isSidebarCollapsed 
              ? '1px solid rgba(99,102,241,0.35)' 
              : '1px solid var(--border-medium)',
            color: isSidebarCollapsed 
              ? (isDark ? '#a5b4fc' : '#4f46e5') 
              : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.1)';
            e.currentTarget.style.color = isDark ? '#a5b4fc' : '#4f46e5';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isSidebarCollapsed 
              ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)') 
              : 'var(--bg-card)';
            e.currentTarget.style.color = isSidebarCollapsed 
              ? (isDark ? '#a5b4fc' : '#4f46e5') 
              : 'var(--text-secondary)';
            e.currentTarget.style.borderColor = isSidebarCollapsed 
              ? 'rgba(99,102,241,0.35)' 
              : 'var(--border-medium)';
          }}
          title={isSidebarCollapsed ? 'Tampilkan Sidebar Menu' : 'Sembunyikan Sidebar Menu (Hide)'}
        >
          {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', borderRadius: '9px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.1))',
            border: '1px solid rgba(99,102,241,0.25)',
            color: isDark ? '#a5b4fc' : '#4f46e5',
            flexShrink: 0,
          }}>
            {viewIcons[currentView] || <LayoutDashboard size={16} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="navbar-title" style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.02em',
            }}>
              {meta.title}
            </h1>
            <div className="navbar-subtitle hide-mobile" style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              marginTop: '1px',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {meta.subtitle}
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div
          className="hide-tablet"
          style={{
            position: 'relative',
            maxWidth: '360px',
            width: '100%',
            display: currentView === 'tickets' || currentView === 'dashboard' ? 'block' : 'none',
          }}
        >
          <Search size={14} color="var(--text-muted)" style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari tiket, subjek, pemohon... (⌘K)"
            value={globalSearchQuery}
            onChange={e => {
              setGlobalSearchQuery(e.target.value);
              if (currentView !== 'tickets' && e.target.value.trim().length > 0) {
                setCurrentView('tickets');
              }
            }}
            style={{
              width: '100%',
              padding: '8px 36px',
              borderRadius: '9px',
              border: '1px solid var(--border-medium)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-medium)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {!globalSearchQuery ? (
            <span className="kbd" style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}>
              ⌘K
            </span>
          ) : (
            <button
              onClick={() => setGlobalSearchQuery('')}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)', cursor: 'pointer',
                borderRadius: '5px', padding: '2px', display: 'flex',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="navbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>

        {/* Cloud Database (Supabase) Sync Badge */}
        <button
          onClick={async () => {
            await syncWithCloudNow();
          }}
          disabled={cloudSyncStatus === 'syncing'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '100px',
            background: cloudSyncStatus === 'synced'
              ? (isDark ? 'rgba(14, 165, 233, 0.09)' : 'rgba(14, 165, 233, 0.12)')
              : cloudSyncStatus === 'syncing'
              ? (isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.12)')
              : (isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.12)'),
            border: `1px solid ${
              cloudSyncStatus === 'synced'
                ? (isDark ? 'rgba(14, 165, 233, 0.3)' : 'rgba(14, 165, 233, 0.4)')
                : cloudSyncStatus === 'syncing'
                ? (isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.4)')
                : (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)')
            }`,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: cloudSyncStatus === 'synced'
              ? (isDark ? '#38bdf8' : '#0284c7')
              : cloudSyncStatus === 'syncing'
              ? 'var(--text-accent)'
              : (isDark ? '#f87171' : '#dc2626'),
            letterSpacing: '0.03em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title={
            lastCloudSync
              ? `Database Cloud (Supabase): ${cloudSyncStatus.toUpperCase()} • Terakhir: ${new Date(lastCloudSync).toLocaleTimeString('id-ID')} • Klik untuk sync ulang sekarang`
              : 'Database Cloud (Supabase) • Klik untuk sync ulang sekarang'
          }
        >
          {cloudSyncStatus === 'syncing' ? (
            <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
          ) : cloudSyncStatus === 'offline' || cloudSyncStatus === 'error' ? (
            <CloudOff size={13} />
          ) : (
            <Cloud size={13} />
          )}
          <span className="hide-tablet" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
            {cloudSyncStatus === 'syncing'
              ? 'Syncing...'
              : cloudSyncStatus === 'synced'
              ? `Cloud: ${tickets.length}`
              : 'Cloud: Offline'}
          </span>
        </button>

        {/* Live Ops Center Pill */}
        <div className="hide-tablet" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px',
          borderRadius: '100px',
          background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)',
          border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(16, 185, 129, 0.35)',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--color-success)',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}>
          <span className="live-pulse" style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
          }} />
          <span style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
            Live Ops
          </span>
        </div>

        {/* Role Chip */}
        <div className="hide-tablet" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 11px',
          background: 'var(--accent-primary-light)',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          borderRadius: '8px',
          color: 'var(--text-accent)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          flexShrink: 0,
        }}>
          <Shield size={13} />
          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
            {currentUser?.role || 'engineer'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            color: theme === 'dark' ? '#fbbf24' : '#4f46e5',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.borderColor = 'var(--border-medium)';
          }}
          title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Divider */}
        <div className="hide-mobile" style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            style={{
              position: 'relative',
              width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isNotifOpen ? (isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.12)') : 'var(--bg-card)',
              border: `1px solid ${isNotifOpen ? 'rgba(99,102,241,0.35)' : 'var(--border-medium)'}`,
              color: isNotifOpen ? 'var(--text-accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
              e.currentTarget.style.color = isDark ? '#a5b4fc' : '#4f46e5';
            }}
            onMouseLeave={e => {
              if (!isNotifOpen) {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderColor = 'var(--border-medium)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                minWidth: '17px', height: '17px',
                borderRadius: '100px',
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                color: '#ffffff', fontSize: '0.6rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)',
                border: isDark ? '1.5px solid rgba(6, 9, 15, 0.8)' : '1.5px solid #ffffff',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dismiss Backdrop */}
          {isNotifOpen && (
            <div
              className="notif-backdrop"
              onClick={() => setIsNotifOpen(false)}
            />
          )}

          {/* Notifications Panel */}
          {isNotifOpen && (
            <div className="navbar-notif-dropdown">
              {/* Header */}
              <div style={{
                padding: '16px 18px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--accent-primary-light)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color={isDark ? '#a5b4fc' : '#4f46e5'} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span style={{
                      padding: '1px 7px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700,
                      background: isDark ? 'rgba(244,63,94,0.18)' : 'rgba(239,68,68,0.12)',
                      color: isDark ? '#fda4af' : '#dc2626',
                      border: isDark ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={clearAllNotifications}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                    fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer',
                    padding: '3px 9px', borderRadius: '6px', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  Clear all
                </button>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '10px' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)',
                    fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  }}>
                    <Bell size={24} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                    <span>No notifications</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {notifications.slice(0, 15).map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.ticketId) {
                            const t = tickets.find(t => t.id === notif.ticketId);
                            if (t) { setSelectedTicket(t); setCurrentView('tickets'); }
                          }
                          setIsNotifOpen(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: notif.read ? 'transparent' : (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.06)'),
                          border: notif.read ? '1px solid transparent' : (isDark ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(99, 102, 241, 0.25)'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.06)')}
                      >
                        {!notif.read && (
                          <div style={{
                            position: 'absolute', top: '12px', right: '12px',
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: 'var(--accent-primary)', boxShadow: '0 0 6px rgba(99,102,241,0.6)',
                          }} />
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 700,
                            color: notifTypeColor(notif.type),
                          }}>
                            {notif.title}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                            {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                          {notif.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => {
              setIsProfileOpen(p => !p);
              setIsNotifOpen(false);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '5px 10px 5px 5px',
              borderRadius: '10px', flexShrink: 0,
              background: isProfileOpen ? (isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.1)') : 'var(--bg-card)',
              border: `1px solid ${isProfileOpen ? 'rgba(99,102,241,0.35)' : 'var(--border-medium)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
            }}
            onMouseLeave={e => {
              if (!isProfileOpen) {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderColor = 'var(--border-medium)';
              }
            }}
            title="Profil & Pengaturan"
          >
            {/* Avatar */}
            <UserAvatar name={currentUser?.name || currentUser?.username || 'User'} avatarUrl={currentUser?.avatarUrl} size={30} showOnlineDot={true} />
            
            {/* Name - hide on mobile */}
            <div className="hide-mobile" style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {(currentUser?.name || currentUser?.username || 'User').split(' ').slice(0, 2).join(' ')}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {currentUser?.role || 'engineer'}
              </div>
            </div>
            <ChevronDown className="hide-mobile" size={13} color="var(--text-muted)" style={{
              transform: isProfileOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }} />
          </div>

          {/* Profile Dismiss Backdrop */}
          {isProfileOpen && (
            <div
              className="notif-backdrop"
              onClick={() => setIsProfileOpen(false)}
            />
          )}

          {/* Profile Popup */}
          {isProfileOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '240px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 1000,
              animation: 'slideDown 0.2s cubic-bezier(0.34,1.2,0.64,1)',
            }}>
              {/* Profile Header */}
              <div style={{
                padding: '20px', textAlign: 'center',
                background: 'var(--accent-primary-light)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <UserAvatar name={currentUser?.name || currentUser?.username || 'User'} avatarUrl={currentUser?.avatarUrl} size={68} showOnlineDot={true} />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {currentUser?.name || currentUser?.username || 'User'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {currentUser?.email || '-'}
                </div>
                <div style={{
                  marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '0.7rem', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '100px',
                  background: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)',
                  color: isDark ? '#a5b4fc' : '#4338ca',
                  border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(99,102,241,0.25)',
                }}>
                  <Shield size={11} />
                  {String(currentUser?.role || 'engineer').toUpperCase()}
                </div>
              </div>

              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', padding: '0 4px' }}>
                  {currentUser.department}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '9px 14px', borderRadius: '10px',
                    background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                    border: isDark ? '1px solid rgba(99,102,241,0.28)' : '1px solid rgba(99,102,241,0.2)',
                    color: isDark ? '#a5b4fc' : '#4338ca', fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease', marginBottom: '8px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'}
                >
                  <Camera size={14} />
                  Ganti Foto Profil
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (window.confirm('Apakah Anda yakin ingin keluar dari sistem?')) logout();
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '9px 14px', borderRadius: '10px',
                    background: isDark ? 'rgba(244,63,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isDark ? '1px solid rgba(244,63,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isDark ? '#fda4af' : '#dc2626', fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(244,63,94,0.18)' : 'rgba(239,68,68,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(244,63,94,0.08)' : 'rgba(239,68,68,0.08)'}
                >
                  <LogOut size={14} />
                  Keluar dari Akun
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
