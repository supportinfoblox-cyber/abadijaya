'use client';

import { useState } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  Server,
  Calendar,
} from 'lucide-react';

interface OtrsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TimeRange = '1-year' | '6-months' | '3-months' | '1-month' | 'all';

export default function OtrsSyncModal({ isOpen, onClose }: OtrsSyncModalProps) {
  const { importSyncedTickets, syncWithCloudNow, tickets } = useTicketOps();
  const [mode, setMode] = useState<'historical' | 'active'>('active');
  const [timeRange, setTimeRange] = useState<TimeRange>('1-month');
  const [limit, setLimit] = useState<number>(100);
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
      const initialTickets = tickets;
      const initialNumbers = new Set(initialTickets.map(t => t.ticketNumber));

      // 1. Try local dev proxy endpoint if available
      let fetchedTickets: any[] = [];
      let breakdown: Record<string, number> = {};
      try {
        const queryParams = mode === 'active'
          ? 'mode=active'
          : `mode=historical&limit=${limit}&timeRange=${timeRange}`;

        const res = await fetch(`/api/otrs/fetch-history?${queryParams}`, {
          method: 'GET',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tickets && Array.isArray(data.tickets) && data.tickets.length > 0) {
            fetchedTickets = data.tickets;
            breakdown = data.breakdown || {};
          }
        }
      } catch {
        // Dev proxy not running (Cloudflare Pages static hosting)
      }

      if (fetchedTickets.length > 0) {
        const importStats = importSyncedTickets(fetchedTickets);
        setSyncResult({
          totalFetched: fetchedTickets.length,
          added: importStats.added,
          updated: importStats.updated,
          breakdown,
        });
      } else {
        // Fallback to Supabase Cloud Database sync
        const cloudRes = await syncWithCloudNow();
        if (cloudRes.success) {
          // Calculate how many were newly loaded
          const newCount = tickets.filter(t => !initialNumbers.has(t.ticketNumber)).length;
          const totalCount = cloudRes.count || tickets.length;
          setSyncResult({
            totalFetched: totalCount,
            added: newCount,
            updated: totalCount - newCount,
            breakdown: {
              'DNS Request': tickets.filter(t => t.kriteria === 'DNS Request').length,
              'Reserve IP': tickets.filter(t => t.kriteria === 'Reserve IP').length,
              'IPAM': tickets.filter(t => t.kriteria === 'IPAM').length,
              'DRP': tickets.filter(t => t.kriteria === 'DRP').length,
            },
          });
        } else {
          throw new Error(cloudRes.error || 'Gagal sinkronisasi data dari Cloud Database atau iCare OTRS.');
        }
      }
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
      let loaded = false;
      try {
        const res = await fetch('/api/otrs/cache');
        if (res.ok) {
          const data = await res.json();
          if (data.tickets && data.tickets.length > 0) {
            const importStats = importSyncedTickets(data.tickets);
            setSyncResult({
              totalFetched: data.totalFetched || data.tickets.length,
              added: importStats.added,
              updated: importStats.updated,
              breakdown: data.breakdown || {},
            });
            loaded = true;
          }
        }
      } catch {
        // Cache API not on static hosting
      }

      if (!loaded) {
        // Cloud sync fallback
        const cloudRes = await syncWithCloudNow();
        if (cloudRes.success) {
          setSyncResult({
            totalFetched: cloudRes.count || tickets.length,
            added: 0,
            updated: cloudRes.count || tickets.length,
            breakdown: {
              'Cloud Supabase': cloudRes.count || tickets.length,
            },
          });
        } else {
          throw new Error('Gagal memuat tiket dari Cloud Database.');
        }
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
      backgroundColor: 'var(--modal-overlay)',
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
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-medium)',
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
          background: 'var(--color-purple-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-purple-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-purple)',
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
                <Server size={13} color="var(--color-purple)" /> Server Portal:
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>https://icare.lt-integra.com/otrs/</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Antrean Terdaftar:</span>
              <span style={{ color: 'var(--color-info)', fontWeight: 600 }}>OP0899 (ID 72) & OP0968 (ID 121)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Akun Sinkronisasi:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>ismailak (Administrator)</span>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
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
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 700, fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} />
                <span>Berhasil Menarik {syncResult.totalFetched} Tiket dari iCare!</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>Tiket Baru Ditambahkan: <strong style={{ color: 'var(--color-success)' }}>+{syncResult.added}</strong></div>
                <div>Tiket Diperbarui: <strong style={{ color: 'var(--color-purple)' }}>{syncResult.updated}</strong></div>
              </div>

              {/* Classification Badges */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Hasil Klasifikasi Otomatis (4 Kriteria):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-purple-bg)',
                    color: 'var(--color-purple)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    🌐 DNS Request: {syncResult.breakdown['DNS Request'] || 0}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    📌 Reserve IP: {syncResult.breakdown['Reserve IP'] || 0}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-warning-bg)',
                    color: 'var(--color-warning)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    🏢 IPAM: {syncResult.breakdown['IPAM'] || 0}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
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
                      backgroundColor: mode === 'historical' ? 'var(--color-purple-bg)' : 'var(--bg-input)',
                      border: mode === 'historical' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: mode === 'historical' ? 'var(--color-purple)' : 'var(--text-primary)' }}>
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
                      backgroundColor: mode === 'active' ? 'var(--color-purple-bg)' : 'var(--bg-input)',
                      border: mode === 'active' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: mode === 'active' ? 'var(--color-purple)' : 'var(--text-primary)' }}>
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 700 }}>
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
                          backgroundColor: timeRange === item.id ? 'var(--color-purple-bg)' : 'var(--bg-input)',
                          border: timeRange === item.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          color: timeRange === item.id ? 'var(--color-purple)' : 'var(--text-secondary)',
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
                            background: 'var(--color-success)',
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
                    backgroundColor: 'var(--color-purple-bg)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.73rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <Calendar size={13} color="var(--color-purple)" style={{ flexShrink: 0 }} />
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-purple)' }}>
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
                          backgroundColor: limit === val ? 'var(--color-purple-bg)' : 'var(--bg-input)',
                          border: limit === val ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          color: limit === val ? 'var(--color-purple)' : 'var(--text-secondary)',
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
          backgroundColor: 'var(--bg-elevated)',
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
