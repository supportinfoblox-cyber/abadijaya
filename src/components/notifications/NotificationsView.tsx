'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Check,
  Trash2,
  ArrowRight,
  Filter,
  CheckCheck,
  Clock,
  Sparkles,
  Inbox,
} from 'lucide-react';

export default function NotificationsView() {
  const {
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    tickets,
    setSelectedTicket,
    setCurrentView,
  } = useTicketOps();

  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'SLA' | 'TICKETS'>('ALL');

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) markNotificationAsRead(n.id);
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'UNREAD') return !n.read;
    if (activeTab === 'SLA') return n.type.includes('BREACHED') || n.type.includes('CRITICAL') || n.type.includes('WARNING') || n.type.includes('SLA');
    if (activeTab === 'TICKETS') return !n.type.includes('BREACHED') && !n.type.includes('CRITICAL');
    return true;
  });

  const getNotifMeta = (type: string) => {
    if (type.includes('BREACHED')) {
      return {
        bg: 'var(--color-danger-bg)',
        border: 'var(--color-danger-border)',
        accent: 'var(--color-danger)',
        glow: 'rgba(244, 63, 94, 0.25)',
        icon: <AlertOctagon size={18} />,
        label: 'SLA BREACHED',
      };
    }
    if (type.includes('CRITICAL') || type.includes('WARNING')) {
      return {
        bg: 'var(--color-warning-bg)',
        border: 'var(--color-warning-border)',
        accent: 'var(--color-warning)',
        glow: 'rgba(245, 158, 11, 0.25)',
        icon: <AlertTriangle size={18} />,
        label: 'SLA RISK',
      };
    }
    if (type.includes('RESOLVED') || type.includes('CLOSED')) {
      return {
        bg: 'var(--color-success-bg)',
        border: 'var(--color-success-border)',
        accent: 'var(--color-success)',
        glow: 'rgba(16, 185, 129, 0.25)',
        icon: <CheckCircle2 size={18} />,
        label: 'COMPLETED',
      };
    }
    return {
      bg: 'var(--color-purple-bg)',
      border: 'var(--color-purple-border)',
      accent: 'var(--color-purple)',
      glow: 'rgba(99, 102, 241, 0.25)',
      icon: <Bell size={18} />,
      label: 'SYSTEM DISPATCH',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-purple)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)',
            }}>
              <Bell size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  Operational Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                  }}>
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Real-time telemetry alerts: SLA Warnings, Breaches, Inbound Tickets, Assignments & Closures
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="btn btn-outline btn-sm hover-glow"
                style={{ fontSize: '0.8rem' }}
              >
                <CheckCheck size={15} />
                <span>Mark All as Read</span>
              </button>
            )}
            <button
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
              className="btn btn-secondary btn-sm hover-glow"
              style={{ fontSize: '0.8rem' }}
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Content */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(['ALL', 'UNREAD', 'SLA', 'TICKETS'] as const).map(tab => {
              const isActive = activeTab === tab;
              const count = tab === 'ALL' ? notifications.length :
                tab === 'UNREAD' ? unreadCount :
                tab === 'SLA' ? notifications.filter(n => n.type.includes('BREACHED') || n.type.includes('CRITICAL') || n.type.includes('WARNING')).length :
                notifications.filter(n => !n.type.includes('BREACHED') && !n.type.includes('CRITICAL')).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab === 'ALL' ? 'All Alerts' : tab === 'UNREAD' ? 'Unread' : tab === 'SLA' ? 'SLA Warnings' : 'General'}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing {filteredNotifications.length} of {notifications.length} alerts
          </span>
        </div>

        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-purple-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--color-purple)',
            }}>
              <Inbox size={26} />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              No notifications to display
            </div>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>
              {activeTab === 'UNREAD' ? 'You have cleared all unread operational alerts.' : 'Operational queue is fully caught up.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredNotifications.map(notif => {
              const targetTicket = tickets.find(t => t.id === notif.ticketId);
              const meta = getNotifMeta(notif.type);

              return (
                <div
                  key={notif.id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: notif.read ? 'var(--bg-card)' : 'var(--accent-primary-light)',
                    border: notif.read ? '1px solid var(--border-subtle)' : `1px solid ${meta.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover-elevate"
                >
                  {/* Left glowing accent line for unread */}
                  {!notif.read && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      backgroundColor: meta.accent,
                      boxShadow: `0 0 10px ${meta.accent}`,
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 auto' }}>
                    <div style={{
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: meta.bg,
                      color: meta.accent,
                      border: `1px solid ${meta.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {meta.icon}
                    </div>

                    <div style={{ flex: '1 1 auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                          {notif.title}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: meta.bg,
                          color: meta.accent,
                          border: `1px solid ${meta.border}`,
                        }}>
                          {meta.label}
                        </span>
                        {!notif.read && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#ffffff',
                          }}>
                            NEW
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '5px', lineHeight: 1.5 }}>
                        {notif.message}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {new Date(notif.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {targetTicket && (
                          <span>&bull; Ticket: <strong style={{ color: 'var(--color-purple)' }}>{targetTicket.ticketNumber}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="btn btn-outline btn-sm hover-glow"
                        style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                      >
                        <Check size={13} />
                        <span>Read</span>
                      </button>
                    )}
                    {targetTicket && (
                      <button
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          setSelectedTicket(targetTicket);
                          setCurrentView('tickets');
                        }}
                        className="btn btn-primary btn-sm hover-glow"
                        style={{ padding: '6px 14px', fontSize: '0.76rem' }}
                      >
                        <span>Open Ticket</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
