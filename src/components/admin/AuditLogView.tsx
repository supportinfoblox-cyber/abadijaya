'use client';

import { useState, useMemo } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  FileSpreadsheet,
  Search,
  Download,
  Lock,
  Inbox,
  CheckCircle2,
  Clock,
  UserCheck,
  Filter,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function AuditLogView() {
  const { auditLogs, can } = useTicketOps();

  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'CLOSURES' | 'UPDATES' | 'SYNC'>('ALL');

  // Stats calculation
  const stats = useMemo(() => {
    const totalLogs = auditLogs.length;
    const closureLogs = auditLogs.filter(l => l.action.includes('CLOSE'));
    const latestClosure = closureLogs[0] || null;

    return {
      totalLogs,
      closureCount: closureLogs.length,
      latestClosure,
    };
  }, [auditLogs]);

  if (!can('auditLog')) {
    return (
      <div className="glass-panel" style={{ padding: '64px 32px', textAlign: 'center' }}>
        <div style={{
          padding: '16px',
          borderRadius: '50%',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          width: '56px',
          height: '56px',
          margin: '0 auto 20px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(244, 63, 94, 0.25)',
        }}>
          <Lock size={28} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Access Restricted: Administrator & Supervisor Only
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '10px auto 0 auto', lineHeight: 1.6 }}>
          Per PRD Section 7 & 8, System Audit Logs and Compliance Ledgers are strictly restricted to Administrators and Supervisors.
        </p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    if (selectedModule !== 'ALL' && log.module !== selectedModule) return false;

    if (actionFilter === 'CLOSURES' && !log.action.includes('CLOSE')) return false;
    if (actionFilter === 'UPDATES' && !log.action.includes('UPDATE') && !log.action.includes('STATUS')) return false;
    if (actionFilter === 'SYNC' && !log.action.includes('SYNC') && !log.action.includes('INTEGRATION')) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchEntity = log.entityId.toLowerCase().includes(q);
      const matchOld = log.oldValue?.toLowerCase().includes(q) || false;
      const matchNew = log.newValue?.toLowerCase().includes(q) || false;
      if (!matchAction && !matchUser && !matchEntity && !matchOld && !matchNew) return false;
    }
    return true;
  });

  const exportAuditCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Waktu / Timestamp,User / Operator,Role,Aksi / Action,Module,Target Entity,Old Value,New Value,IP Address\n';
    filteredLogs.forEach(l => {
      const dateWIB = new Date(l.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      csv += `"${dateWIB}","${l.userName}","${l.role}","${l.action}","${l.module}","${l.entityId}","${(l.oldValue || '').replace(/"/g, '""')}","${(l.newValue || '').replace(/"/g, '""')}","${l.ipAddress}"\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `ticketops_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getActionBadge = (action: string) => {
    let bg = 'var(--color-purple-bg)';
    let text = 'var(--color-purple)';
    let border = 'rgba(99, 102, 241, 0.25)';

    if (action.includes('CLOSE') || action.includes('RESOLVE')) {
      bg = 'var(--color-success-bg)';
      text = 'var(--color-success)';
      border = 'rgba(16, 185, 129, 0.3)';
    } else if (action.includes('REOPEN')) {
      bg = 'rgba(59, 130, 246, 0.15)';
      text = '#60a5fa';
      border = 'rgba(59, 130, 246, 0.3)';
    } else if (action.includes('INTEGRATION') || action.includes('SYNC')) {
      bg = 'var(--color-info-bg)';
      text = 'var(--color-info)';
      border = 'rgba(6, 182, 212, 0.3)';
    } else if (action.includes('DELETE') || action.includes('BREACH')) {
      bg = 'var(--color-danger-bg)';
      text = 'var(--color-danger)';
      border = 'rgba(244, 63, 94, 0.3)';
    } else if (action.includes('UPDATE') || action.includes('ASSIGN')) {
      bg = 'var(--color-warning-bg)';
      text = 'var(--color-warning)';
      border = 'rgba(245, 158, 11, 0.3)';
    }

    return (
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: '6px',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}>
        {action.includes('CLOSE') && <CheckCircle2 size={11} />}
        {action.includes('REOPEN') && <RefreshCw size={11} />}
        {action}
      </span>
    );
  };

  const formatDateTimeWIB = (timestampStr: string) => {
    try {
      const d = new Date(timestampStr);
      const time = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      const date = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      return { time: `${time} WIB`, date };
    } catch {
      return { time: timestampStr, date: '' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  System Audit Trail & Compliance Ledger
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  border: '1px solid var(--color-success-border)',
                }}>
                  IMMUTABLE
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Log verifikasi peristiwa mencakup transisi status, waktu close tiket, identitas user penutup, dan integrasi iCare
              </p>
            </div>
          </div>

          <button onClick={exportAuditCSV} className="btn btn-secondary btn-sm hover-glow" style={{ fontSize: '0.8rem' }}>
            <Download size={15} />
            <span>Export Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--color-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Peristiwa Audit</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalLogs}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid var(--color-success)' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tiket Ditutup (Closed)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-success)' }}>{stats.closureCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock size={22} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Penutupan Terakhir</div>
            {stats.latestClosure ? (
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                #{stats.latestClosure.entityId} oleh <span style={{ color: 'var(--color-purple)' }}>{stats.latestClosure.userName}</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {formatDateTimeWIB(stats.latestClosure.timestamp).time}, {formatDateTimeWIB(stats.latestClosure.timestamp).date}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada penutupan</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          {/* Quick Action Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActionFilter('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: actionFilter === 'ALL' ? 'var(--color-purple)' : 'var(--bg-elevated)',
                color: actionFilter === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                borderColor: actionFilter === 'ALL' ? 'var(--color-purple)' : 'var(--border-subtle)',
              }}
            >
              Semua Log ({auditLogs.length})
            </button>

            <button
              onClick={() => setActionFilter('CLOSURES')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                backgroundColor: actionFilter === 'CLOSURES' ? 'var(--color-success)' : 'rgba(16, 185, 129, 0.1)',
                color: actionFilter === 'CLOSURES' ? '#ffffff' : 'var(--color-success)',
                borderColor: actionFilter === 'CLOSURES' ? 'var(--color-success)' : 'rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={13} />
              <span>Penutupan Tiket ({stats.closureCount})</span>
            </button>

            <button
              onClick={() => setActionFilter('UPDATES')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: actionFilter === 'UPDATES' ? 'var(--color-warning)' : 'var(--bg-elevated)',
                color: actionFilter === 'UPDATES' ? '#ffffff' : 'var(--text-secondary)',
                borderColor: actionFilter === 'UPDATES' ? 'var(--color-warning)' : 'var(--border-subtle)',
              }}
            >
              Perubahan Status / Update
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px', minWidth: '260px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari aksi, nama user penutup, ID tiket..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value)}
                className="form-control"
                style={{ width: '140px', height: '38px', fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <option value="ALL">Semua Modul</option>
                <option value="Ticket">Ticket</option>
                <option value="Worklog">Worklog</option>
                <option value="Integration">Integration</option>
                <option value="User">User</option>
                <option value="RuleEngine">Rule Engine</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Waktu Kejadian (Time Close)</th>
                <th>User / Operator Penutup</th>
                <th>Aksi / Status Event</th>
                <th>Modul</th>
                <th>Target Tiket / Entitas</th>
                <th>Rincian Transisi & Perubahan</th>
                <th style={{ textAlign: 'right' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                      color: 'var(--color-purple)',
                    }}>
                      <Inbox size={22} />
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Tidak ada catatan audit yang sesuai dengan filter
                    </div>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      Coba sesuaikan kata kunci pencarian atau pilih tab filter lain.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isClosure = log.action.includes('CLOSE');
                  const { time, date } = formatDateTimeWIB(log.timestamp);

                  return (
                    <tr
                      key={log.id}
                      className="table-row-hover"
                      style={{
                        backgroundColor: isClosure ? 'rgba(16, 185, 129, 0.03)' : undefined,
                        borderLeft: isClosure ? '3px solid var(--color-success)' : undefined,
                      }}
                    >
                      {/* Timestamp & Time Close */}
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <div style={{
                          fontWeight: isClosure ? 700 : 600,
                          color: isClosure ? 'var(--color-success)' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}>
                          {isClosure && <Clock size={12} />}
                          <span>{time}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {date}
                        </div>
                      </td>

                      {/* User / Operator */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: isClosure ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            color: isClosure ? 'var(--color-success)' : 'var(--color-purple)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {log.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                              {log.userName}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                              {log.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td>
                        {getActionBadge(log.action)}
                      </td>

                      {/* Module */}
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-elevated)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          {log.module}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--color-purple)', whiteSpace: 'nowrap' }}>
                        <code>{log.entityId}</code>
                      </td>

                      {/* Transition / Details */}
                      <td style={{ fontSize: '0.8rem', maxWidth: '380px' }}>
                        {isClosure ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
                              Tiket ditutup resmi pada {time} oleh <strong>{log.userName}</strong>
                            </div>
                            {(log.oldValue || log.newValue) && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {log.oldValue && <span>Dari: <code>{log.oldValue}</code> &rarr; </span>}
                                {log.newValue && <span style={{ color: 'var(--text-primary)' }}>Ke: <code>{log.newValue}</code></span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {log.oldValue && (
                              <span style={{ color: 'var(--text-muted)' }}>
                                From: <code style={{ color: 'var(--color-warning)', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'var(--color-warning-bg)' }}>{log.oldValue}</code> &rarr;{' '}
                              </span>
                            )}
                            {log.newValue && (
                              <span style={{ color: 'var(--text-primary)' }}>
                                To: <code style={{ color: 'var(--color-success)', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'var(--color-success-bg)' }}>{log.newValue}</code>
                              </span>
                            )}
                            {!log.oldValue && !log.newValue && (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>Direct execution event</span>
                            )}
                          </>
                        )}
                      </td>

                      {/* IP Address */}
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {log.ipAddress}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
