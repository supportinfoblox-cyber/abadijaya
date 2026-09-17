'use client';

import React from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Bell,
  Menu,
} from 'lucide-react';


interface MobileBottomNavProps {
  onOpenMobileMenu?: () => void;
}

export default function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const { currentView, setCurrentView, tickets, notifications, isSidebarCollapsed, setIsSidebarCollapsed } = useTicketOps();

  // Active tickets count (open/in-progress)
  const activeTicketsCount = React.useMemo(() => {
    return tickets.filter(t => t.status !== 'CLOSED').length;
  }, [tickets]);

  // Unread notifications count
  const unreadNotifsCount = React.useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Beranda',
      icon: LayoutDashboard,
      onClick: () => setCurrentView('dashboard'),
      badge: null,
    },
    {
      id: 'tickets',
      label: 'Tiket',
      icon: Ticket,
      onClick: () => setCurrentView('tickets'),
      badge: activeTicketsCount > 0 ? activeTicketsCount : null,
      badgeColor: 'var(--color-primary)',
    },
    {
      id: 'sla',
      label: 'SLA',
      icon: Clock,
      onClick: () => setCurrentView('sla'),
      badge: null,
    },
    {
      id: 'notifications',
      label: 'Notif',
      icon: Bell,
      onClick: () => setCurrentView('notifications'),
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : null,
      badgeColor: '#ef4444',
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      onClick: () => {
        if (onOpenMobileMenu) {
          onOpenMobileMenu();
        } else {
          setIsSidebarCollapsed(!isSidebarCollapsed);
        }
      },
      badge: null,
    },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'rgba(13, 17, 23, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 990,
        userSelect: 'none',
      }}
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            type="button"
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'none',
              border: 'none',
              padding: '6px 0',
              color: isActive ? 'var(--color-primary-light, #38bdf8)' : 'var(--text-muted, #94a3b8)',
              position: 'relative',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            {/* Active Indicator Glow */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  width: '28px',
                  height: '3px',
                  backgroundColor: 'var(--color-primary, #0284c7)',
                  borderRadius: '3px',
                  boxShadow: '0 0 10px var(--color-primary, #0284c7)',
                }}
              />
            )}

            {/* Icon with optional badge */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.3 : 1.8}
                style={{
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
              />

              {item.badge !== null && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-9px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '8px',
                    backgroundColor: item.badgeColor || '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                  }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: isActive ? 700 : 500,
                marginTop: '3px',
                letterSpacing: '0.01em',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
