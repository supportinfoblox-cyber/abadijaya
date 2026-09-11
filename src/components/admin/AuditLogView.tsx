'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  FileSpreadsheet,
  Search,
  Filter,
  ShieldCheck,
  Download,
  Lock,
  History,
  Activity,
  UserCheck,
  Cpu,
  Inbox,
  ArrowRight,
} from 'lucide-react';

export default function AuditLogView() {
  const { auditLogs, can } = useTicketOps();

  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

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
    csv += 'Timestamp,User,Role,Action,Module,Entity ID,Old Value,New Value,IP Address\n';
    filteredLogs.forEach(l => {
      csv += `"${l.timestamp}","${l.userName}","${l.role}","${l.action}","${l.module}","${l.entityId}","${(l.oldValue || '').replace(/"/g, '""')}","${(l.newValue || '').replace(/"/g, '""')}","${l.ipAddress}"\n`;
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
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}>
        {action}
      </span>
    );
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
                Cryptographically verifiable event log recording status transitions, ticket closures, user activities, and iCare syncs
              </p>
            </div>
          </div>

          <button onClick={exportAuditCSV} className="btn btn-secondary btn-sm hover-glow" style={{ fontSize: '0.8rem' }}>
            <Download size={15} />
            <span>Export Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by action, user, entity ID, or values..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Module Filter:</span>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className="form-control"
              style={{ width: '160px', height: '38px', fontSize: '0.8rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Modules</option>
              <option value="Ticket">Ticket</option>
              <option value="Worklog">Worklog</option>
              <option value="Integration">Integration</option>
              <option value="User">User</option>
              <option value="RuleEngine">Rule Engine</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Timestamp</th>
                <th>User / Operator</th>
                <th>Action</th>
                <th>Module</th>
                <th>Target Entity</th>
                <th>Transition / Details</th>
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
                      No audit records match your query
                    </div>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      Try adjusting your search terms or selecting a different module filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="table-row-hover">
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.7rem' }}>
                        {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: 'var(--color-purple)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {log.userName.charAt(0)}
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
                    <td>
                      {getActionBadge(log.action)}
                    </td>
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
                    <td style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--color-purple)', whiteSpace: 'nowrap' }}>
                      <code>{log.entityId}</code>
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '340px' }}>
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
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
