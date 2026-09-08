'use client';

import React from 'react';
import { TicketOpsProvider, useTicketOps } from '@/context/TicketOpsContext';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import DashboardView from '@/components/dashboard/DashboardView';
import TicketListView from '@/components/tickets/TicketListView';
import TicketDetailModal from '@/components/tickets/TicketDetailModal';
import WorklogModuleView from '@/components/worklog/WorklogModuleView';
import SLAMonitoringView from '@/components/sla/SLAMonitoringView';
import ReportingModuleView from '@/components/reports/ReportingModuleView';
import NotificationsView from '@/components/notifications/NotificationsView';
import IntegrationManagementView from '@/components/admin/IntegrationManagementView';
import UserManagementView from '@/components/admin/UserManagementView';
import AuditLogView from '@/components/admin/AuditLogView';
import SettingsView from '@/components/settings/SettingsView';
import LoginView from '@/components/auth/LoginView';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TicketOps ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '16px',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          margin: '40px auto',
          maxWidth: '560px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            color: '#f43f5e', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.4rem', fontWeight: 800
          }}>
            !
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Terjadi Kesalahan Saat Menampilkan Data
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Komponen mengalami kendala rendering.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="btn btn-outline btn-sm"
            >
              Reset Filter & Coba Lagi
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary btn-sm"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { currentView, isAuthenticated, isSidebarCollapsed, setGlobalSearchQuery, setActiveKriteria } = useTicketOps();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'tickets':
        return <TicketListView />;
      case 'worklog':
        return <WorklogModuleView />;
      case 'sla':
        return <SLAMonitoringView />;
      case 'reports':
        return <ReportingModuleView />;
      case 'notifications':
        return <NotificationsView />;
      case 'integration':
        return <IntegrationManagementView />;
      case 'users':
        return <UserManagementView />;
      case 'audit':
        return <AuditLogView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div
        className="main-content"
        style={{
          marginLeft: isSidebarCollapsed ? '0' : 'var(--sidebar-width)',
          transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Navbar />
        <main className="page-body">
          <ErrorBoundary onReset={() => { setGlobalSearchQuery(''); setActiveKriteria('ALL'); }}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal />
    </div>
  );
}

export default function Home() {
  return (
    <TicketOpsProvider>
      <AppContent />
    </TicketOpsProvider>
  );
}
