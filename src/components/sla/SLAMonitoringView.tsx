'use client';

import { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { SLAPolicyConfig } from '@/types';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Settings,
  CheckCircle,
  Save,
  Activity,
  Check,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Executive Header & Policy Control */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-purple-bg)', color: 'var(--color-purple)' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Monitoring Kepatuhan & Batas Waktu SLA
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                  Pemantauan real-time ambang batas penanganan insiden berdasarkan prioritas tiket aktif
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {can('dashboard') && (
              <button
                onClick={() => setIsEditingPolicy(!isEditingPolicy)}
                className="btn btn-secondary btn-sm"
              >
                <Settings size={14} />
                <span>{isEditingPolicy ? 'Tutup Konfigurasi' : 'Konfigurasi Target SLA'}</span>
              </button>
            )}
          </div>
        </div>

        {/* SLA Policy Editor */}
        {isEditingPolicy && (
          <form onSubmit={handleSavePolicy} style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Ubah Target Waktu Penyelesaian SLA (Jam) per Prioritas
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div>
                <label className="form-label" style={{ color: 'var(--color-danger)' }}>CRITICAL (Jam)</label>
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
                <label className="form-label" style={{ color: 'var(--color-orange)' }}>HIGH (Jam)</label>
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
                <label className="form-label" style={{ color: 'var(--color-warning)' }}>MEDIUM (Jam)</label>
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
                <label className="form-label" style={{ color: 'var(--color-info)' }}>LOW (Jam)</label>
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
                Batal
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} />
                Simpan & Hitung Ulang SLA
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
            Target SLA berhasil diperbarui!
          </div>
        )}
      </div>

      {/* KPI Overview Summary Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
      }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: compliantPct >= 90 ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
            color: compliantPct >= 90 ? 'var(--color-success)' : 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tingkat Kepatuhan SLA
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: compliantPct >= 90 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {compliantPct}%
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--color-info)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Tiket Terbuka
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalActive}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Check size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Aman (Sesuai Target)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>
              {safeTickets.length}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: (breachedTickets.length + criticalTickets.length) > 0 ? 'var(--color-danger-bg)' : 'var(--bg-elevated)',
            color: (breachedTickets.length + criticalTickets.length) > 0 ? 'var(--color-danger)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AlertOctagon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Kritis / Melewati Batas
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (breachedTickets.length + criticalTickets.length) > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
              {breachedTickets.length + criticalTickets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Responsive SLA Threat Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
      }}>
        {/* Kolom 1: BREACHED */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={16} color="var(--color-danger)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                LEWAT SLA (BREACHED)
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
                Tidak ada tiket yang melewati batas SLA.
              </div>
            ) : (
              breachedTickets.map(t => renderTicketCard(t, 'var(--color-danger)'))
            )}
          </div>
        </div>

        {/* Kolom 2: CRITICAL */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} color="var(--color-orange)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-orange)' }}>
                KRITIS (&lt;15% Waktu)
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
                Tidak ada tiket dalam rentang kritis.
              </div>
            ) : (
              criticalTickets.map(t => renderTicketCard(t, 'var(--color-orange)'))
            )}
          </div>
        </div>

        {/* Kolom 3: WARNING */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--color-warning)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                PERINGATAN (&lt;35% Waktu)
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
                Tidak ada tiket dalam rentang peringatan.
              </div>
            ) : (
              warningTickets.map(t => renderTicketCard(t, 'var(--color-warning)'))
            )}
          </div>
        </div>

        {/* Kolom 4: SAFE */}
        <div className="glass-panel" style={{ padding: '16px', borderTop: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="var(--color-success)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>
                AMAN (ON TRACK)
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
                Tidak ada tiket dalam antrean aman.
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
