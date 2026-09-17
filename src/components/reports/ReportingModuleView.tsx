'use client';

import { useState, useRef, useEffect } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import MonthlyTicketChart from '@/components/dashboard/MonthlyTicketChart';
import { exportTicketsToCsv } from '@/services/exportCsv';
import { exportTicketsToExcel } from '@/services/exportExcel';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Moon,
  Sun,
  ChevronDown,
  Monitor,
} from 'lucide-react';


export default function ReportingModuleView() {
  const { tickets, worklogs, users, currentUser } = useTicketOps();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setShowPrintMenu(false);
      }
    };
    if (showPrintMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPrintMenu]);

  // Daily Metrics
  const dailyTotal = tickets.length;
  const dailyResolved = tickets.filter(t => t.status === 'RESOLVED').length;
  const dailyClosed = tickets.filter(t => t.status === 'CLOSED').length;
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

  // Export Excel generator
  const handleExportExcel = () => {
    exportTicketsToExcel(tickets, {
      filenamePrefix: `laporan_operasional_${reportType}`,
      filterLabel: `${reportType.toUpperCase()} Operational Telemetry`,
    });
  };

  const getActiveTheme = (): 'light' | 'dark' => {
    if (typeof document !== 'undefined') {
      const cur = document.documentElement.getAttribute('data-theme');
      if (cur === 'light') return 'light';
      if (cur === 'dark') return 'dark';
    }
    return 'light';
  };

  const executePrint = (themeMode: 'dark' | 'light') => {
    setShowPrintMenu(false);

    // Temporarily remove inline marginLeft from .main-content so @media print CSS takes full effect
    const mainContent = document.querySelector<HTMLElement>('.main-content');
    const originalMarginLeft = mainContent ? mainContent.style.marginLeft : null;
    if (mainContent) {
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    }

    if (themeMode === 'light') {
      document.body.classList.add('print-light-mode');
      document.body.classList.remove('print-dark-mode');
    } else {
      document.body.classList.add('print-dark-mode');
      document.body.classList.remove('print-light-mode');
    }

    // Small delay to let the browser re-render DOM changes before print dialog
    setTimeout(() => {
      window.print();
    }, 150);

    // Reset after print dialog closes
    const handleAfterPrint = () => {
      document.body.classList.remove('print-light-mode');
      document.body.classList.remove('print-dark-mode');
      if (mainContent && originalMarginLeft !== null) {
        mainContent.style.marginLeft = originalMarginLeft;
        mainContent.style.width = '';
      }
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Official Print Document Header (Visible only when printed) */}
      <div className="print-only" style={{ marginBottom: '18px', borderBottom: '2px solid rgba(99, 102, 241, 0.4)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}>
              <img src="/logo-icon.png" alt="Portal Abadi Jaya" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Portal Abadi Jaya Enterprise
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Operational & SLA Reporting Engine (Telemetry Matrix)
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Laporan:</strong> {reportType.toUpperCase()} Operational Telemetry</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dicetak:</strong> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</div>
            {currentUser && <div><strong style={{ color: 'var(--text-primary)' }}>Operator:</strong> {currentUser.name} ({currentUser.role})</div>}
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: '22px', overflow: 'visible', position: 'relative', zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-purple-bg)', color: 'var(--color-purple)' }}>
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

          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="btn btn-sm"
              style={{
                backgroundColor: 'var(--color-success-bg)',
                borderColor: 'var(--color-success-border)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
              title="Export Laporan Telemetri Lengkap ke Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              Export Excel
            </button>

            {/* Export CSV Button */}
            <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
              <Download size={15} />
              Export CSV
            </button>

            {/* Print Button with Dropdown Options */}
            <div ref={printMenuRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => executePrint(getActiveTheme())}
                  className="btn btn-outline btn-sm"
                  style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  title={`Cetak Laporan Sesuai Tema Aktif (${getActiveTheme() === 'light' ? 'Mode Cerah' : 'Mode Gelap'})`}
                >
                  <Printer size={15} />
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintMenu(prev => !prev);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderLeft: 'none',
                    padding: '0 8px',
                  }}
                  title="Pilihan Format & Tema Cetak"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {showPrintMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '8px',
                    width: '280px',
                    zIndex: 9999,
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pilih Format Cetak
                  </div>

                  {/* Sesuai Tema Web Aktif */}
                  <button
                    onClick={() => executePrint(getActiveTheme())}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Monitor size={16} color="var(--accent-primary)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Sesuai Tema Aktif ({getActiveTheme() === 'light' ? 'Cerah' : 'Gelap'})</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Mengikuti tampilan layar Anda saat ini</div>
                    </div>
                  </button>

                  {/* Tema Cerah (Kertas Putih) */}
                  <button
                    onClick={() => executePrint('light')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Sun size={16} color="var(--color-warning)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Tema Cerah (Kertas Putih)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Hemat tinta printer, latar putih bersih</div>
                    </div>
                  </button>

                  {/* Tema Gelap (Dark Mode Asli) */}
                  <button
                    onClick={() => executePrint('dark')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Moon size={16} color="var(--color-purple)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Tema Gelap (Dark Mode Asli)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Sesuai warna asli dark mode & diagram</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Daily Report View */}
      {reportType === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-cols-4">
            {[
              { label: 'Total Handled', value: dailyTotal, color: 'var(--accent-primary)', icon: '📋' },
              { label: 'In Progress', value: dailyInProgress, color: 'var(--color-warning)', icon: '⚙️' },
              { label: 'Resolved & Closed', value: dailyResolved + dailyClosed, color: 'var(--color-success)', icon: '✓' },
              { label: 'Overdue Breaches', value: dailyOverdue, color: 'var(--color-danger)', icon: '⚠' },
            ].map(m => (
              <div key={m.label} className="glass-panel" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`,
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: m.value > 0 ? m.color : 'var(--text-muted)', marginTop: '8px', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{m.value}</div>
              </div>
            ))}
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
                      <td><span className="ticket-number-chip">{t.ticketNumber}</span></td>
                      <td style={{ fontWeight: 500 }}>{t.subject}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{t.mainCategory} · {t.technicalCategory}</td>
                      <td><span className={`badge badge-priority-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                      <td><span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.assigneeName || '—'}</td>
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
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)', margin: '6px 0' }}>
                  {dailyTotal > 0 ? Math.round(((dailyResolved + dailyClosed) / dailyTotal) * 100) : 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total tickets resolved or closed against overall active backlog
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SLA Compliance Benchmark</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: dailyOverdue === 0 ? 'var(--color-success)' : 'var(--color-warning)', margin: '6px 0' }}>
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
                      <td style={{ fontWeight: 700 }}>{s.user.name}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {s.user.role}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.assignedCount}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.resolvedCount}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: s.completionRate >= 90 ? 'var(--color-success)' : s.completionRate >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{s.completionRate}%</span>
                          <div style={{ width: '80px', height: '5px', backgroundColor: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${s.completionRate}%`,
                              height: '100%',
                              background: s.completionRate >= 90 ? 'linear-gradient(90deg, var(--color-success), #34d399)' : s.completionRate >= 70 ? 'linear-gradient(90deg, var(--color-warning), var(--color-warning-light))' : 'linear-gradient(90deg, var(--color-danger), #fb7185)',
                              borderRadius: '3px',
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-purple)', fontFamily: 'var(--font-mono)' }}>{s.loggedHours}h</td>
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
