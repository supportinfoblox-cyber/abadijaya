'use client';

import React, { useState, useMemo } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Award,
  Filter,
  Layers,
  Info,
  Globe,
  Server,
  Network,
  Shield,
  Sliders,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function MonthlyTicketChart() {
  const { tickets } = useTicketOps();
  const [timeframe, setTimeframe] = useState<'all' | '6m' | '3m'>('all');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Month name formatter in Indonesian
  const monthNames: Record<string, string> = {
    '01': 'Januari',
    '02': 'Februari',
    '03': 'Maret',
    '04': 'April',
    '05': 'Mei',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'Agustus',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
  };

  const monthlyData = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      label: string;
      total: number;
      dns: number;
      reserve: number;
      ipam: number;
      drp: number;
      other: number;
    }> = {};

    tickets.forEach(t => {
      let key = '2026-09';
      if (t.createdAt && t.createdAt.length >= 7) {
        key = t.createdAt.substring(0, 7);
      } else if (t.ticketNumber && t.ticketNumber.length >= 6) {
        key = `${t.ticketNumber.substring(0, 4)}-${t.ticketNumber.substring(4, 6)}`;
      }

      if (!map[key]) {
        const [year, month] = key.split('-');
        const monthName = monthNames[month] || month;
        map[key] = {
          monthKey: key,
          label: `${monthName} ${year}`,
          total: 0,
          dns: 0,
          reserve: 0,
          ipam: 0,
          drp: 0,
          other: 0,
        };
      }

      map[key].total += 1;
      const k = t.kriteria || t.mainCategory;
      if (k === 'DNS Request' || t.subject.toLowerCase().includes('dns') || t.subject.toLowerCase().includes('cname')) {
        map[key].dns += 1;
      } else if (k === 'Reserve IP' || t.subject.toLowerCase().includes('reserve') || t.subject.toLowerCase().includes('fixed address')) {
        map[key].reserve += 1;
      } else if (k === 'IPAM' || t.subject.toLowerCase().includes('ipam')) {
        map[key].ipam += 1;
      } else if (k === 'DRP' || t.subject.toLowerCase().includes('standby') || t.subject.toLowerCase().includes('drp')) {
        map[key].drp += 1;
      } else {
        map[key].other += 1;
      }
    });

    let entries = Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    if (timeframe === '3m') {
      entries = entries.slice(-3);
    } else if (timeframe === '6m') {
      entries = entries.slice(-6);
    }

    return entries;
  }, [tickets, timeframe]);

  // Find the peak month with highest tickets
  const peakMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => b.total - a.total)[0];
  }, [monthlyData]);

  const maxMonthTotal = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.total), 1);
  }, [monthlyData]);

  const averagePerMonth = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const sum = monthlyData.reduce((acc, curr) => acc + curr.total, 0);
    return Math.round(sum / monthlyData.length);
  }, [monthlyData]);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
            border: '1px solid var(--color-purple-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-purple)',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)',
          }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                Diagram Tiket Bulanan & Peak Velocity
              </h3>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-purple-bg)',
                color: 'var(--color-purple)',
                border: '1px solid var(--color-purple-border)',
              }}>
                iCare OTRS
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Analisis historis lonjakan volume & rincian kriteria tiket per periode
            </p>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="no-print" style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-elevated)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          {(['all', '6m', '3m'] as const).map(tf => {
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '7px',
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                }}
              >
                {tf === 'all' ? 'Semua Riwayat' : tf === '6m' ? '6 Bulan' : '3 Bulan'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Peak Month Highlight Banner */}
      {peakMonth && (
        <div style={{
          padding: '18px 22px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(99, 102, 241, 0.08) 50%, var(--bg-card) 100%)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4px',
            height: '100%',
            backgroundColor: 'var(--color-warning)',
            boxShadow: '0 0 12px var(--color-warning)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-warning)',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
            }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Sparkles size={13} />
                <span>Bulan Dengan Tiket Terbanyak (Peak Velocity)</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px', letterSpacing: '-0.01em' }}>
                {peakMonth.label}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1 }}>
                {peakMonth.total} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tiket</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Rata-rata: ~{averagePerMonth} tiket/bulan
              </div>
            </div>

            {/* Peak Month Mini Badges with SVG icons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: '18px',
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Globe size={13} color="var(--color-info)" /> DNS: <strong style={{ color: 'var(--color-info)' }}>{peakMonth.dns}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Server size={13} color="var(--color-success)" /> Reserve IP: <strong style={{ color: 'var(--color-success)' }}>{peakMonth.reserve}</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Network size={13} color="var(--color-warning)" /> IPAM: <strong style={{ color: 'var(--color-warning)' }}>{peakMonth.ipam}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Shield size={13} color="var(--color-danger)" /> DRP: <strong style={{ color: 'var(--color-danger)' }}>{peakMonth.drp}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bar Chart Visual */}
      <div style={{
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {monthlyData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            Belum ada data tiket untuk ditampilkan.
          </div>
        ) : (
          <div>
            {/* Chart Area */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '240px',
              paddingTop: '36px',
              paddingBottom: '12px',
              gap: '16px',
              position: 'relative',
            }}>
              {/* Horizontal Grid lines */}
              <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-subtle)' }} />

              {monthlyData.map(m => {
                const heightPercent = Math.max(Math.round((m.total / maxMonthTotal) * 100), 10);
                const isPeak = peakMonth && peakMonth.monthKey === m.monthKey;
                const isHovered = hoveredMonth === m.monthKey;

                return (
                  <div
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredMonth(m.monthKey)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        bottom: `calc(${heightPercent}% + 28px)`,
                        zIndex: 20,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        boxShadow: 'var(--shadow-lg)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.74rem',
                        color: 'var(--text-primary)',
                        pointerEvents: 'none',
                        backdropFilter: 'blur(16px)',
                      }}>
                        <div style={{ fontWeight: 800, marginBottom: '6px', color: isPeak ? 'var(--color-warning)' : 'var(--color-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isPeak && <Award size={13} />}
                          <span>{m.label} &bull; {m.total} Tiket Total</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={11} color="var(--color-purple)" />
                            <span>DNS Request: <strong style={{ color: 'var(--color-purple)' }}>{m.dns}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Server size={11} color="var(--color-success)" />
                            <span>Reserve IP: <strong style={{ color: 'var(--color-success)' }}>{m.reserve}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Network size={11} color="var(--color-warning)" />
                            <span>IPAM: <strong style={{ color: 'var(--color-warning)' }}>{m.ipam}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Shield size={11} color="var(--color-danger)" />
                            <span>DRP: <strong style={{ color: 'var(--color-danger)' }}>{m.drp}</strong></span>
                          </div>
                          {m.other > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                              <Sliders size={11} />
                              <span>Lainnya: {m.other}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Value Badge above bar */}
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: isPeak ? 'var(--color-warning)' : 'var(--text-primary)',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {isPeak && <Award size={13} color="var(--color-warning)" />}
                      <span>{m.total}</span>
                    </div>

                    {/* The Bar */}
                    <div
                      className="monthly-ticket-bar"
                      style={{
                        width: '100%',
                        maxWidth: '56px',
                        height: `${heightPercent}%`,
                        borderRadius: '8px 8px 3px 3px',
                        backgroundColor: isPeak ? 'var(--color-warning)' : 'var(--accent-primary)',
                        background: isPeak
                          ? 'linear-gradient(180deg, var(--color-warning-light) 0%, var(--color-warning) 50%, var(--color-indigo) 100%)'
                          : isHovered
                          ? 'linear-gradient(180deg, var(--accent-primary-light) 0%, var(--accent-primary) 100%)'
                          : 'linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                        boxShadow: isPeak
                          ? '0 0 20px rgba(245, 158, 11, 0.45)'
                          : isHovered
                          ? '0 0 16px rgba(99, 102, 241, 0.4)'
                          : '0 2px 8px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.25s ease',
                        transform: isHovered ? 'scaleY(1.03)' : 'none',
                        transformOrigin: 'bottom',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Sub-bar segments indicators */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${(m.reserve / m.total) * 100}%`,
                        backgroundColor: 'rgba(16, 185, 129, 0.45)',
                      }} />
                    </div>

                    {/* Month Label below */}
                    <div style={{
                      marginTop: '12px',
                      fontSize: '0.76rem',
                      fontWeight: isPeak ? 800 : 500,
                      color: isPeak ? '#fbbf24' : 'var(--text-secondary)',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}>
                      {m.label.split(' ')[0]}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {m.label.split(' ')[1]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              fontSize: '0.78rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--color-purple)' }} />
                <span>DNS Request</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--color-success)' }} />
                <span>Reserve IP / Fixed Address</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--color-warning)' }} />
                <span>IPAM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--color-danger)' }} />
                <span>DRP / Standby</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
