'use client';

import React, { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  Download,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  ExternalLink,
  Shield,
  Server,
  Calendar,
} from 'lucide-react';

interface OtrsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TimeRange = '1-year' | '6-months' | '3-months' | '1-month' | 'all';

export default function OtrsSyncModal({ isOpen, onClose }: OtrsSyncModalProps) {
  const { importSyncedTickets } = useTicketOps();
  const [mode, setMode] = useState<'historical' | 'active'>('historical');
  const [timeRange, setTimeRange] = useState<TimeRange>('1-year');
  const [limit, setLimit] = useState<number>(500);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    totalFetched: number;
    added: number;
    updated: number;
    breakdown: Record<string, number>;
  } | null>(null);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setIsLoading(true);
    setError(null);
    setSyncResult(null);

    try {
      // Fetch live from OTRS bridge with mode, limit, and timeRange
      const queryParams = mode === 'active'
        ? 'mode=active'
        : `mode=historical&limit=${limit}&timeRange=${timeRange}`;

      const res = await fetch(`/api/otrs/fetch-history?${queryParams}`, {
        method: 'GET',
      });
      const data = await res.json();

      if (!data.success || !data.tickets) {
        throw new Error(data.error || 'Gagal mengambil data tiket dari portal iCare.');
      }

      // Merge into app state
      const importStats = importSyncedTickets(data.tickets);

      setSyncResult({
        totalFetched: data.totalFetched || data.tickets.length,
        added: importStats.added,
        updated: importStats.updated,
        breakdown: data.breakdown || {},
      });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat sinkronisasi tiket dari iCare OTRS.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLoadCached = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/otrs/cache');
      const data = await res.json();
      if (data.tickets && data.tickets.length > 0) {
        const importStats = importSyncedTickets(data.tickets);
        setSyncResult({
          totalFetched: data.totalFetched || data.tickets.length,
          added: importStats.added,
          updated: importStats.updated,
          breakdown: data.breakdown || {},
        });
      } else {
        throw new Error('Cache lokal kosong, silakan gunakan tombol Mulai Tarik Data.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat cache tiket.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 15, 25, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        overflow: 'hidden',
        animation: 'scaleIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(99, 102, 241, 0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}>
              <Download size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Tarik Data Tiket dari iCare OTRS
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Antrean OP0899 & OP0968 Bank Syariah Indonesia (BSI)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* OTRS Target Info */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Server size={13} color="#818cf8" /> Server Portal:
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>https://icare.lt-integra.com/otrs/</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Antrean Terdaftar:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>OP0899 (ID 72) & OP0968 (ID 121)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Akun Sinkronisasi:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>ismailak (Administrator)</span>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Sync Result Display */}
          {syncResult ? (
            <div style={{
              padding: '18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} />
                <span>Berhasil Menarik {syncResult.totalFetched} Tiket dari iCare!</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>Tiket Baru Ditambahkan: <strong style={{ color: '#34d399' }}>+{syncResult.added}</strong></div>
                <div>Tiket Diperbarui: <strong style={{ color: '#818cf8' }}>{syncResult.updated}</strong></div>
              </div>

              {/* Classification Badges */}
              <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Hasil Klasifikasi Otomatis (4 Kriteria):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    color: '#818cf8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    🌐 DNS Request: {syncResult.breakdown['DNS Request'] || 0}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    📌 Reserve IP: {syncResult.breakdown['Reserve IP'] || 0}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    🏢 IPAM: {syncResult.breakdown['IPAM'] || 0}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    color: '#fb7185',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    🛡️ DRP: {syncResult.breakdown['DRP'] || 0}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Option Mode */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Pilihan Penarikan:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setMode('historical')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: mode === 'historical' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                      border: mode === 'historical' ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: mode === 'historical' ? '#818cf8' : 'var(--text-primary)' }}>
                      Riwayat Arsip &amp; Filter Waktu
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Cari tiket arsip masa lalu (hingga 1 tahun / semua riwayat)
                    </div>
                  </div>

                  <div
                    onClick={() => setMode('active')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: mode === 'active' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                      border: mode === 'active' ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: mode === 'active' ? '#818cf8' : 'var(--text-primary)' }}>
                      Antrean Aktif Saat Ini
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Ambil tiket terkini yang sedang berjalan di iCare
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Range Selector */}
              {mode === 'historical' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Rentang Waktu Tiket:
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
                      {timeRange === '1-year' ? '1 Tahun Terakhir (~898 Tiket)' : timeRange === 'all' ? 'Seluruh Arsip' : `${timeRange.replace('-months', ' Bulan').replace('-month', ' Bulan')}`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {[
                      { id: '1-year' as TimeRange, label: '1 Tahun', badge: 'Populer' },
                      { id: '6-months' as TimeRange, label: '6 Bulan' },
                      { id: '3-months' as TimeRange, label: '3 Bulan' },
                      { id: '1-month' as TimeRange, label: '1 Bulan' },
                      { id: 'all' as TimeRange, label: 'Semua' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTimeRange(item.id);
                          if (item.id === '1-year' && limit < 500) {
                            setLimit(1000);
                          }
                        }}
                        style={{
                          position: 'relative',
                          padding: '8px 4px',
                          borderRadius: '6px',
                          backgroundColor: timeRange === item.id ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-input)',
                          border: timeRange === item.id ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                          color: timeRange === item.id ? '#818cf8' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span style={{
                            fontSize: '0.58rem',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            background: '#10b981',
                            color: '#ffffff',
                            fontWeight: 700,
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Informative Banner */}
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.73rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <Calendar size={13} color="#818cf8" style={{ flexShrink: 0 }} />
                    <span>
                      {timeRange === '1-year'
                        ? 'Tersedia ~898 tiket OP0899 & OP0968 dalam 1 tahun terakhir. Pilih batas 1.000 untuk menarik seluruhnya.'
                        : timeRange === 'all'
                        ? 'Memindai seluruh riwayat tiket antrean tanpa batasan tanggal dibuat.'
                        : `Memindai tiket yang dibuat dalam rentang ${timeRange === '6-months' ? '6 bulan' : timeRange === '3-months' ? '3 bulan' : '1 bulan'} terakhir.`}
                    </span>
                  </div>
                </div>
              )}

              {/* Limit selector */}
              {mode === 'historical' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Batas Kuota Jumlah Tiket:
                    </label>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8' }}>
                      Maksimal {limit} Tiket
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[100, 250, 500, 1000, 1500].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLimit(val)}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: limit === val ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-input)',
                          border: limit === val ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                          color: limit === val ? '#818cf8' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
        }}>
          {!syncResult ? (
            <button
              type="button"
              onClick={handleQuickLoadCached}
              disabled={isLoading}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem', gap: '6px' }}
              title="Gunakan cache tiket yang sudah berhasil diambil sebelumnya"
            >
              <Database size={13} />
              Muat Data Cache Cepat
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tiket telah berhasil disinkronkan ke tabel sistem.
            </span>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              {syncResult ? 'Selesai' : 'Batal'}
            </button>

            {!syncResult && (
              <button
                type="button"
                onClick={handleStartSync}
                disabled={isLoading}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Sedang Menarik Data iCare...' : 'Mulai Tarik Data'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
