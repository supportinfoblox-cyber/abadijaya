'use client';

import React from 'react';
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
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Layers,
  Globe,
  Server,
  Shield,
  Network,
  Sparkles,
  Zap,
  Check,
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
    { label: 'Total Tickets', count: total, color: '#6366f1', glow: 'rgba(99, 102, 241, 0.25)', filter: 'ALL', icon: TicketIcon, trend: '+100% indexed' },
    { label: 'New Inbound', count: newCount, color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.25)', filter: 'NEW', icon: ArrowUpRight, trend: 'Awaiting triage' },
    { label: 'Open Active', count: openCount, color: '#818cf8', glow: 'rgba(129, 140, 248, 0.25)', filter: 'OPEN', icon: Activity, trend: 'Assigned queue' },
    { label: 'In Progress', count: inProgressCount, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)', filter: 'IN PROGRESS', icon: Clock, trend: 'Working active' },
    { label: 'Pending / Hold', count: pendingCount, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)', filter: 'PENDING', icon: Hourglass, trend: 'Waiting input' },
    { label: 'Resolved OK', count: resolvedCount, color: '#10b981', glow: 'rgba(16, 185, 129, 0.25)', filter: 'RESOLVED', icon: CheckCircle2, trend: 'Ready to close' },
    { label: 'Closed Ledger', count: closedCount, color: '#64748b', glow: 'rgba(100, 116, 139, 0.25)', filter: 'CLOSED', icon: ShieldCheck, trend: 'Archived records' },
    { label: 'Overdue Breached', count: overdueCount, color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)', filter: 'OVERDUE', icon: AlertOctagon, trend: overdueCount > 0 ? 'Urgent action' : 'Zero breach' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* SLA Alert Banner if Breached or Critical tickets exist */}
      {(overdueCount > 0 || warningCount > 0) ? (
        <div
          style={{
            padding: '18px 24px',
            borderRadius: 'var(--radius-lg)',
            background: overdueCount > 0
              ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.16) 0%, rgba(15, 23, 42, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: `1px solid ${overdueCount > 0 ? 'rgba(244, 63, 94, 0.45)' : 'rgba(245, 158, 11, 0.45)'}`,
            boxShadow: overdueCount > 0
              ? '0 8px 32px rgba(244, 63, 94, 0.15)'
              : '0 8px 32px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(16px)',
            flexWrap: 'wrap',
            gap: '16px',
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
            backgroundColor: overdueCount > 0 ? '#f43f5e' : '#f59e0b',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: overdueCount > 0 ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: overdueCount > 0 ? '#fb7185' : '#fbbf24',
              boxShadow: `0 0 16px ${overdueCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}>
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: overdueCount > 0 ? '#fb7185' : '#fbbf24', letterSpacing: '-0.01em' }}>
                  Operational SLA Threshold Alert
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: overdueCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)',
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
              backgroundColor: overdueCount > 0 ? '#f43f5e' : '#f59e0b',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: `0 4px 14px ${overdueCount > 0 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            }}
          >
            Review At-Risk Tickets
            <ChevronRight size={15} />
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 22, 38, 0.6) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#34d399' }}>
                All SLA Thresholds Compliant
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                Zero tickets breached &bull; Operational Health Score 100%
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span>Telemetry Live &bull; Queue OP0899 / OP0968</span>
          </div>
        </div>
      )}

      {/* Summary Cards Grid (PRD Section 10) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
      }}>
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
                  letterSpacing: '-0.02em',
                }}>
                  {m.count}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>{m.trend}</span>
                  <span style={{ fontWeight: 600, color: m.color }}>
                    {total > 0 ? `${Math.round((m.count / total) * 100)}%` : '0%'}
                  </span>
                </div>
                <div style={{
                  height: '4px',
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
              color: '#818cf8',
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
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(14, 22, 38, 0.7) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#60a5fa';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.28)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                  <Globe size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#93c5fd', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  DNS Request
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#bfdbfe' }}>
                {tickets.filter(t => t.kriteria === 'DNS Request').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Permintaan pembuatan & pembaruan DNS record (A, CNAME, PTR)
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#bfdbfe', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                A Record: {tickets.filter(t => t.kriteria === 'DNS Request' && t.subKriteria?.includes('A Record')).length}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#bfdbfe', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
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
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(14, 22, 38, 0.7) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fbbf24';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.28)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  <Server size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fde68a', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Reserve IP
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fef08a' }}>
                {tickets.filter(t => t.kriteria === 'Reserve IP').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Reservasi Fixed Address & IP DHCP server / host Infoblox
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fef08a', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
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
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(14, 22, 38, 0.7) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#c084fc';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.28)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                  <Shield size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e9d5ff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  DRP (Standby)
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f3e8ff' }}>
                {tickets.filter(t => t.kriteria === 'DRP').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Pendampingan teknis & standby deployment sistem kritis BSI
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#f3e8ff', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
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
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 22, 38, 0.7) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#34d399';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.28)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                  <Network size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a7f3d0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  IPAM
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d1fae5' }}>
                {tickets.filter(t => t.kriteria === 'IPAM').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Manajemen subnetting, range pool, & alokasi IP enterprise
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#d1fae5', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
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
              background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.08) 0%, rgba(14, 22, 38, 0.7) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover-elevate"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(148, 163, 184, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.28)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}>
                  <MoreHorizontal size={15} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  OTHER
                </span>
              </div>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f1f5f9' }}>
                {tickets.filter(t => t.kriteria === 'Other').length}
              </span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '34px' }}>
              Tiket umum, laporan koordinasi meeting, & operasional pendukung
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#f1f5f9', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
                Report & Meeting &bull; General Support
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Peak Ticket Diagram */}
      <MonthlyTicketChart />

      {/* Analytics & Distribution Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Category Breakdown & Status Velocity */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Ticket Classification Distribution
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Main ITIL Categories mapped across active workload
              </p>
            </div>
            <button
              onClick={() => setCurrentView('categories')}
              className="btn btn-outline btn-sm hover-glow"
              style={{ fontSize: '0.75rem' }}
            >
              <Zap size={14} />
              View Rule Engine
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const catColors: Record<string, string> = {
                Incident: '#f43f5e',
                'Service Request': '#06b6d4',
                Problem: '#f59e0b',
                'Change Request': '#8b5cf6',
                Maintenance: '#10b981',
              };
              const color = catColors[cat] || '#6366f1';
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
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}99, ${color})`,
                      borderRadius: '6px',
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Operational Performance
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '20px' }}>
              SLA Compliance & Priority Triage
            </p>

            {/* SLA Gauge Card */}
            <div style={{
              padding: '18px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 22, 38, 0.8) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  SLA Achievement
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: slaAchievementRate >= 95 ? '#10b981' : '#f59e0b', lineHeight: 1.1, marginTop: '4px' }}>
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
                border: `4px solid ${slaAchievementRate >= 95 ? '#10b981' : '#f59e0b'}`,
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
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
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
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
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
                  style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  className="table-row-hover"
                >
                  <td style={{ fontWeight: 700, color: '#818cf8', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{ticket.ticketNumber}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
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
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
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
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: '#818cf8',
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
