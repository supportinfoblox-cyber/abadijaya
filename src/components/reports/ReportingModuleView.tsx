'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import MonthlyTicketChart from '@/components/dashboard/MonthlyTicketChart';
import { exportTicketsToCsv } from '@/services/exportCsv';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

export default function ReportingModuleView() {
  const { tickets, worklogs, users } = useTicketOps();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Daily Metrics
  const dailyTotal = tickets.length;
  const dailyResolved = tickets.filter(t => t.status === 'RESOLVED').length;
  const dailyClosed = tickets.filter(t => t.status === 'CLOSED').length;
  const dailyPending = tickets.filter(t => t.status === 'PENDING').length;
  const dailyInProgress = tickets.filter(t => t.status === 'IN PROGRESS').length;
  const dailyOverdue = tickets.filter(
    t => t.slaStatus === 'BREACHED' && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  ).length;

  // Engineer leaderboard calculation
  const engineerStats = users
    .filter(u => u.role === 'engineer' || u.role === 'supervisor')
    .map(u => {
      const assigned = tickets.filter(t => t.assigneeId === u.id);
      const resolved = assigned.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
      const userWorklogs = worklogs.filter(w => w.userId === u.id);
      const loggedMinutes = userWorklogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
      return {
        user: u,
        assignedCount: assigned.length,
        resolvedCount: resolved.length,
        loggedHours: (loggedMinutes / 60).toFixed(1),
        completionRate: assigned.length > 0 ? Math.round((resolved.length / assigned.length) * 100) : 100,
      };
    });

  // Export CSV generator using clean UTF-8 BOM Excel-compatible format
  const handleExportCSV = () => {
    exportTicketsToCsv(tickets, `laporan_operasional_${reportType}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                <BarChart3 size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Operational & SLA Reporting Engine (PRD Section 19)
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Automated operational telemetry, engineer performance matrices, and multi-format exports
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Report Mode Tabs */}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
              {(['daily', 'weekly', 'monthly'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: reportType === type ? 'var(--accent-primary)' : 'transparent',
                    color: reportType === type ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {type} Report
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
              <Download size={15} />
              Export CSV
            </button>
            <button onClick={handlePrint} className="btn btn-outline btn-sm">
              <Printer size={15} />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Daily Report View */}
      {reportType === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-cols-4">
            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Handled</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>{dailyTotal}</div>
            </div>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>In Progress Work</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>{dailyInProgress}</div>
            </div>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Resolved & Closed</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>{dailyResolved + dailyClosed}</div>
            </div>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overdue Breaches</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e', marginTop: '6px' }}>{dailyOverdue}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Daily Ticket Log Roster
            </h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>SLA State</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: '#818cf8' }}>{t.ticketNumber}</td>
                      <td style={{ fontWeight: 500 }}>{t.subject}</td>
                      <td>{t.mainCategory} &bull; {t.technicalCategory}</td>
                      <td><span className={`badge badge-priority-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                      <td><span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                      <td>{t.assigneeName || 'Unassigned'}</td>
                      <td><span className={`badge badge-sla-${t.slaStatus.toLowerCase()}`}>{t.slaStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Report View */}
      {reportType === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Weekly Throughput & Velocity Summary
            </h4>
            <div className="grid-cols-2">
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Closure Velocity</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', margin: '6px 0' }}>
                  {dailyTotal > 0 ? Math.round(((dailyResolved + dailyClosed) / dailyTotal) * 100) : 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total tickets resolved or closed against overall active backlog
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SLA Compliance Benchmark</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: dailyOverdue === 0 ? '#10b981' : '#f59e0b', margin: '6px 0' }}>
                  {dailyTotal > 0 ? Math.round(((dailyTotal - dailyOverdue) / dailyTotal) * 100) : 100}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Exceeding target benchmark of &gt;95% SLA compliance
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report View */}
      {reportType === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Engineer Operational Performance Leaderboard
            </h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Engineer</th>
                    <th>Role</th>
                    <th>Assigned Tickets</th>
                    <th>Resolved / Closed</th>
                    <th>Completion Rate</th>
                    <th>Total Logged Work</th>
                  </tr>
                </thead>
                <tbody>
                  {engineerStats.map(s => (
                    <tr key={s.user.id}>
                      <td style={{ fontWeight: 600 }}>{s.user.name}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-elevated)' }}>
                          {s.user.role}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{s.assignedCount}</td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>{s.resolvedCount}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.825rem' }}>{s.completionRate}%</span>
                          <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${s.completionRate}%`, height: '100%', backgroundColor: '#6366f1' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#818cf8' }}>{s.loggedHours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Peak Ticket Diagram */}
      <MonthlyTicketChart />
    </div>
  );
}
