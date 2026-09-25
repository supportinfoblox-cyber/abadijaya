'use client';

import { useState, useMemo } from 'react';
import { useTicketOps } from '@/context/TicketOpsContext';
import { Ticket } from '@/types';
import {
  BarChart3,
  Calendar,
  Award,
  Globe,
  Server,
  Network,
  Shield,
  Sliders,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Search,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';


type Timeframe = 'all' | '6m' | '3m' | '1m' | 'custom';
type CustomMode = 'month' | 'range';

export default function MonthlyTicketChart() {
  const { tickets, setSelectedTicket } = useTicketOps();
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [customMode, setCustomMode] = useState<CustomMode>('month');

  // Month name dictionary in Indonesian
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

  const shortMonthNames: Record<string, string> = {
    '01': 'Jan',
    '02': 'Feb',
    '03': 'Mar',
    '04': 'Apr',
    '05': 'Mei',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Agu',
    '09': 'Sep',
    '10': 'Okt',
    '11': 'Nov',
    '12': 'Des',
  };

  // Find all unique months present in data for dropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      let key = '';
      if (t.createdAt && t.createdAt.length >= 7) {
        key = t.createdAt.substring(0, 7);
      } else if (t.ticketNumber && t.ticketNumber.length >= 6) {
        key = `${t.ticketNumber.substring(0, 4)}-${t.ticketNumber.substring(4, 6)}`;
      }
      if (key && key.match(/^\d{4}-\d{2}$/)) {
        set.add(key);
      }
    });
    const arr = Array.from(set).sort().reverse();
    return arr.length > 0 ? arr : ['2026-09', '2026-08', '2026-07'];
  }, [tickets]);

  // Selected custom month & custom range state
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || '2026-09');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-09-18');

  // Interactive bar selection
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Search & filter for bottom ticket roster
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterKriteria, setRosterKriteria] = useState('ALL');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [rosterPage, setRosterPage] = useState(1);
  const pageSize = 12;

  // Compute tickets matching the chosen timeframe
  const timeframeFilteredTickets = useMemo(() => {
    if (timeframe === 'all') {
      return tickets;
    }

    if (timeframe === 'custom') {
      if (customMode === 'month') {
        return tickets.filter(t => {
          let key = '';
          if (t.createdAt && t.createdAt.length >= 7) {
            key = t.createdAt.substring(0, 7);
          } else if (t.ticketNumber && t.ticketNumber.length >= 6) {
            key = `${t.ticketNumber.substring(0, 4)}-${t.ticketNumber.substring(4, 6)}`;
          }
          return key === selectedMonth;
        });
      } else {
        return tickets.filter(t => {
          const date = t.createdAt ? t.createdAt.substring(0, 10) : '';
          if (!date) return true;
          if (customStartDate && date < customStartDate) return false;
          if (customEndDate && date > customEndDate) return false;
          return true;
        });
      }
    }

    // Relative periods (1m, 3m, 6m)
    const sortedMonths = [...availableMonths].sort();
    let targetMonths: string[] = [];
    if (timeframe === '1m') {
      targetMonths = sortedMonths.slice(-1);
    } else if (timeframe === '3m') {
      targetMonths = sortedMonths.slice(-3);
    } else if (timeframe === '6m') {
      targetMonths = sortedMonths.slice(-6);
    }

    const monthSet = new Set(targetMonths);
    return tickets.filter(t => {
      let key = '';
      if (t.createdAt && t.createdAt.length >= 7) {
        key = t.createdAt.substring(0, 7);
      } else if (t.ticketNumber && t.ticketNumber.length >= 6) {
        key = `${t.ticketNumber.substring(0, 4)}-${t.ticketNumber.substring(4, 6)}`;
      }
      return monthSet.has(key);
    });
  }, [tickets, timeframe, customMode, selectedMonth, customStartDate, customEndDate, availableMonths]);

  // Build diagram bars data
  const chartData = useMemo(() => {
    // If Custom Mode is "Single Month", group by DAY within that month
    const isDaily = timeframe === 'custom' && customMode === 'month';

    const map: Record<string, {
      key: string;
      label: string;
      subLabel?: string;
      fullLabel?: string;
      total: number;
      dns: number;
      reserve: number;
      ipam: number;
      drp: number;
      other: number;
      tickets: Ticket[];
    }> = {};

    timeframeFilteredTickets.forEach(t => {
      let groupKey = '';
      let displayLabel = '';
      let subText = '';
      let fullText = '';

      if (isDaily) {
        // Daily grouping
        const dateStr = t.createdAt && t.createdAt.length >= 10 ? t.createdAt.substring(0, 10) : '';
        if (dateStr) {
          groupKey = dateStr;
          const [, mo, dy] = dateStr.split('-');
          displayLabel = `Tgl ${parseInt(dy, 10)}`;
          subText = `${shortMonthNames[mo] || mo}`;
          fullText = `${dateStr} (${parseInt(dy, 10)} ${monthNames[mo] || mo})`;
        } else {
          groupKey = `${selectedMonth}-01`;
          displayLabel = 'Tgl 01';
          subText = selectedMonth;
          fullText = `${selectedMonth}-01`;
        }
      } else {
        // Monthly grouping - abbreviate month name (Jan, Feb, Mar...) so labels never overlap
        let monthKey = '2026-09';
        if (t.createdAt && t.createdAt.length >= 7) {
          monthKey = t.createdAt.substring(0, 7);
        } else if (t.ticketNumber && t.ticketNumber.length >= 6) {
          monthKey = `${t.ticketNumber.substring(0, 4)}-${t.ticketNumber.substring(4, 6)}`;
        }
        groupKey = monthKey;
        const [year, month] = monthKey.split('-');
        displayLabel = shortMonthNames[month] || month;
        subText = year;
        fullText = `${monthNames[month] || month} ${year}`;
      }

      if (!map[groupKey]) {
        map[groupKey] = {
          key: groupKey,
          label: displayLabel,
          subLabel: subText,
          fullLabel: fullText,
          total: 0,
          dns: 0,
          reserve: 0,
          ipam: 0,
          drp: 0,
          other: 0,
          tickets: [],
        };
      }

      map[groupKey].total += 1;
      map[groupKey].tickets.push(t);

      const k = t.kriteria || t.mainCategory;
      if (k === 'DNS Request' || t.subject.toLowerCase().includes('dns') || t.subject.toLowerCase().includes('cname')) {
        map[groupKey].dns += 1;
      } else if (k === 'Reserve IP' || t.subject.toLowerCase().includes('reserve') || t.subject.toLowerCase().includes('fixed address')) {
        map[groupKey].reserve += 1;
      } else if (k === 'IPAM' || t.subject.toLowerCase().includes('ipam')) {
        map[groupKey].ipam += 1;
      } else if (k === 'DRP' || t.subject.toLowerCase().includes('standby') || t.subject.toLowerCase().includes('drp')) {
        map[groupKey].drp += 1;
      } else {
        map[groupKey].other += 1;
      }
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [timeframeFilteredTickets, timeframe, customMode, selectedMonth, monthNames, shortMonthNames]);

  // Peak bar in current diagram
  const peakItem = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.total - a.total)[0];
  }, [chartData]);

  const maxItemTotal = useMemo(() => {
    return Math.max(...chartData.map(m => m.total), 1);
  }, [chartData]);

  const averageTickets = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.total, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  // Active tickets for the roster section below
  const rosterTickets = useMemo(() => {
    let list = timeframeFilteredTickets;

    // If user clicked a specific bar in the diagram
    if (selectedBarKey) {
      const activeBar = chartData.find(d => d.key === selectedBarKey);
      if (activeBar) {
        list = activeBar.tickets;
      }
    }

    // Filter by Kriteria
    if (rosterKriteria !== 'ALL') {
      list = list.filter(t => (t.kriteria || t.mainCategory) === rosterKriteria);
    }

    // Filter by Search
    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase().trim();
      list = list.filter(t => {
        return (
          String(t.ticketNumber || '').toLowerCase().includes(q) ||
          String(t.subject || '').toLowerCase().includes(q) ||
          String(t.kriteria || '').toLowerCase().includes(q) ||
          String(t.requester || '').toLowerCase().includes(q)
        );
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [timeframeFilteredTickets, selectedBarKey, chartData, rosterKriteria, rosterSearch]);

  const totalPages = Math.ceil(rosterTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (rosterPage - 1) * pageSize;
    return rosterTickets.slice(start, start + pageSize);
  }, [rosterTickets, rosterPage]);

  const handleCopyAllNumbers = () => {
    const nums = rosterTickets.map(t => t.ticketNumber || t.id).join('\n');
    navigator.clipboard.writeText(nums);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const activeBarObj = useMemo(() => {
    if (!selectedBarKey) return null;
    return chartData.find(d => d.key === selectedBarKey) || null;
  }, [selectedBarKey, chartData]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

        {/* Timeframe Filter Tabs */}
        <div className="no-print" style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-elevated)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Semua Riwayat' },
            { id: '6m', label: '6 Bulan' },
            { id: '3m', label: '3 Bulan' },
            { id: '1m', label: '1 Bulan' },
            { id: 'custom', label: 'Kustom Periode', icon: <Calendar size={13} /> },
          ].map(tf => {
            const isActive = timeframe === tf.id;
            return (
              <button
                key={tf.id}
                onClick={() => {
                  setTimeframe(tf.id as Timeframe);
                  setSelectedBarKey(null);
                  setRosterPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                }}
              >
                {tf.icon}
                <span>{tf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Filter Controls Bar (Visible only when 'custom' timeframe is selected) */}
      {timeframe === 'custom' && (
        <div className="no-print" style={{
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} color="var(--accent-primary)" />
              Mode Filter:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => { setCustomMode('month'); setSelectedBarKey(null); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: customMode === 'month' ? 700 : 500,
                  backgroundColor: customMode === 'month' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: customMode === 'month' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                Pilih Bulan Tertentu (Rincian Harian)
              </button>
              <button
                onClick={() => { setCustomMode('range'); setSelectedBarKey(null); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: customMode === 'range' ? 700 : 500,
                  backgroundColor: customMode === 'range' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: customMode === 'range' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                Rentang Tanggal (Dari - Sampai)
              </button>
            </div>
          </div>

          {/* Controls for chosen mode */}
          {customMode === 'month' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Bulan Ditampilkan:
              </label>
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(e.target.value); setSelectedBarKey(null); }}
                className="form-control"
                style={{
                  height: '34px',
                  fontSize: '0.78rem',
                  padding: '0 30px 0 10px',
                  minWidth: '160px',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                {availableMonths.map(mKey => {
                  const [yr, mo] = mKey.split('-');
                  return (
                    <option key={mKey} value={mKey}>
                      {monthNames[mo] || mo} {yr}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => { setCustomStartDate(e.target.value); setSelectedBarKey(null); }}
                  className="form-control"
                  style={{
                    height: '34px',
                    fontSize: '0.76rem',
                    padding: '0 8px',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => { setCustomEndDate(e.target.value); setSelectedBarKey(null); }}
                  className="form-control"
                  style={{
                    height: '34px',
                    fontSize: '0.76rem',
                    padding: '0 8px',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Peak Bar Highlight Banner */}
      {peakItem && (
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
                <span>
                  {timeframe === 'custom' && customMode === 'month'
                    ? 'Tanggal Dengan Tiket Terbanyak (Peak Day)'
                    : 'Bulan Dengan Tiket Terbanyak (Peak Velocity)'}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px', letterSpacing: '-0.01em' }}>
                {peakItem.fullLabel || `${peakItem.label} ${peakItem.subLabel || ''}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1 }}>
                {peakItem.total} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tiket</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Rata-rata: ~{averageTickets} tiket/{timeframe === 'custom' && customMode === 'month' ? 'hari' : 'bulan'}
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
                  <Globe size={13} color="var(--color-info)" /> DNS: <strong style={{ color: 'var(--color-info)' }}>{peakItem.dns}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Server size={13} color="var(--color-success)" /> Reserve IP: <strong style={{ color: 'var(--color-success)' }}>{peakItem.reserve}</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Network size={13} color="var(--color-warning)" /> IPAM: <strong style={{ color: 'var(--color-warning)' }}>{peakItem.ipam}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Shield size={13} color="var(--color-danger)" /> DRP: <strong style={{ color: 'var(--color-danger)' }}>{peakItem.drp}</strong>
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
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            Belum ada data tiket untuk periode waktu yang dipilih.
          </div>
        ) : (
          <div>
            {/* Active Bar Filter Indicator */}
            {selectedBarKey && activeBarObj && (
              <div style={{
                marginBottom: '16px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-primary-light)',
                border: '1px solid var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Memfilter bar:</span>
                  <strong>{activeBarObj.label} {activeBarObj.subLabel || ''} ({activeBarObj.total} Tiket)</strong>
                </div>
                <button
                  onClick={() => setSelectedBarKey(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Tampilkan Seluruh Bar
                </button>
              </div>
            )}

            {/* Chart Area */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '240px',
              paddingTop: '36px',
              paddingBottom: '12px',
              gap: 'clamp(3px, 1.2vw, 16px)',
              position: 'relative',
              overflowX: 'auto',
            }}>
              {/* Horizontal Grid lines */}
              <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-subtle)' }} />

              {chartData.map(m => {
                const heightPercent = Math.max(Math.round((m.total / maxItemTotal) * 100), 10);
                const isPeak = peakItem && peakItem.key === m.key;
                const isHovered = hoveredKey === m.key;
                const isSelected = selectedBarKey === m.key;

                return (
                  <div
                    key={m.key}
                    onClick={() => setSelectedBarKey(prev => prev === m.key ? null : m.key)}
                    onMouseEnter={() => setHoveredKey(m.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{
                      flex: 1,
                      minWidth: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      opacity: selectedBarKey && !isSelected ? 0.45 : 1,
                      transition: 'opacity 0.2s ease',
                    }}
                    title="Klik bar untuk melihat deretan no. tiket"
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
                          <span>{m.fullLabel || `${m.label} ${m.subLabel || ''}`} &bull; {m.total} Tiket Total</span>
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
                          <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', marginTop: '4px', fontStyle: 'italic' }}>
                            Klik untuk rincian tiket di bawah
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Value Badge above bar */}
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: isSelected ? 'var(--accent-primary)' : isPeak ? 'var(--color-warning)' : 'var(--text-primary)',
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
                        maxWidth: '52px',
                        height: `${heightPercent}%`,
                        borderRadius: '8px 8px 3px 3px',
                        backgroundColor: isPeak ? 'var(--color-warning)' : 'var(--accent-primary)',
                        background: isPeak
                          ? 'linear-gradient(180deg, var(--color-warning-light) 0%, var(--color-warning) 50%, var(--color-indigo) 100%)'
                          : isSelected
                          ? 'linear-gradient(180deg, #06b6d4 0%, var(--accent-primary) 100%)'
                          : isHovered
                          ? 'linear-gradient(180deg, var(--accent-primary-light) 0%, var(--accent-primary) 100%)'
                          : 'linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                        boxShadow: isSelected
                          ? '0 0 0 2px #ffffff, 0 0 16px rgba(6, 182, 212, 0.7)'
                          : isPeak
                          ? '0 0 20px rgba(245, 158, 11, 0.45)'
                          : isHovered
                          ? '0 0 16px rgba(99, 102, 241, 0.4)'
                          : '0 2px 8px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.25s ease',
                        transform: isHovered || isSelected ? 'scaleY(1.03)' : 'none',
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
                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 800 : isPeak ? 800 : 600,
                        color: isSelected ? 'var(--accent-primary)' : isPeak ? '#fbbf24' : 'var(--text-secondary)',
                        textAlign: 'center',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                      }}
                      title={m.fullLabel || `${m.label} ${m.subLabel || ''}`}
                    >
                      <div>{m.label}</div>
                      {m.subLabel && (
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {m.subLabel}
                        </div>
                      )}
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

      {/* ========================================================================= */}
      {/* VERIFIKASI DERETAN NO TIKET TERDATA SESUAI DIAGRAM                        */}
      {/* ========================================================================= */}
      <div style={{
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Roster Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Verifikasi Deretan No. Tiket Terdata
              </h4>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 10px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                border: '1px solid var(--color-success-border)',
              }}>
                {rosterTickets.length} Tiket Sesuai Diagram
              </span>
              {selectedBarKey && activeBarObj && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-primary-light)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary-muted)',
                }}>
                  Bar: {activeBarObj.label} {activeBarObj.subLabel || ''}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Klik nomor tiket untuk membuka rincian penuh, atau salin deretan nomor tiket untuk audit.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {selectedBarKey && (
              <button
                onClick={() => setSelectedBarKey(null)}
                className="btn btn-secondary btn-sm"
                style={{ height: '32px', fontSize: '0.74rem', gap: '4px' }}
                title="Reset filter bar dan tampilkan seluruh data periode"
              >
                <RotateCcw size={13} />
                <span>Reset Bar</span>
              </button>
            )}

            <button
              onClick={handleCopyAllNumbers}
              disabled={rosterTickets.length === 0}
              className="btn btn-secondary btn-sm"
              style={{ height: '32px', fontSize: '0.74rem', gap: '4px', fontWeight: 600 }}
              title="Salin seluruh nomor tiket yang terdaftar ke clipboard"
            >
              {copiedSuccess ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
              <span>{copiedSuccess ? 'Tersalin!' : `Salin ${rosterTickets.length} No. Tiket`}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cari No. Tiket, Subjek..."
              value={rosterSearch}
              onChange={e => { setRosterSearch(e.target.value); setRosterPage(1); }}
              className="form-control"
              style={{
                paddingLeft: '32px',
                height: '32px',
                fontSize: '0.76rem',
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)',
              }}
            />
          </div>

          {/* Quick Kriteria Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'DNS Request', 'Reserve IP', 'IPAM', 'DRP'].map(k => {
              const isAct = rosterKriteria === k;
              return (
                <button
                  key={k}
                  onClick={() => { setRosterKriteria(k); setRosterPage(1); }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: isAct ? 700 : 500,
                    backgroundColor: isAct ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: isAct ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  {k === 'ALL' ? 'Semua Kriteria' : k}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tickets List Table */}
        <div style={{ overflowX: 'auto' }}>
          {rosterTickets.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Tidak ada nomor tiket yang cocok dengan pencarian / filter ini.
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', fontSize: '0.76rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '170px' }}>Nomor Tiket</th>
                  <th style={{ width: '140px' }}>Kriteria Utama</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th>Judul Tiket (Subject)</th>
                  <th style={{ width: '150px' }}>Tanggal Tiket</th>
                  <th style={{ width: '130px' }}>Pelapor</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.map((t, idx) => {
                  const num = (rosterPage - 1) * pageSize + idx + 1;
                  const kriteria = t.kriteria || t.mainCategory || 'Other';
                  return (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(t)}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{num}</td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                          }}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'var(--accent-primary-light)',
                            border: '1px solid var(--accent-primary-muted)',
                            padding: '2px 8px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Klik untuk membuka detail tiket ini"
                        >
                          <span>{t.ticketNumber || t.id}</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            kriteria === 'DNS Request' ? 'var(--color-purple-bg)' :
                            kriteria === 'Reserve IP' ? 'var(--color-success-bg)' :
                            kriteria === 'IPAM' ? 'var(--color-warning-bg)' :
                            kriteria === 'DRP' ? 'var(--color-danger-bg)' : 'var(--bg-elevated)',
                          color:
                            kriteria === 'DNS Request' ? 'var(--color-purple)' :
                            kriteria === 'Reserve IP' ? 'var(--color-success)' :
                            kriteria === 'IPAM' ? 'var(--color-warning)' :
                            kriteria === 'DRP' ? 'var(--color-danger)' : 'var(--text-secondary)',
                        }}>
                          {kriteria}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-status-${t.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.68rem' }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {t.subject || '-'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {t.createdAt ? t.createdAt.substring(0, 16).replace('T', ' ') : '-'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.requester || t.requesterName || 'Pengguna'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Roster Pagination Footer */}
        {rosterTickets.length > pageSize && (
          <div style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
          }}>
            <div>
              Menampilkan {Math.min((rosterPage - 1) * pageSize + 1, rosterTickets.length)} - {Math.min(rosterPage * pageSize, rosterTickets.length)} dari <strong>{rosterTickets.length}</strong> tiket
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={rosterPage <= 1}
                onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '3px 8px', height: '26px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span>Hal {rosterPage} / {totalPages}</span>
              <button
                disabled={rosterPage >= totalPages}
                onClick={() => setRosterPage(p => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
                style={{ padding: '3px 8px', height: '26px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
