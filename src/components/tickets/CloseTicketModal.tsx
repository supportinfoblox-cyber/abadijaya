'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTicketOps } from '@/context/TicketOpsContext';
import { Ticket } from '@/types';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CloseTicketModalProps {
  ticketsToClose: Ticket[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CloseTicketModal({
  ticketsToClose,
  onClose,
  onSuccess,
}: CloseTicketModalProps) {
  const { closeTicket, bulkCloseTickets } = useTicketOps();

  // Selection state inside modal (default all checked)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(ticketsToClose.map(t => t.id))
  );
  const [showTicketList, setShowTicketList] = useState(true);

  // State selection: 2 = Berhasil ditutup (Successful), 3 = Tidak berhasil ditutup
  const [newStateId, setNewStateId] = useState<'2' | '3'>('2');
  const [syncToOtrs, setSyncToOtrs] = useState(true);

  // Initial resolution note template based on ticket kriteria
  const defaultNote = useMemo(() => {
    if (ticketsToClose.length === 1) {
      const k = ticketsToClose[0].kriteria;
      const sub = ticketsToClose[0].subKriteria;
      if (k === 'DNS Request') {
        return `Konfigurasi (${sub || 'Permintaan'}) telah selesai diproses dan diverifikasi normal. Tiket diselesaikan.`;
      }
      if (k === 'Reserve IP') {
        return `Permintaan alokasi parameter telah selesai diproses dan didokumentasikan. Tiket ditutup.`;
      }
      if (k === 'DRP') {
        return `Kegiatan pendampingan dan pemeliharaan telah selesai dilaksanakan. Tiket ditutup.`;
      }
      if (k === 'IPAM') {
        return `Pembaruan data operasional telah selesai dilaksanakan. Tiket diselesaikan.`;
      }
    }
    return 'Permintaan telah selesai dikerjakan dan diverifikasi. Tiket ditutup.';
  }, [ticketsToClose]);

  const [resolutionNote, setResolutionNote] = useState(defaultNote);

  // Execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<
    Array<{ ticketNumber: string; success: boolean; message: string; state?: string; otrsUrl?: string }>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeTickets = useMemo(() => {
    return ticketsToClose.filter(t => selectedIds.has(t.id));
  }, [ticketsToClose, selectedIds]);

  // Breakdown by Kriteria
  const kriteriaBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of activeTickets) {
      const k = t.kriteria || 'General';
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [activeTickets]);

  const toggleSelectTicket = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // Keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplyTemplate = (noteText: string) => {
    setResolutionNote(noteText);
  };

  const handleExecuteClose = async () => {
    if (activeTickets.length === 0) return;
    if (!resolutionNote.trim() || resolutionNote.trim().length < 5) {
      setErrorMessage('Catatan resolusi wajib diisi (minimal 5 karakter).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setExecutionLogs([]);

    try {
      const ticketIds = activeTickets.map(t => t.id);

      if (ticketIds.length === 1) {
        // Single Close
        const t = activeTickets[0];
        setExecutionLogs([{
          ticketNumber: t.ticketNumber,
          success: true,
          message: `Mengirim penutupan tiket ke portal iCare OTRS...`,
        }]);

        const res = await closeTicket(t.id, resolutionNote, syncToOtrs, newStateId);
        setProgressPercent(100);

        if (res.success) {
          const otrsMsg = res.otrsResult?.message || 'Tiket berhasil ditutup.';
          setExecutionLogs([{
            ticketNumber: t.ticketNumber,
            success: true,
            state: res.otrsResult?.state || (newStateId === '2' ? 'Berhasil ditutup' : 'Tidak berhasil ditutup'),
            message: syncToOtrs ? `${otrsMsg}` : 'Tiket ditutup di aplikasi TicketOps.',
            otrsUrl: res.otrsResult?.otrsUrl,
          }]);
          setIsCompleted(true);
        } else {
          setErrorMessage(res.error || 'Gagal menutup tiket.');
          setExecutionLogs([{
            ticketNumber: t.ticketNumber,
            success: false,
            message: res.error || 'Gagal memproses penutupan.',
          }]);
        }
      } else {
        // Bulk Close
        setExecutionLogs(activeTickets.map(t => ({
          ticketNumber: t.ticketNumber,
          success: false,
          message: 'Mengantri untuk penutupan...',
        })));
        setProgressPercent(30);

        const res = await bulkCloseTickets(ticketIds, resolutionNote, syncToOtrs, newStateId);
        setProgressPercent(100);

        if (res.success) {
          // Map results
          const resultMap = new Map<string, any>();
          if (res.results) {
            for (const r of res.results) {
              resultMap.set(r.rawTicketId, r);
            }
          }

          const logs = activeTickets.map(t => {
            const r = resultMap.get(t.id);
            return {
              ticketNumber: t.ticketNumber,
              success: r ? r.success : true,
              state: r?.state || (newStateId === '2' ? 'Berhasil ditutup' : 'Tidak berhasil ditutup'),
              message: r?.message || (syncToOtrs ? 'Berhasil ditutup di portal iCare OTRS' : 'Tiket ditutup di TicketOps'),
              otrsUrl: r?.otrsUrl,
            };
          });

          setExecutionLogs(logs);
          setIsCompleted(true);
        } else {
          setErrorMessage('Terjadi kesalahan saat memproses bulk close.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error tak terduga saat memproses penutupan tiket.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isSingle = ticketsToClose.length === 1;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay" onClick={() => !isProcessing && onClose()}>
      <div
        className="modal-content"
        style={{
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-success)',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {isSingle ? 'Tutup Tiket (Close Ticket)' : `Tutup ${activeTickets.length} Tiket Sekaligus (Bulk Close)`}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {isSingle
                  ? `Tiket #${ticketsToClose[0].ticketNumber} • ${ticketsToClose[0].kriteria || 'General'}`
                  : `Tutup dan sinkronkan status ${activeTickets.length} tiket langsung ke Portal iCare OTRS.`}
              </p>
            </div>
          </div>

          {!isProcessing && (
            <button
              onClick={onClose}
              className="btn btn-outline btn-sm"
              style={{ padding: '6px 8px', borderRadius: '8px' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* If Execution is Completed */}
          {isCompleted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={18} strokeWidth={3} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    Penutupan Tiket Berhasil Diselesaikan!
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {executionLogs.filter(l => l.success).length} tiket telah resmi ditutup
                    {syncToOtrs ? ' dan disinkronkan ke portal iCare OTRS.' : ' di TicketOps.'}
                  </p>
                </div>
              </div>

              {/* Execution Summary Table */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>No. Tiket</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status Baru</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Keterangan / OTRS Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executionLogs.map((log, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-card-hover)',
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-accent)' }}>
                          {log.ticketNumber}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: log.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: log.success ? 'var(--color-success)' : 'var(--color-danger)',
                            }}
                          >
                            {log.state || (log.success ? 'CLOSED' : 'FAILED')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{log.message}</span>
                            {log.otrsUrl && (
                              <a
                                href={log.otrsUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--color-info)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <span>OTRS</span>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {/* Kriteria summary pill row */}
              {!isSingle && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
                    <Layers size={14} color="var(--color-purple)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-purple)', textTransform: 'uppercase' }}>
                      Distribusi Kriteria:
                    </span>
                  </div>
                  {Object.entries(kriteriaBreakdown).map(([k, count]) => {
                    const color =
                      k === 'DNS Request' ? 'var(--color-info)' :
                      k === 'Reserve IP' ? 'var(--color-warning)' :
                      k === 'DRP' ? 'var(--color-purple)' :
                      k === 'IPAM' ? 'var(--color-success)' : 'var(--text-muted)';
                    return (
                      <span
                        key={k}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color,
                        }}
                      >
                        {k}: {count}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Collapsible Ticket Selection List */}
              {!isSingle && (
                <div
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setShowTicketList(prev => !prev)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: 'none',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      Daftar Tiket Terpilih ({activeTickets.length} dari {ticketsToClose.length})
                    </span>
                    {showTicketList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showTicketList && (
                      <div
                        style={{
                          maxHeight: '180px',
                          overflowY: 'auto',
                          backgroundColor: 'var(--bg-elevated)',
                          padding: '6px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                      {ticketsToClose.map(ticket => {
                        const isChecked = selectedIds.has(ticket.id);
                        return (
                          <div
                            key={ticket.id}
                            onClick={() => toggleSelectTicket(ticket.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                              border: isChecked ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                              />
                              <span style={{ fontWeight: 700, color: 'var(--color-purple)', flexShrink: 0 }}>
                                {ticket.ticketNumber}
                              </span>
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {ticket.subject}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--text-muted)',
                                flexShrink: 0,
                                marginLeft: '8px',
                              }}
                            >
                              {ticket.kriteria}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Close State Option (StateID) */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  Kondisi Penutupan (OTRS NewStateID):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNewStateId('2')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: newStateId === '2' ? '2px solid var(--color-success)' : '1px solid var(--border-medium)',
                      backgroundColor: newStateId === '2' ? 'var(--color-success-bg)' : 'var(--bg-card)',
                      color: newStateId === '2' ? 'var(--color-success)' : 'var(--text-secondary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: newStateId === '2' ? 'var(--color-success)' : 'var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {newStateId === '2' && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                      )}
                    </span>
                    <div>
                      <div>Berhasil Ditutup (StateID: 2)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Normal resolution (Closed Successful)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStateId('3')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: newStateId === '3' ? '2px solid var(--color-danger)' : '1px solid var(--border-medium)',
                      backgroundColor: newStateId === '3' ? 'var(--color-danger-bg)' : 'var(--bg-card)',
                      color: newStateId === '3' ? 'var(--color-danger)' : 'var(--text-secondary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: newStateId === '3' ? 'var(--color-danger)' : 'var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {newStateId === '3' && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
                      )}
                    </span>
                    <div>
                      <div>Tidak Berhasil Ditutup (StateID: 3)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Canceled / rejected request</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Resolution Note Textarea & Quick Template Buttons */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Catatan Resolusi / Penutupan <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Masuk ke riwayat artikel OTRS iCare
                  </span>
                </div>

                {/* Quick Template Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
                    Template Cepat:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('Konfigurasi permintaan telah selesai diproses dan diverifikasi normal. Tiket diselesaikan.')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', borderColor: '#3b82f6', color: 'var(--color-info)' }}
                  >
                    DNS Request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('Permintaan alokasi parameter telah selesai diproses dan didokumentasikan. Tiket ditutup.')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', borderColor: '#f59e0b', color: 'var(--color-warning)' }}
                  >
                    Reserve IP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('Kegiatan pendampingan dan pemeliharaan telah selesai dilaksanakan. Tiket ditutup.')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', borderColor: '#a855f7', color: 'var(--color-purple)' }}
                  >
                    DRP Standby
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('Pembaruan data operasional telah selesai dilaksanakan. Tiket diselesaikan.')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', borderColor: '#10b981', color: 'var(--color-success)' }}
                  >
                    IPAM
                  </button>
                </div>

                <textarea
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder="Ketik rincian pekerjaan dan alasan penutupan tiket..."
                  rows={4}
                  className="form-control"
                  style={{
                    width: '100%',
                    fontSize: '0.825rem',
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* OTRS Sync Toggle Card */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="var(--color-success)" />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Sinkronisasi Langsung ke Portal iCare OTRS
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Portal Tiket & Antrean Terintegrasi
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={syncToOtrs}
                    onChange={e => setSyncToOtrs(e.target.checked)}
                    style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: syncToOtrs ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {syncToOtrs ? 'Tersambung (Aktif)' : 'Lokal Saja'}
                  </span>
                </label>
              </div>

              {/* Progress bar during execution */}
              {isProcessing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-accent)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="animate-spin" />
                      Sedang memproses penutupan {activeTickets.length} tiket di iCare OTRS...
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        backgroundColor: 'var(--accent-primary)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {isCompleted ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontWeight: 700 }}
              >
                Selesai & Tutup Jendela
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="btn btn-outline"
                style={{ padding: '8px 16px' }}
              >
                Batal
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleExecuteClose}
                  disabled={isProcessing || activeTickets.length === 0}
                  className="btn btn-success"
                  style={{
                    padding: '8px 22px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Menutup Tiket...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>
                        {isSingle
                          ? 'Konfirmasi Tutup Tiket'
                          : `Konfirmasi Tutup ${activeTickets.length} Tiket`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
