'use client';

import { useState, useMemo } from 'react';
import { Ticket } from '@/types';
import { exportTicketsToExcel } from '@/services/exportExcel';
import { exportTicketsToCsv } from '@/services/exportCsv';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  Copy,
  Check,
} from 'lucide-react';


interface ExportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTickets: Ticket[];
  defaultSelectedIds?: Set<string>;
}

type QuickRange = '1-month' | '3-months' | 'current-month' | 'all' | 'custom';

export default function ExportTicketsModal({
  isOpen,
  onClose,
  allTickets,
  defaultSelectedIds,
}: ExportTicketsModalProps) {
  const [quickRange, setQuickRange] = useState<QuickRange>('1-month');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [selectedKriteria, setSelectedKriteria] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedNumbers, setCopiedNumbers] = useState(false);

  // Default dates: Today and 1 month ago
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().substring(0, 10);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().substring(0, 10);

  const startOfCurrentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [startDate, setStartDate] = useState<string>(oneMonthAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const handleQuickRangeChange = (range: QuickRange) => {
    setQuickRange(range);
    if (range === '1-month') {
      setStartDate(oneMonthAgoStr);
      setEndDate(todayStr);
    } else if (range === '3-months') {
      setStartDate(threeMonthsAgoStr);
      setEndDate(todayStr);
    } else if (range === 'current-month') {
      setStartDate(startOfCurrentMonthStr);
      setEndDate(todayStr);
    } else if (range === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered tickets based on modal selections
  const matchingTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      // 1. If explicit selection passed
      if (defaultSelectedIds && defaultSelectedIds.size > 0) {
        if (!defaultSelectedIds.has(ticket.id)) return false;
      }

      // 2. Date Filtering
      if (quickRange !== 'all') {
        const ticketDateStr = ticket.createdAt ? ticket.createdAt.substring(0, 10) : '';
        if (ticketDateStr) {
          if (startDate && ticketDateStr < startDate) return false;
          if (endDate && ticketDateStr > endDate) return false;
        }
      }

      // 3. Kriteria Filter
      if (selectedKriteria !== 'ALL') {
        const k = ticket.kriteria || ticket.mainCategory;
        if (k !== selectedKriteria) return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'ALL') {
        if (ticket.status !== selectedStatus) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allTickets, defaultSelectedIds, quickRange, startDate, endDate, selectedKriteria, selectedStatus]);

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    if (matchingTickets.length === 0) {
      alert('Tidak ada tiket yang cocok dengan filter tanggal/kriteria yang dipilih.');
      return;
    }

    setIsExporting(true);
    try {
      const rangeLabel =
        quickRange === '1-month' ? '1_Bulan_Terakhir' :
        quickRange === '3-months' ? '3_Bulan_Terakhir' :
        quickRange === 'current-month' ? 'Bulan_Ini' :
        quickRange === 'custom' ? `${startDate}_sd_${endDate}` :
        'Semua_Tiket';

      const filenamePrefix = `export_tiket_${rangeLabel}`;

      if (format === 'xlsx') {
        await exportTicketsToExcel(matchingTickets, {
          filenamePrefix,
          filterLabel: rangeLabel.replace(/_/g, ' '),
          dateRange: {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        });
      } else {
        exportTicketsToCsv(matchingTickets, filenamePrefix);
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Export execution error:', err);
      alert('Terjadi kesalahan saat memproses file export: ' + (err.message || String(err)));
      setIsExporting(false);
    }
  };

  const handleCopyTicketNumbers = () => {
    const list = matchingTickets.map(t => t.ticketNumber || t.id).join('\n');
    navigator.clipboard.writeText(list);
    setCopiedNumbers(true);
    setTimeout(() => setCopiedNumbers(false), 2000);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{
          width: '95%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Tarik & Export Tiket Management
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Pilih rentang waktu penarikan dan unduh format Excel (.xlsx) atau CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-icon btn-secondary btn-sm"
            style={{ borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Range Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Pilihan Cepat Periode Penarikan:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {[
                { id: '1-month', label: '1 Bulan', desc: '30 hari terakhir' },
                { id: '3-months', label: '3 Bulan', desc: '90 hari terakhir' },
                { id: 'current-month', label: 'Bulan Ini', desc: 'Awal bln s/d kini' },
                { id: 'all', label: 'Semua Waktu', desc: 'Seluruh riwayat' },
                { id: 'custom', label: 'Kustom Tanggal', desc: 'Tentukan manual' },
              ].map(item => {
                const isActive = quickRange === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleQuickRangeChange(item.id as QuickRange)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                      backgroundColor: isActive ? 'var(--accent-primary-light)' : 'var(--bg-elevated)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    <div style={{ fontSize: '0.82rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Inputs */}
          {quickRange !== 'all' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <Calendar size={14} color="var(--accent-primary)" />
                  <span>Dari Tanggal:</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setQuickRange('custom');
                  }}
                  className="form-control"
                  style={{
                    width: '100%',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <Calendar size={14} color="var(--accent-primary)" />
                  <span>Sampai Tanggal:</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setQuickRange('custom');
                  }}
                  className="form-control"
                  style={{
                    width: '100%',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Optional Filtering: Kriteria & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Filter Kriteria Tiket:
              </label>
              <select
                value={selectedKriteria}
                onChange={e => setSelectedKriteria(e.target.value)}
                className="form-control"
                style={{
                  width: '100%',
                  fontSize: '0.82rem',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <option value="ALL">Semua Kriteria</option>
                <option value="DNS Request">DNS Request</option>
                <option value="Reserve IP">Reserve IP / Fixed Address</option>
                <option value="IPAM">IPAM</option>
                <option value="DRP">DRP / Standby</option>
                <option value="Other">Lainnya</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Filter Status Tiket:
              </label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="form-control"
                style={{
                  width: '100%',
                  fontSize: '0.82rem',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <option value="ALL">Semua Status</option>
                <option value="OPEN">Open</option>
                <option value="IN PROGRESS">In Progress</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Format File Export:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: format === 'xlsx' ? '2px solid var(--color-success)' : '1px solid var(--border-medium)',
                  backgroundColor: format === 'xlsx' ? 'var(--color-success-bg)' : 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FileSpreadsheet size={22} color="var(--color-success)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: format === 'xlsx' ? 'var(--color-success)' : 'var(--text-primary)' }}>
                    Excel (.xlsx)
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Multi-sheet rapi & ringkasan
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: format === 'csv' ? '2px solid var(--color-info)' : '1px solid var(--border-medium)',
                  backgroundColor: format === 'csv' ? 'var(--color-info-bg)' : 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FileText size={22} color="var(--color-info)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: format === 'csv' ? 'var(--color-info)' : 'var(--text-primary)' }}>
                    CSV (.csv)
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    UTF-8 BOM standar Excel
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Ticket Count & Number Roster Preview */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Total Tiket Terpilih:
                </span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: matchingTickets.length > 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  color: matchingTickets.length > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  border: '1px solid currentColor',
                }}>
                  {matchingTickets.length} Tiket
                </span>
              </div>

              {matchingTickets.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyTicketNumbers}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '28px', fontSize: '0.72rem', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {copiedNumbers ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                  <span>{copiedNumbers ? 'Tersalin!' : 'Salin No. Tiket'}</span>
                </button>
              )}
            </div>

            {/* List preview of ticket numbers */}
            {matchingTickets.length === 0 ? (
              <p style={{ fontSize: '0.76rem', color: 'var(--color-danger)', margin: 0 }}>
                Tidak ada tiket yang memenuhi kriteria periode waktu ini. Silakan ubah rentang tanggal.
              </p>
            ) : (
              <div style={{
                maxHeight: '110px',
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                padding: '8px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}>
                {matchingTickets.slice(0, 30).map(t => (
                  <span
                    key={t.id}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '5px',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    #{t.ticketNumber || t.id}
                  </span>
                ))}
                {matchingTickets.length > 30 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', padding: '2px 6px' }}>
                    +{matchingTickets.length - 30} tiket lainnya...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Didukung penuh pada Web Desktop & Aplikasi Mobile Android.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={isExporting}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={isExporting || matchingTickets.length === 0}
              className="btn btn-primary btn-sm"
              style={{
                backgroundColor: 'var(--color-success)',
                borderColor: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontWeight: 700,
              }}
            >
              <Download size={16} />
              <span>{isExporting ? 'Memproses File...' : `Download ${format.toUpperCase()} (${matchingTickets.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
