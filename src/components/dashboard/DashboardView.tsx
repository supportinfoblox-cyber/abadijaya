'use client';

import { useTicketOps } from '@/context/TicketOpsContext';
import { Ticket, TicketPriority, TicketStatus } from '@/types';
import MonthlyTicketChart from './MonthlyTicketChart';
import {
  Ticket as TicketIcon,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Hourglass,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Layers,
  Globe,
  Server,
  Shield,
  Network,
  Zap,
  MoreHorizontal,
} from 'lucide-react';


export default function DashboardView() {
  const { tickets, setSelectedTicket, setCurrentView, setActiveFilterStatus, setActiveKriteria } = useTicketOps();

  const total = tickets.length;
  const newCount = tickets.filter(t => t.status === 'NEW').length;
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN PROGRESS').length;
  const pendingCount = tickets.filter(t => t.status === 'PENDING').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const closedCount = tickets.filter(t => t.status === 'CLOSED').length;
  const overdueCount = tickets.filter(
    t => t.slaStatus === 'BREACHED' && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  ).length;

  const warningCount = tickets.filter(
    t => (t.slaStatus === 'WARNING' || t.slaStatus === 'CRITICAL') && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  ).length;

  // SLA Achievement rate (Resolved/Closed within SLA / Total processed)
  const completedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const metSlaCount = completedTickets.filter(t => t.slaStatus !== 'BREACHED').length;
  const slaAchievementRate = completedTickets.length > 0
    ? Math.round((metSlaCount / completedTickets.length) * 100)
    : 98;

  // Category breakdown
  const categoryCounts = {
    Incident: tickets.filter(t => t.mainCategory === 'Incident').length,
    'Service Request': tickets.filter(t => t.mainCategory === 'Service Request').length,
    Problem: tickets.filter(t => t.mainCategory === 'Problem').length,
    'Change Request': tickets.filter(t => t.mainCategory === 'Change Request').length,
    Maintenance: tickets.filter(t => t.mainCategory === 'Maintenance').length,
  };

  // Priority breakdown
  const priorityCounts: Record<TicketPriority, number> = {
    CRITICAL: tickets.filter(t => t.priority === 'CRITICAL').length,
    HIGH: tickets.filter(t => t.priority === 'HIGH').length,
    MEDIUM: tickets.filter(t => t.priority === 'MEDIUM').length,
    LOW: tickets.filter(t => t.priority === 'LOW').length,
  };

  // 10 most recent tickets
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const getPriorityBadgeClass = (priority: TicketPriority) => {
    switch (priority) {
      case 'CRITICAL': return 'badge-priority-critical';
      case 'HIGH': return 'badge-priority-high';
      case 'MEDIUM': return 'badge-priority-medium';
      case 'LOW': return 'badge-priority-low';
    }
  };

  const getStatusBadgeClass = (status: TicketStatus) => {
    switch (status) {
      case 'NEW': return 'badge-status-new';
      case 'OPEN': return 'badge-status-open';
      case 'IN PROGRESS': return 'badge-status-in-progress';
      case 'PENDING': return 'badge-status-pending';
      case 'RESOLVED': return 'badge-status-resolved';
      case 'CLOSED': return 'badge-status-closed';
    }
  };

  const getSLABadgeClass = (sla: Ticket['slaStatus']) => {
    switch (sla) {
      case 'SAFE': return 'badge-sla-safe';
      case 'WARNING': return 'badge-sla-warning';
      case 'CRITICAL': return 'badge-sla-critical';
      case 'BREACHED': return 'badge-sla-breached';
    }
  };

  const cardMetrics = [
    { label: 'Total Tickets', count: total, color: 'var(--accent-primary)', glow: 'rgba(99, 102, 241, 0.25)', filter: 'ALL', icon: TicketIcon, trend: '+100% indexed' },
    { label: 'New Inbound', count: newCount, color: 'var(--color-info)', glow: 'rgba(6, 182, 212, 0.25)', filter: 'NEW', icon: ArrowUpRight, trend: 'Awaiting triage' },
    { label: 'Open Active', count: openCount, color: 'var(--color-purple)', glow: 'rgba(129, 140, 248, 0.25)', filter: 'OPEN', icon: Activity, trend: 'Assigned queue' },
    { label: 'In Progress', count: inProgressCount, color: 'var(--color-warning)', glow: 'rgba(245, 158, 11, 0.25)', filter: 'IN PROGRESS', icon: Clock, trend: 'Working active' },
    { label: 'Pending / Hold', count: pendingCount, color: 'var(--color-purple)', glow: 'rgba(168, 85, 247, 0.25)', filter: 'PENDING', icon: Hourglass, trend: 'Waiting input' },
    { label: 'Resolved OK', count: resolvedCount, color: 'var(--color-success)', glow: 'rgba(16, 185, 129, 0.25)', filter: 'RESOLVED', icon: CheckCircle2, trend: 'Ready to close' },
    { label: 'Closed Ledger', count: closedCount, color: 'var(--text-muted)', glow: 'rgba(100, 116, 139, 0.25)', filter: 'CLOSED', icon: ShieldCheck, trend: 'Archived records' },
    { label: 'Overdue Breached', count: overdueCount, color: 'var(--color-danger)', glow: 'rgba(244, 63, 94, 0.25)', filter: 'OVERDUE', icon: AlertOctagon, trend: overdueCount > 0 ? 'Urgent action' : 'Zero breach' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* SLA Alert Banner if Breached or Critical tickets exist */}
      {(overdueCount > 0 || warningCount > 0) ? (
        <div
          className="dashboard-sla-banner alert"
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            background: overdueCount > 0
              ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, var(--bg-card) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, var(--bg-card) 100%)',
            border: `1px solid ${overdueCount > 0 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(16px)',
            flexWrap: 'wrap',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4px',
            height: '100%',
            backgroundColor: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: overdueCount > 0 ? 'rgba(244, 63, 94, 0.18)' : 'rgba(245, 158, 11, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
              boxShadow: `0 0 16px ${overdueCount > 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
              flexShrink: 0,
            }}>
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)', letterSpacing: '-0.01em' }}>
                  Operational SLA Threshold Alert
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                  color: '#ffffff',
                }}>
                  {overdueCount > 0 ? `${overdueCount} BREACHED` : 'WARNING'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {overdueCount > 0 && `${overdueCount} ticket(s) have exceeded SLA resolution thresholds.`}
                {warningCount > 0 && ` ${warningCount} ticket(s) require immediate attention to prevent breach.`}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveFilterStatus('OVERDUE');
              setCurrentView('tickets');
            }}
            className="btn btn-sm hover-glow"
            style={{
              backgroundColor: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: `0 4px 14px ${overdueCount > 0 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              flexShrink: 0,
            }}
          >
            Review At-Risk Tickets
            <ChevronRight size={15} />
          </button>
        </div>
      ) : (
        <div
          className="dashboard-sla-banner compliant"
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backdropFilter: 'blur(16px)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
              flexShrink: 0,
            }}>
              <ShieldCheck size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-success)' }}>
                All SLA Thresholds Compliant
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                Zero tickets breached • Health Score 100%
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }} />
            <span>Telemetry Live &bull; Queue Active</span>
          </div>
        </div>
      )}

      {/* Summary Cards Grid (PRD Section 10) */}
      <div
        className="dashboard-metrics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {cardMetrics.map(m => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              onClick={() => {
                setActiveFilterStatus(m.filter);
                setCurrentView('tickets');
              }}
              style={{
                padding: '20px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--shadow-card)',
              }}
              className="hover-elevate"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = m.color;
                e.currentTarget.style.boxShadow = `0 10px 30px ${m.glow}, 0 0 0 1px ${m.color}`;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Top ambient color glow */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`,
              }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {m.label}
                  </span>
                  <div style={{
                    padding: '7px',
                    borderRadius: '8px',
                    backgroundColor: `${m.color}18`,
                    color: m.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={16} />
                  </div>
                </div>

                <div style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: m.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  marginTop: '10px',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {m.count}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>{m.trend}</span>
                  <span style={{ fontWeight: 600, color: m.color, fontFamily: 'var(--font-mono)' }}>
                    {total > 0 ? `${Math.round((m.count / total) * 100)}%` : '0%'}
                  </span>
                </div>
                <div style={{
                  height: '4px',
                  width: '100%',
                  backgroundColor: 'var(--border-subtle)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: total > 0 ? `${Math.min(100, (m.count / total) * 100)}%` : '0%',
                    background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kriteria Tiket OTRS Breakdown Section (BSI Infoblox) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-purple)',
            }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  Klasifikasi Kriteria Tiket OTRS (BSI Infoblox)
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}>
                  OP0899 &bull; OP0968
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Pemetaan tiket operasional DDI (DNS, DHCP, IPAM) & Standby DRP Bank Syariah Indonesia
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveKriteria('ALL');
              setActiveFilterStatus('ALL');
              setCurrentView('tickets');
            }}
            className="btn btn-outline btn-sm hover-glow"
          >
            <span>Buka Semua Tiket Terklasifikasi</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* DNS Request Card */}
          <div
            onClick={() => {
              setActiveKriteria('DNS Request');
              setActiveFilterStatus('ALL');
              setCurrentView('tickets');
            }}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#60a5fa';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.28)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                  <Globe size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-info)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  DNS Request
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-info)' }}>
                {tickets.filter(t => t.kriteria === 'DNS Request').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Permintaan pembuatan & pembaruan DNS record (A, CNAME, PTR)
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                A Record: {tickets.filter(t => t.kriteria === 'DNS Request' && t.subKriteria?.includes('A Record')).length}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                CNAME: {tickets.filter(t => t.kriteria === 'DNS Request' && t.subKriteria?.includes('CNAME')).length}
              </span>
            </div>
          </div>

          {/* Reserve IP Card */}
          <div
            onClick={() => {
              setActiveKriteria('Reserve IP');
              setActiveFilterStatus('ALL');
              setCurrentView('tickets');
            }}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fbbf24';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.28)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                  <Server size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-warning)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Reserve IP
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-warning)' }}>
                {tickets.filter(t => t.kriteria === 'Reserve IP').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Reservasi Fixed Address & IP DHCP server / host Infoblox
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                Fixed Address / Reserved IP
              </span>
            </div>
          </div>

          {/* DRP (Standby) Card */}
          <div
            onClick={() => {
              setActiveKriteria('DRP');
              setActiveFilterStatus('ALL');
              setCurrentView('tickets');
            }}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#c084fc';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.28)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-purple-bg)', color: 'var(--color-purple)' }}>
                  <Shield size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-purple)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  DRP (Standby)
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-purple)' }}>
                {tickets.filter(t => t.kriteria === 'DRP').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Pendampingan teknis & standby deployment sistem kritis BSI
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--color-purple-bg)', color: 'var(--color-purple)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                Go UMKM &bull; Procsyst &bull; WISE
              </span>
            </div>
          </div>

          {/* IPAM Card */}
          <div
            onClick={() => {
              setActiveKriteria('IPAM');
              setActiveFilterStatus('ALL');
              setCurrentView('tickets');
            }}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-success)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-success-border)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                  <Network size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  IPAM
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-success)' }}>
                {tickets.filter(t => t.kriteria === 'IPAM').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Manajemen subnetting, range pool, & alokasi IP enterprise
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                Billing Hasanah &bull; Medallion
              </span>
            </div>
          </div>

          {/* Other Kriteria Card */}
          <div
            onClick={() => {
              setActiveKriteria('Other');
              setActiveFilterStatus('ALL');
              setCurrentView('tickets');
            }}
            style={{
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, var(--bg-card) 100%)',
              border: '1px solid var(--border-medium)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-secondary)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(148, 163, 184, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  <MoreHorizontal size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  OTHER
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {tickets.filter(t => t.kriteria === 'Other').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Tiket umum, laporan koordinasi meeting, & operasional pendukung
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Report & Meeting &bull; General Support
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Peak Ticket Diagram */}
      <MonthlyTicketChart />

      {/* Analytics & Distribution Grid */}
      <div className="dashboard-analytics-grid" style={{ display: 'grid', gap: '20px' }}>
        {/* Category Breakdown & Status Velocity */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ minWidth: '180px', flex: 1 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                Ticket Classification Distribution
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Main ITIL Categories mapped across active workload
              </p>
            </div>
            <button
              onClick={() => setCurrentView('categories')}
              className="btn btn-outline btn-sm hover-glow"
              style={{ fontSize: '0.75rem', flexShrink: 0 }}
            >
              <Zap size={14} />
              View Rule Engine
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const catColors: Record<string, string> = {
                Incident: 'var(--color-danger)',
                'Service Request': 'var(--accent-cyan)',
                Problem: 'var(--color-warning)',
                'Change Request': 'var(--color-purple)',
                Maintenance: 'var(--color-success)',
              };
              const color = catColors[cat] || 'var(--accent-primary)';
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {count} tickets <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>({pct}%)</strong>
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    width: '100%',
                    borderRadius: '100px',
                    backgroundColor: 'var(--bg-input)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: '100px',
                      backgroundColor: color,
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA & Priority Matrix */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
              Operational Performance
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '20px' }}>
              SLA Compliance & Priority Triage
            </p>

            {/* SLA Gauge Card */}
            <div style={{
              padding: '18px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  SLA Achievement
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: slaAchievementRate >= 95 ? 'var(--color-success)' : 'var(--color-warning)', lineHeight: 1.1, marginTop: '4px', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  {slaAchievementRate}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Target: &gt; 95% (PRD Sec 5)
                </div>
              </div>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: slaAchievementRate >= 95
                  ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 70%)'
                  : 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 70%)',
                border: `4px solid ${slaAchievementRate >= 95 ? 'var(--color-success)' : 'var(--color-warning)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                boxShadow: `0 0 16px ${slaAchievementRate >= 95 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              }}>
                OK
              </div>
            </div>

            {/* Priority Bars */}
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Priority Distribution
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as TicketPriority[]).map(p => {
                const count = priorityCounts[p];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`badge ${getPriorityBadgeClass(p)}`} style={{ fontSize: '0.7rem', padding: '3px 10px' }}>
                      {p}
                    </span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setCurrentView('sla')}
            className="btn btn-secondary btn-sm hover-glow"
            style={{ width: '100%', marginTop: '20px' }}
          >
            Open SLA Monitor
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent 10 Tickets (PRD Section 10) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Recent Operational Feed (Top 10)
              </h3>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                boxShadow: '0 0 8px var(--color-success)',
              }} className="animate-pulse" />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Live stream of newly synchronized and updated tickets from OTRS / iCare
            </p>
          </div>
          <button
            onClick={() => setCurrentView('tickets')}
            className="btn btn-outline btn-sm hover-glow"
          >
            <span>View All Tickets ({total})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Tech Area</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>SLA Deadline</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.map(ticket => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  className="ticket-row-clickable"
                >
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="ticket-number-chip">{ticket.ticketNumber}</span>
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {ticket.externalId}
                    </div>
                  </td>
                  <td style={{ maxWidth: '320px' }}>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {ticket.subject}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Req: {ticket.requester}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {ticket.mainCategory}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-primary-light)',
                      color: 'var(--text-accent)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                    }}>
                      {ticket.technicalCategory}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    {ticket.assigneeName ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-purple-bg)',
                          color: 'var(--color-purple)',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {ticket.assigneeName.charAt(0)}
                        </span>
                        {ticket.assigneeName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.76rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${getSLABadgeClass(ticket.slaStatus)}`}>
                      {ticket.slaStatus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                      }}
                      className="btn btn-outline btn-sm hover-glow"
                      style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
