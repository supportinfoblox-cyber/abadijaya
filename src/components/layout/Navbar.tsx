'use client';

import React, { useState, useRef } from 'react';
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
  Users,
  Cpu,
  FileSpreadsheet,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

export default function Navbar() {
  const {
    currentUser,
    logout,
    can,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    globalSearchQuery,
    setGlobalSearchQuery,
    currentView,
    setCurrentView,
    setSelectedTicket,
    tickets,
    updateUser,
    updateMyProfile,
    isSidebarCollapsed,
    toggleSidebar,
  } = useTicketOps();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const viewIcons: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard size={16} />,
    tickets: <Ticket size={16} />,
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
    worklog: { title: 'Engineer Worklog', subtitle: 'Time tracking & work documentation' },
    sla: { title: 'SLA Monitoring', subtitle: 'Compliance matrix · SLA thresholds' },
    reports: { title: 'Analytics & Reporting', subtitle: 'Operational insights & data exports' },
    notifications: { title: 'System Notifications', subtitle: 'Alerts, triggers & in-app events' },
    users: { title: 'User Management', subtitle: 'RBAC access control matrix' },
    integration: { title: 'Portal Integration', subtitle: 'iCare OTRS connector configuration' },
    audit: { title: 'Audit Trail', subtitle: 'System compliance & change log' },
    settings: { title: 'System Settings', subtitle: 'App preferences & configuration' },
  };

  const meta = viewMeta[currentView] || { title: 'TicketOps', subtitle: '' };

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

  const notifTypeColor = (type: string) => {
    if (type.includes('BREACHED') || type.includes('CRITICAL')) return '#f43f5e';
    if (type.includes('WARNING')) return '#f59e0b';
    if (type.includes('SYNC') || type.includes('CLOSE')) return '#10b981';
    return '#a5b4fc';
  };

  return (
    <header style={{
      height: 'var(--navbar-height)',
      background: 'rgba(8, 13, 22, 0.88)',
      backdropFilter: 'blur(24px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
    }}>
      {/* Left: Breadcrumb / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '10px',
            background: isSidebarCollapsed ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
            border: isSidebarCollapsed ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.08)',
            color: isSidebarCollapsed ? '#a5b4fc' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(99,102,241,0.16)';
            e.currentTarget.style.color = '#a5b4fc';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isSidebarCollapsed ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = isSidebarCollapsed ? '#a5b4fc' : 'var(--text-secondary)';
            e.currentTarget.style.borderColor = isSidebarCollapsed ? '1px solid rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)';
          }}
          title={isSidebarCollapsed ? 'Tampilkan Sidebar Menu' : 'Sembunyikan Sidebar Menu (Hide)'}
        >
          {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#a5b4fc',
            flexShrink: 0,
          }}>
            {viewIcons[currentView] || <LayoutDashboard size={16} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.02em',
            }}>
              {meta.title}
            </h1>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              marginTop: '1px',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}>
              {meta.subtitle}
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div style={{
          position: 'relative',
          maxWidth: '420px',
          width: '100%',
          display: currentView === 'tickets' || currentView === 'dashboard' ? 'block' : 'none',
        }}>
          <Search size={15} color="var(--text-muted)" style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search tickets, subjects, requester..."
            value={globalSearchQuery}
            onChange={e => {
              setGlobalSearchQuery(e.target.value);
              if (currentView !== 'tickets' && e.target.value.trim().length > 0) {
                setCurrentView('tickets');
              }
            }}
            style={{
              width: '100%',
              padding: '9px 36px',
              borderRadius: '10px',
              border: '1px solid var(--border-medium)',
              backgroundColor: 'rgba(8, 13, 22, 0.7)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
              transition: 'all 0.15s ease',
              backdropFilter: 'blur(8px)',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-medium)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery('')}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

        {/* Role Chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          color: '#a5b4fc',
          fontSize: '0.775rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}>
          <Shield size={13} />
          <span style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
            {currentUser.role}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            style={{
              position: 'relative',
              width: '36px', height: '36px', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isNotifOpen ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isNotifOpen ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: isNotifOpen ? '#a5b4fc' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
              e.currentTarget.style.color = '#a5b4fc';
            }}
            onMouseLeave={e => {
              if (!isNotifOpen) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
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
                border: '1.5px solid rgba(6, 9, 15, 0.8)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {isNotifOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '380px',
              background: 'rgba(12, 18, 32, 0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
              zIndex: 1000,
              animation: 'slideDown 0.2s cubic-bezier(0.34,1.2,0.64,1)',
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 18px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(99,102,241,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color="#a5b4fc" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span style={{
                      padding: '1px 7px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700,
                      background: 'rgba(244,63,94,0.18)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.3)',
                    }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={clearAllNotifications}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
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
                          background: notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.08)',
                          border: notif.read ? '1px solid transparent' : '1px solid rgba(99, 102, 241, 0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.08)'}
                      >
                        {!notif.read && (
                          <div style={{
                            position: 'absolute', top: '12px', right: '12px',
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)',
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
              borderRadius: '10px',
              background: isProfileOpen ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isProfileOpen ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
            }}
            onMouseLeave={e => {
              if (!isProfileOpen) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }
            }}
            title="Profil & Pengaturan"
          >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{
                    width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid rgba(99,102,241,0.5)',
                    boxShadow: '0 0 8px rgba(99,102,241,0.3)',
                  }}
                />
              ) : (
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                  border: '2px solid rgba(99,102,241,0.5)',
                }}>
                  {currentUser.name.charAt(0)}
                </div>
              )}
              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: '0', right: '0',
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#10b981', border: '1.5px solid rgba(6,9,15,0.8)',
                boxShadow: '0 0 5px #10b981',
              }} />
            </div>
            {/* Name */}
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {currentUser.name.split(' ').slice(0, 2).join(' ')}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {currentUser.role}
              </div>
            </div>
            <ChevronDown size={13} color="var(--text-muted)" style={{
              transform: isProfileOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }} />
          </div>

          {/* Profile Popup */}
          {isProfileOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '240px',
              background: 'rgba(12, 18, 32, 0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              zIndex: 1000,
              animation: 'slideDown 0.2s cubic-bezier(0.34,1.2,0.64,1)',
            }}>
              {/* Profile Header */}
              <div style={{
                padding: '20px', textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.06))',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      style={{
                        width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid rgba(99,102,241,0.5)',
                        boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '68px', height: '68px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.5rem', fontWeight: 900, color: '#fff',
                      border: '3px solid rgba(99,102,241,0.5)',
                      boxShadow: '0 0 20px rgba(99,102,241,0.35)',
                    }}>
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: '2px', right: '2px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: '#10b981', border: '2px solid rgba(12,18,32,0.97)',
                    boxShadow: '0 0 6px #10b981',
                  }} />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {currentUser.email}
                </div>
                <div style={{
                  marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '0.7rem', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '100px',
                  background: 'rgba(99,102,241,0.18)',
                  color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)',
                }}>
                  <Shield size={11} />
                  {currentUser.role.toUpperCase()}
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
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)',
                    color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease', marginBottom: '8px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
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
                    background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                    color: '#fda4af', fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.08)'}
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
