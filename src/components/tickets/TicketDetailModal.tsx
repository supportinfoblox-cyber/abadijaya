'use client';

import { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { TicketStatus, MainCategory, TechnicalCategory } from '@/types';
import CloseTicketModal from './CloseTicketModal';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
  Layers,
  Pencil,
  Save,
  Printer,
} from 'lucide-react';

// ── Kriteria options ──────────────────────────────────────────────
const KRITERIA_OPTIONS = ['IPAM', 'Reserve IP', 'DNS Request', 'DRP', 'Other'];

const SUB_KRITERIA_MAP: Record<string, string[]> = {
  'IPAM':       ['Subnet & Segment Allocation', 'VLAN Management', 'IP Pool Management', 'IP Range Request', 'General IPAM'],
  'Reserve IP': ['Reserve IP (Static/DHCP)', 'Fixed Address', 'IP Release', 'IP Reassignment'],
  'DNS Request':['Internal DNS', 'External DNS', 'DNS CNAME', 'DNS PTR / Reverse', 'DNS A Record', 'Load Balancer / VIP', 'General DNS'],
  'DRP':        ['DRP Failover', 'DRP Simulation', 'Disaster Recovery Setup', 'DRC Migration'],
  'Other':      ['General Support', 'Consultation', 'Monitoring', 'Maintenance', 'Other'],
};

const TECHNICAL_CATEGORY_OPTIONS: TechnicalCategory[] = [
  'DNS', 'DHCP', 'Network', 'Server', 'Security', 'Application', 'Infrastructure', 'Database',
];

const MAIN_CATEGORY_OPTIONS: MainCategory[] = [
  'Incident', 'Service Request', 'Problem', 'Change Request', 'Maintenance',
];

export default function TicketDetailModal() {
  const {
    selectedTicket,
    setSelectedTicket,
    transitionStatus,
    assignTicket,
    can,
    currentUser,
    users,
    worklogs,
    addWorklog,
    auditLogs,
    updateTicket,
  } = useTicketOps();

  const [resolutionInput, setResolutionInput] = useState(selectedTicket?.resolutionNote || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'details' | 'worklog' | 'audit'>('details');
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Worklog form state
  const [worklogDate, setWorklogDate] = useState(new Date().toISOString().split('T')[0]);
  const [worklogStart, setWorklogStart] = useState('09:00');
  const [worklogEnd, setWorklogEnd] = useState('10:30');
  const [worklogDesc, setWorklogDesc] = useState('');
  const [worklogDuration, setWorklogDuration] = useState(90);

  // ── Kriteria edit state ──────────────────────────────────────────
  const [isEditingKriteria, setIsEditingKriteria] = useState(false);
  const [editKriteria, setEditKriteria] = useState(selectedTicket?.kriteria || 'Other');
  const [editSubKriteria, setEditSubKriteria] = useState(selectedTicket?.subKriteria || '');
  const [editTechCategory, setEditTechCategory] = useState<TechnicalCategory>(
    (selectedTicket?.technicalCategory as TechnicalCategory) || 'Application'
  );
  const [editMainCategory, setEditMainCategory] = useState<MainCategory>(
    (selectedTicket?.mainCategory as MainCategory) || 'Service Request'
  );

  if (!selectedTicket) return null;

  const ticket = selectedTicket;
  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  // Find ticket specific worklogs & audit logs
  const ticketWorklogs = worklogs.filter(w => w.ticketId === ticket.id || w.ticketNumber === ticket.ticketNumber);
  const ticketAuditLogs = auditLogs.filter(a => a.entityId === ticket.ticketNumber);

  // Status transitions
  const handleTransition = (targetStatus: TicketStatus) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = transitionStatus(ticket.id, targetStatus, resolutionInput);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to update ticket status.');
    } else {
      setSuccessMessage(`Ticket status successfully updated to ${targetStatus}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleAssignChange = (userId: string) => {
    if (!userId) return;
    const res = assignTicket(ticket.id, userId);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to assign ticket.');
    } else {
      setSuccessMessage('Ticket reassigned successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleAddWorklog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!worklogDesc.trim()) {
      setErrorMessage('Please provide a brief description for this worklog.');
      return;
    }

    const res = addWorklog({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: currentUser.id,
      date: worklogDate,
      startTime: worklogStart,
      endTime: worklogEnd,
      description: worklogDesc,
      durationMinutes: Number(worklogDuration),
    });

    if (res.success) {
      setWorklogDesc('');
      setSuccessMessage('Worklog added and synced successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(res.error || 'Failed to save worklog.');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
      <div
        className="modal-content"
        style={{ maxWidth: '850px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="ticket-number-chip" style={{ fontSize: '1.05rem', padding: '3px 10px' }}>
                {ticket.ticketNumber}
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}>
                Ext: {ticket.externalId}
              </span>
              <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>
                {ticket.priority}
              </span>
              <span className={`badge badge-status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                {ticket.status}
              </span>
              <span className={`badge badge-sla-${ticket.slaStatus.toLowerCase()}`}>
                SLA: {ticket.slaStatus}
              </span>
              {ticket.kriteria && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  backgroundColor:
                    ticket.kriteria === 'IPAM' ? 'rgba(16, 185, 129, 0.15)' :
                    ticket.kriteria === 'Reserve IP' ? 'rgba(245, 158, 11, 0.15)' :
                    ticket.kriteria === 'DRP' ? 'rgba(168, 85, 247, 0.15)' :
                    ticket.kriteria === 'DNS Request' ? 'rgba(6, 182, 212, 0.15)' :
                    'var(--bg-elevated)',
                  border: `1px solid ${
                    ticket.kriteria === 'IPAM' ? 'var(--color-success)' :
                    ticket.kriteria === 'Reserve IP' ? 'var(--color-warning)' :
                    ticket.kriteria === 'DRP' ? '#a855f7' :
                    ticket.kriteria === 'DNS Request' ? 'var(--color-info)' :
                    'var(--border-subtle)'
                  }`,
                  color:
                    ticket.kriteria === 'IPAM' ? 'var(--color-success)' :
                    ticket.kriteria === 'Reserve IP' ? 'var(--color-warning)' :
                    ticket.kriteria === 'DRP' ? '#a855f7' :
                    ticket.kriteria === 'DNS Request' ? 'var(--color-info)' :
                    'var(--text-secondary)',
                }}>
                  {ticket.kriteria} {ticket.subKriteria ? `• ${ticket.subKriteria}` : ''}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
              {ticket.subject}
            </h2>
          </div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                const mainContent = document.querySelector<HTMLElement>('.main-content');
                const origMargin = mainContent ? mainContent.style.marginLeft : null;
                if (mainContent) {
                  mainContent.style.marginLeft = '0';
                  mainContent.style.width = '100%';
                }
                window.print();
                const restore = () => {
                  if (mainContent && origMargin !== null) {
                    mainContent.style.marginLeft = origMargin;
                    mainContent.style.width = '';
                  }
                  window.removeEventListener('afterprint', restore);
                };
                window.addEventListener('afterprint', restore);
              }}
              className="btn btn-outline btn-icon"
              style={{ padding: '6px' }}
              title="Cetak Tiket (Print)"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={() => setSelectedTicket(null)}
              className="btn btn-outline btn-icon"
              style={{ padding: '6px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="no-print" style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <button
            onClick={() => setSelectedTab('details')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'details' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: selectedTab === 'details' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Ticket Details & Workflow
          </button>
          <button
            onClick={() => setSelectedTab('worklog')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'worklog' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: selectedTab === 'worklog' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Worklogs</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', backgroundColor: 'var(--bg-elevated)' }}>
              {ticketWorklogs.length}
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('audit')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'audit' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: selectedTab === 'audit' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Audit History</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', backgroundColor: 'var(--bg-elevated)' }}>
              {ticketAuditLogs.length}
            </span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div style={{
            margin: '16px 24px 0 24px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            margin: '16px 24px 0 24px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body">
          {selectedTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Status Workflow Controls (PRD Section 12) */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>Ticket Status Workflow Engine (PRD Section 12)</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Current State: <strong style={{ color: 'var(--text-primary)' }}>{ticket.status}</strong>
                  </span>
                </div>

                {/* Workflow step buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ticket.status === 'NEW' && (
                    <button
                      onClick={() => handleTransition('OPEN')}
                      disabled={!can('updateTicket')}
                      className="btn btn-primary btn-sm"
                    >
                      Acknowledge & Open Ticket
                    </button>
                  )}

                  {ticket.status === 'OPEN' && (
                    <button
                      onClick={() => handleTransition('IN PROGRESS')}
                      disabled={!can('updateTicket')}
                      className="btn btn-primary btn-sm"
                    >
                      Start Work (In Progress)
                    </button>
                  )}

                  {ticket.status === 'IN PROGRESS' && (
                    <>
                      <button
                        onClick={() => handleTransition('PENDING')}
                        disabled={!can('updateTicket')}
                        className="btn btn-secondary btn-sm"
                      >
                        Set to Pending (Waiting on Requester)
                      </button>
                      <button
                        onClick={() => handleTransition('RESOLVED')}
                        disabled={!can('resolveTicket')}
                        className="btn btn-success btn-sm"
                      >
                        Resolve Ticket
                      </button>
                    </>
                  )}

                  {ticket.status === 'PENDING' && (
                    <button
                      onClick={() => handleTransition('IN PROGRESS')}
                      disabled={!can('updateTicket')}
                      className="btn btn-primary btn-sm"
                    >
                      Resume Work (In Progress)
                    </button>
                  )}

                  {ticket.status === 'RESOLVED' && (
                    <>
                      <button
                        onClick={() => handleTransition('IN PROGRESS')}
                        disabled={!can('updateTicket')}
                        className="btn btn-secondary btn-sm"
                      >
                        Re-open to In Progress
                      </button>
                      <button
                        onClick={() => handleTransition('CLOSED')}
                        disabled={!can('closeTicket')}
                        className="btn btn-success btn-sm"
                      >
                        Close Ticket (Final)
                      </button>
                    </>
                  )}

                  {ticket.status === 'CLOSED' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Tiket ini sudah resmi ditutup. Semua transisi status dikunci.
                    </span>
                  )}

                  {/* === TOMBOL TUTUP TIKET KE ICARE OTRS === */}
                  {!isResolvedOrClosed && can('closeTicket') && (
                    <button
                      onClick={() => setShowCloseModal(true)}
                      style={{
                        marginLeft: 'auto',
                        padding: '7px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success-border)',
                        color: 'var(--color-success)',
                        cursor: 'pointer',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Tutup Tiket ke iCare OTRS</span>
                    </button>
                  )}

                  {ticket.status === 'RESOLVED' && can('closeTicket') && (
                    <button
                      onClick={() => setShowCloseModal(true)}
                      style={{
                        marginLeft: 'auto',
                        padding: '7px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success-border)',
                        color: 'var(--color-success)',
                        cursor: 'pointer',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Konfirmasi Tutup ke iCare OTRS</span>
                    </button>
                  )}
                </div>

                {/* Mandatory Resolution Note when closing or resolving (PRD Section 12 Validation) */}
                {(ticket.status === 'IN PROGRESS' || ticket.status === 'RESOLVED') && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Resolution Note <span style={{ color: 'var(--color-danger)' }}>*</span> (Mandatory for Close)
                    </label>
                    <textarea
                      value={resolutionInput}
                      onChange={e => setResolutionInput(e.target.value)}
                      placeholder="Specify root cause fix, testing performed, and resolution details..."
                      className="form-control"
                      style={{ minHeight: '70px', fontSize: '0.825rem' }}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Per PRD Section 12: Resolution Note is strictly validated before closing and pushed to external portal.
                    </div>
                  </div>
                )}
              </div>

              {/* Klasifikasi Kriteria Tiket (Editable) */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                border: isEditingKriteria
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'border-color 0.2s ease',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Klasifikasi Kriteria & Antrian OTRS
                    </span>
                    {isEditingKriteria && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        backgroundColor: 'var(--accent-glow)',
                        color: 'var(--accent-primary)',
                        letterSpacing: '0.04em',
                      }}>MODE EDIT</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ticket.queueName && !isEditingKriteria && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--accent-glow)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                      }}>
                        Antrian: {ticket.queueName}
                      </span>
                    )}

                    {/* Edit / Save / Cancel buttons */}
                    {can('updateTicket') && !isEditingKriteria && (
                      <button
                        onClick={() => {
                          setEditKriteria(ticket.kriteria || 'Other');
                          setEditSubKriteria(ticket.subKriteria || '');
                          setEditTechCategory((ticket.technicalCategory as TechnicalCategory) || 'Application');
                          setEditMainCategory((ticket.mainCategory as MainCategory) || 'Service Request');
                          setIsEditingKriteria(true);
                        }}
                        title="Edit klasifikasi tiket"
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--accent-primary)',
                          backgroundColor: 'var(--accent-glow)',
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Pencil size={13} />
                        Edit Kriteria
                      </button>
                    )}

                    {isEditingKriteria && (
                      <>
                        <button
                          onClick={() => {
                            // Save changes
                            const res = updateTicket(ticket.id, {
                              kriteria: editKriteria,
                              subKriteria: editSubKriteria,
                              technicalCategory: editTechCategory,
                              mainCategory: editMainCategory,
                            });
                            if (res.success) {
                              setIsEditingKriteria(false);
                              setSuccessMessage('Klasifikasi tiket berhasil diperbarui.');
                              setTimeout(() => setSuccessMessage(null), 3000);
                            } else {
                              setErrorMessage(res.error || 'Gagal menyimpan perubahan.');
                            }
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-success)',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--color-success)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Save size={13} />
                          Simpan
                        </button>
                        <button
                          onClick={() => setIsEditingKriteria(false)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          Batal
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* READ-ONLY display */}
                {!isEditingKriteria && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kriteria Utama</span>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '3px' }}>
                        {ticket.kriteria || 'General'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sub-Kriteria / Tipe Request</span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-info)', marginTop: '3px' }}>
                        {ticket.subKriteria || '-'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Domain Layanan</span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        Infoblox {ticket.technicalCategory}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori ITIL</span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {ticket.mainCategory}
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT FORM */}
                {isEditingKriteria && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>

                      {/* Kriteria Utama */}
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                          Kriteria Utama
                        </label>
                        <select
                          value={editKriteria}
                          onChange={e => {
                            setEditKriteria(e.target.value);
                            // auto-reset subkriteria when kriteria changes
                            const subs = SUB_KRITERIA_MAP[e.target.value] || [];
                            setEditSubKriteria(subs[0] || '');
                            // auto-set domain
                            if (e.target.value === 'IPAM') setEditTechCategory('Network');
                            else if (e.target.value === 'DNS Request') setEditTechCategory('DNS');
                            else if (e.target.value === 'Reserve IP') setEditTechCategory('DHCP');
                            else if (e.target.value === 'DRP') setEditTechCategory('Infrastructure');
                          }}
                          className="form-control"
                          style={{ fontSize: '0.85rem', height: '38px' }}
                        >
                          {KRITERIA_OPTIONS.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-Kriteria */}
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                          Sub-Kriteria / Tipe Request
                        </label>
                        <select
                          value={editSubKriteria}
                          onChange={e => setEditSubKriteria(e.target.value)}
                          className="form-control"
                          style={{ fontSize: '0.85rem', height: '38px' }}
                        >
                          {(SUB_KRITERIA_MAP[editKriteria] || ['General Support']).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Domain Layanan */}
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                          Domain Layanan (Technical)
                        </label>
                        <select
                          value={editTechCategory}
                          onChange={e => setEditTechCategory(e.target.value as TechnicalCategory)}
                          className="form-control"
                          style={{ fontSize: '0.85rem', height: '38px' }}
                        >
                          {TECHNICAL_CATEGORY_OPTIONS.map(tc => (
                            <option key={tc} value={tc}>{tc}</option>
                          ))}
                        </select>
                      </div>

                      {/* Kategori ITIL */}
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                          Kategori ITIL
                        </label>
                        <select
                          value={editMainCategory}
                          onChange={e => setEditMainCategory(e.target.value as MainCategory)}
                          className="form-control"
                          style={{ fontSize: '0.85rem', height: '38px' }}
                        >
                          {MAIN_CATEGORY_OPTIONS.map(mc => (
                            <option key={mc} value={mc}>{mc}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Info note */}
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-purple-bg)',
                      border: '1px solid var(--color-purple-border)',
                      fontSize: '0.72rem',
                      color: 'var(--color-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <Sparkles size={12} />
                      Perubahan klasifikasi akan dicatat dalam audit log secara otomatis.
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Description & Impact
                </h4>
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {ticket.description || 'No description provided.'}
                </div>
              </div>

              {/* Rule Engine Recommendations Card (PRD Section 14) */}
              {ticket.ruleEngineSuggested && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-purple-bg)',
                  border: '1px solid var(--color-purple-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Sparkles size={16} color="var(--color-purple)" />
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-purple)' }}>
                      Rule Engine Auto-Categorization (Confidence: {ticket.ruleEngineSuggested.confidence}%)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {ticket.ruleEngineSuggested.explanation}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {ticket.ruleEngineSuggested.matchedKeywords.map(kw => (
                      <span key={kw} style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-purple-bg)',
                        color: 'var(--color-purple)',
                      }}>
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid-cols-2">
                <div>
                  <label className="form-label">Main ITIL Category</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ticket.mainCategory}
                  </div>
                </div>

                <div>
                  <label className="form-label">Technical Domain</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ticket.technicalCategory}
                  </div>
                </div>

                <div>
                  <label className="form-label">Assignee</label>
                  {can('assignTicket') ? (
                    <select
                      value={ticket.assigneeId || ''}
                      onChange={e => handleAssignChange(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '0.825rem', height: '36px', padding: '6px 10px' }}
                    >
                      <option value="">-- Unassigned --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {ticket.assigneeName || 'Unassigned'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">Assignment Group</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {ticket.assignmentGroup}
                  </div>
                </div>

                <div>
                  <label className="form-label">Requester</label>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {ticket.requester} ({ticket.requesterEmail})
                  </div>
                </div>

                <div>
                  <label className="form-label">Created At (WIB)</label>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                    {!isNaN(new Date(ticket.createdAt).getTime())
                      ? `${new Date(ticket.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
                      : '-'}
                  </div>
                </div>

                <div>
                  <label className="form-label">SLA Window</label>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                    {ticket.slaHours} Hours Allocated &bull; Due {!isNaN(new Date(ticket.dueAt).getTime())
                      ? `${new Date(ticket.dueAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
                      : '-'}
                  </div>
                </div>
              </div>

              {ticket.resolutionNote && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '8px' }}>
                    Resolution Summary
                  </h4>
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                  }}>
                    {ticket.resolutionNote}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Worklog Tab (PRD Section 13) */}
          {selectedTab === 'worklog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Log Work Form */}
              {can('updateTicket') && (
                <form onSubmit={handleAddWorklog} style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Record Engineer Activity Worklog
                  </h4>
                  <div className="grid-cols-4" style={{ marginBottom: '12px' }}>
                    <div>
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        value={worklogDate}
                        onChange={e => setWorklogDate(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Start Time</label>
                      <input
                        type="time"
                        value={worklogStart}
                        onChange={e => setWorklogStart(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">End Time</label>
                      <input
                        type="time"
                        value={worklogEnd}
                        onChange={e => setWorklogEnd(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={worklogDuration}
                        onChange={e => setWorklogDuration(Number(e.target.value))}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="form-label">Work Description / Remediation Actions</label>
                    <textarea
                      value={worklogDesc}
                      onChange={e => setWorklogDesc(e.target.value)}
                      placeholder="Describe analysis conducted, commands executed, or tests verified..."
                      className="form-control"
                      style={{ minHeight: '65px' }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Plus size={15} />
                    Log Activity
                  </button>
                </form>
              )}

              {/* Log List */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Recorded Activity Log ({ticketWorklogs.length})
                </h4>
                {ticketWorklogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                    No worklogs recorded yet for this ticket.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ticketWorklogs.map(wl => (
                      <div
                        key={wl.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {wl.userName} ({wl.userRole.toUpperCase()})
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-purple-bg)',
                            color: 'var(--color-purple)',
                          }}>
                            {wl.durationMinutes} mins ({wl.startTime} - {wl.endTime}) &bull; {wl.date}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {wl.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit History Tab (PRD Section 22) */}
          {selectedTab === 'audit' && (
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Chronological Audit History ({ticketAuditLogs.length})
              </h4>
              {ticketAuditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                  No audit logs recorded for this ticket yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ticketAuditLogs.map(audit => (
                    <div
                      key={audit.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {audit.action.replace('_', ' ')} by {audit.userName} ({audit.role})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {audit.oldValue && <span>From: <code style={{ color: 'var(--color-warning)' }}>{audit.oldValue}</code> &rarr; </span>}
                          {audit.newValue && <span>To: <code style={{ color: 'var(--color-success)' }}>{audit.newValue}</code></span>}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(audit.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            onClick={() => setSelectedTicket(null)}
            className="btn btn-secondary"
          >
            Close Details
          </button>

          {!isResolvedOrClosed && can('closeTicket') && (
            <button
              onClick={() => setShowCloseModal(true)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-success)',
                border: '1px solid var(--color-success)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Tutup Tiket ke iCare</span>
            </button>
          )}
        </div>
      </div>

      {/* Close Ticket Modal rendered outside main modal scroll */}
      {showCloseModal && (
        <CloseTicketModal
          ticketsToClose={[ticket]}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            setShowCloseModal(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}
