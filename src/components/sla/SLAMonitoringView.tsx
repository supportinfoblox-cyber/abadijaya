'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { SLAPolicyConfig, SLAStatus, TicketPriority } from '@/types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Settings,
  CheckCircle,
  Save,
} from 'lucide-react';

export default function SLAMonitoringView() {
  const { tickets, slaPolicy, updateSLAPolicy, setSelectedTicket, can } = useTicketOps();

  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [formPolicy, setFormPolicy] = useState<SLAPolicyConfig>(slaPolicy);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Group tickets by SLA Status (excluding resolved/closed unless breached)
  const safeTickets = tickets.filter(t => t.slaStatus === 'SAFE' && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
  const warningTickets = tickets.filter(t => t.slaStatus === 'WARNING' && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
  const criticalTickets = tickets.filter(t => t.slaStatus === 'CRITICAL' && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
  const breachedTickets = tickets.filter(t => t.slaStatus === 'BREACHED' && t.status !== 'CLOSED' && t.status !== 'RESOLVED');

  const totalActive = safeTickets.length + warningTickets.length + criticalTickets.length + breachedTickets.length;
  const compliantPct = totalActive > 0 ? Math.round(((totalActive - breachedTickets.length) / totalActive) * 100) : 100;

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    updateSLAPolicy(formPolicy);
    setIsEditingPolicy(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const renderTicketCard = (ticket: any, statusColor: string) => {
    const dueTime = new Date(ticket.dueAt);
    const now = new Date();
    const diffMin = Math.round((dueTime.getTime() - now.getTime()) / (1000 * 60));
    const isOverdue = diffMin < 0;

    return (
      <div
        key={ticket.id}
        onClick={() => setSelectedTicket(ticket)}
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-elevated)',
          border: `1px solid var(--border-subtle)`,
          borderLeft: `3px solid ${statusColor}`,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'all var(--transition-fast)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = statusColor;
          e.currentTarget.style.boxShadow = `var(--shadow-md), 0 0 12px ${statusColor}28`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.borderLeftColor = statusColor;
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="ticket-number-chip">
            {ticket.ticketNumber}
          </span>
          <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
            {ticket.priority}
          </span>
        </div>

        <div style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.3,
        }}>
          {ticket.subject}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{ticket.assigneeName || 'Unassigned'}</span>
          <span style={{
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isOverdue ? 'var(--color-danger-bg)' : diffMin < 60 ? 'var(--color-orange-bg)' : 'var(--color-success-bg)',
            color: isOverdue ? 'var(--color-danger)' : diffMin < 60 ? 'var(--color-orange)' : 'var(--color-success)',
          }}>
            {isOverdue ? `−${Math.abs(diffMin)}m` : `+${diffMin}m`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* SLA Policy Header & Config Toggle */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-purple-bg)', color: 'var(--color-purple)' }}>
                <ShieldAlert size={20} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                SLA Compliance Matrix & Policy Control (PRD Section 15)
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Live threshold monitoring: SAFE &bull; WARNING (&lt;35% window) &bull; CRITICAL (&lt;15% window) &bull; BREACHED (Overdue)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Compliance Rate:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: compliantPct >= 95 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {compliantPct}%
              </span>
            </div>

            {can('dashboard') && (
              <button
                onClick={() => setIsEditingPolicy(!isEditingPolicy)}
                className="btn btn-secondary btn-sm"
              >
                <Settings size={14} />
                <span>{isEditingPolicy ? 'Close Config' : 'Configure SLA Policy'}</span>
              </button>
            )}
          </div>
        </div>

        {/* SLA Policy Editor Card */}
        {isEditingPolicy && (
          <form onSubmit={handleSavePolicy} style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Edit Global SLA Target Hours by Priority (Default: 4h, 8h, 24h, 72h)
            </h4>
            <div className="grid-cols-4" style={{ marginBottom: '14px' }}>
              <div>
                <label className="form-label" style={{ color: 'var(--color-danger)' }}>CRITICAL Target (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={formPolicy.CRITICAL}
                  onChange={e => setFormPolicy({ ...formPolicy, CRITICAL: Number(e.target.value) })}
                  className="form-control"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ color: 'var(--color-orange)' }}>HIGH Target (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={formPolicy.HIGH}
                  onChange={e => setFormPolicy({ ...formPolicy, HIGH: Number(e.target.value) })}
                  className="form-control"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ color: 'var(--color-warning)' }}>MEDIUM Target (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formPolicy.MEDIUM}
                  onChange={e => setFormPolicy({ ...formPolicy, MEDIUM: Number(e.target.value) })}
                  className="form-control"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ color: 'var(--color-info)' }}>LOW Target (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={formPolicy.LOW}
                  onChange={e => setFormPolicy({ ...formPolicy, LOW: Number(e.target.value) })}
                  className="form-control"
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setIsEditingPolicy(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} />
                Save & Recalculate Active Tickets
              </button>
            </div>
          </form>
        )}

        {saveSuccess && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <CheckCircle size={14} />
            SLA Policy updated successfully!
          </div>
        )}
      </div>

      {/* 4-Column Realtime SLA Threat Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
      }}>
        {/* Column 1: BREACHED */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={16} color="var(--color-danger)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                BREACHED
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
            }}>
              {breachedTickets.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {breachedTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No breached tickets! Excellent SLA discipline.
              </div>
            ) : (
              breachedTickets.map(t => renderTicketCard(t, 'var(--color-danger)'))
            )}
          </div>
        </div>

        {/* Column 2: CRITICAL */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} color="var(--color-orange)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-orange)' }}>
                CRITICAL (&lt;15% Time)
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-orange-bg)',
              color: 'var(--color-orange)',
            }}>
              {criticalTickets.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {criticalTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No tickets in critical countdown.
              </div>
            ) : (
              criticalTickets.map(t => renderTicketCard(t, 'var(--color-orange)'))
            )}
          </div>
        </div>

        {/* Column 3: WARNING */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--color-warning)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                WARNING (&lt;35% Time)
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
            }}>
              {warningTickets.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {warningTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No tickets in warning status.
              </div>
            ) : (
              warningTickets.map(t => renderTicketCard(t, 'var(--color-warning)'))
            )}
          </div>
        </div>

        {/* Column 4: SAFE */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="var(--color-success)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>
                SAFE (On Track)
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
            }}>
              {safeTickets.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {safeTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No active tickets in safe window.
              </div>
            ) : (
              safeTickets.map(t => renderTicketCard(t, 'var(--color-success)'))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
