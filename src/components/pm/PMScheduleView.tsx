'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Server,
  MapPin,
  User,
  FileSpreadsheet,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveOrShareFile } from '@/services/exportExcel';

export interface PMChecklistItem {
  id: string;
  task: string;
  done: boolean;
  notes?: string;
}

export interface PMSchedule {
  id: string;
  siteName: string;
  deviceName: string;
  deviceType: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  picEngineer: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'RESCHEDULED';
  checklist: PMChecklistItem[];
  notes?: string;
  lastUpdated: string;
}

const DEFAULT_CHECKLIST_TEMPLATE: PMChecklistItem[] = [
  { id: 'chk-1', task: 'Backup Database Grid & Ekspor Konfigurasi Terkini', done: false },
  { id: 'chk-2', task: 'Pemeriksaan Kapasitas Storage & Partisi Disk (/storage, /var)', done: false },
  { id: 'chk-3', task: 'Pemeriksaan Utilisasi CPU, Memori RAM & System Load', done: false },
  { id: 'chk-4', task: 'Verifikasi Sinkronisasi NTP & Deviasi Waktu Server', done: false },
  { id: 'chk-5', task: 'Pemeriksaan Status Replikasi Grid & Pasangan High Availability (HA)', done: false },
  { id: 'chk-6', task: 'Uji Resolusi Layanan DNS, DHCP Binding & Loopback Anycast', done: false },
  { id: 'chk-7', task: 'Pemeriksaan Fisik Hardware, Indikator LED, Redundansi Power Supply & Kipas', done: false },
];

const INITIAL_PM_SCHEDULES: PMSchedule[] = [
  {
    id: 'PM-2026-001',
    siteName: 'BSI Kantor Pusat (Wisma Atlet)',
    deviceName: 'BSI-IBX-GM01',
    deviceType: 'Infoblox TE-2215 (Grid Master)',
    scheduledDate: '2026-09-22',
    scheduledTime: '10:00',
    picEngineer: 'Ismail Akbar',
    status: 'SCHEDULED',
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map(c => ({ ...c })),
    notes: 'Pemeliharaan triwulan Q3: Health check grid master & rotasi database log.',
    lastUpdated: '2026-09-18 14:00',
  },
  {
    id: 'PM-2026-002',
    siteName: 'BSI Menara Thamrin',
    deviceName: 'BSI-IBX-GMC01',
    deviceType: 'Infoblox TE-2215 (Grid Master Candidate)',
    scheduledDate: '2026-09-24',
    scheduledTime: '13:30',
    picEngineer: 'Ady Kurniawan',
    status: 'SCHEDULED',
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map(c => ({ ...c })),
    notes: 'Uji sinkronisasi failover HA & pengecekan power supply redundan.',
    lastUpdated: '2026-09-18 15:30',
  },
  {
    id: 'PM-2026-003',
    siteName: 'Data Center Surabaya (DCS)',
    deviceName: 'BSI-IBX-MBR-SBY01',
    deviceType: 'Infoblox TE-1415 (Member DNS/DHCP)',
    scheduledDate: '2026-09-15',
    scheduledTime: '09:00',
    picEngineer: 'Haykal Atthoriq',
    status: 'COMPLETED',
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map(c => ({ ...c, done: true })),
    notes: 'PM rutin selesai tanpa kendala. Utilisasi memori 32%, disk space aman 45%.',
    lastUpdated: '2026-09-15 11:45',
  },
  {
    id: 'PM-2026-004',
    siteName: 'Disaster Recovery Center Bandung (DRC)',
    deviceName: 'BSI-IBX-MBR-BDG01',
    deviceType: 'Infoblox TE-1415 (Member DNS)',
    scheduledDate: '2026-09-29',
    scheduledTime: '14:00',
    picEngineer: 'Ismail Akbar',
    status: 'SCHEDULED',
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map(c => ({ ...c })),
    notes: 'Inspeksi konektivitas sinkronisasi WAN dan backup konfigurasi offline.',
    lastUpdated: '2026-09-17 10:00',
  },
  {
    id: 'PM-2026-005',
    siteName: 'BSI Gedung Landmark',
    deviceName: 'BSI-IBX-EXT-DNS01',
    deviceType: 'Infoblox PT-4000 (External DNS)',
    scheduledDate: '2026-09-12',
    scheduledTime: '15:00',
    picEngineer: 'Evelio Excellenta',
    status: 'COMPLETED',
    checklist: DEFAULT_CHECKLIST_TEMPLATE.map(c => ({ ...c, done: true })),
    notes: 'Pengecekan performa query DNS eksternal dan response time Anycast.',
    lastUpdated: '2026-09-12 17:00',
  },
];

const LOCAL_STORAGE_KEY = 'ticketops_pm_schedules';

export default function PMScheduleView() {
  const [schedules, setSchedules] = useState<PMSchedule[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved PM schedules', e);
        }
      }
    }
    return INITIAL_PM_SCHEDULES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'table' | 'calendar'>('table');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<PMSchedule | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [activeChecklistSchedule, setActiveChecklistSchedule] = useState<PMSchedule | null>(null);

  // Form State
  const [formSiteName, setFormSiteName] = useState('');
  const [formDeviceName, setFormDeviceName] = useState('');
  const [formDeviceType, setFormDeviceType] = useState('Infoblox TE-1415');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formPic, setFormPic] = useState('Ismail Akbar');
  const [formStatus, setFormStatus] = useState<PMSchedule['status']>('SCHEDULED');
  const [formNotes, setFormNotes] = useState('');

  // Save to LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(schedules));
    }
  }, [schedules]);

  // Statistics
  const totalCount = schedules.length;
  const scheduledCount = schedules.filter(s => s.status === 'SCHEDULED').length;
  const inProgressCount = schedules.filter(s => s.status === 'IN_PROGRESS').length;
  const completedCount = schedules.filter(s => s.status === 'COMPLETED').length;
  const overdueCount = schedules.filter(s => s.status === 'OVERDUE').length;

  // Filtered schedules
  const filteredSchedules = schedules.filter(s => {
    const matchesSearch =
      s.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.picEngineer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.deviceType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormSiteName('');
    setFormDeviceName('');
    setFormDeviceType('Infoblox TE-1415');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('09:00');
    setFormPic('Ismail Akbar');
    setFormStatus('SCHEDULED');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: PMSchedule) => {
    setEditingSchedule(item);
    setFormSiteName(item.siteName);
    setFormDeviceName(item.deviceName);
    setFormDeviceType(item.deviceType);
    setFormDate(item.scheduledDate);
    setFormTime(item.scheduledTime);
    setFormPic(item.picEngineer);
    setFormStatus(item.status);
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  // Save (Create / Update)
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (editingSchedule) {
      // Update
      setSchedules(prev =>
        prev.map(s =>
          s.id === editingSchedule.id
            ? {
                ...s,
                siteName: formSiteName,
                deviceName: formDeviceName,
                deviceType: formDeviceType,
                scheduledDate: formDate,
                scheduledTime: formTime,
                picEngineer: formPic,
                status: formStatus,
                notes: formNotes,
                lastUpdated: nowStr,
              }
            : s
        )
      );
    } else {
      // Create
      const newId = `PM-${new Date().getFullYear()}-${String(schedules.length + 1).padStart(3, '0')}`;
      const newSchedule: PMSchedule = {
        id: newId,
        siteName: formSiteName,
        deviceName: formDeviceName,
        deviceType: formDeviceType,
        scheduledDate: formDate,
        scheduledTime: formTime,
        picEngineer: formPic,
        status: formStatus,
        checklist: DEFAULT_CHECKLIST_TEMPLATE.map(c => ({ ...c })),
        notes: formNotes,
        lastUpdated: nowStr,
      };
      setSchedules(prev => [newSchedule, ...prev]);
    }
    setIsModalOpen(false);
  };

  // Delete
  const handleDeleteSchedule = (id: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus jadwal PM [${id}] ini?`)) {
      setSchedules(prev => prev.filter(s => s.id !== id));
    }
  };

  // Checklist Modal Handlers
  const handleOpenChecklist = (schedule: PMSchedule) => {
    setActiveChecklistSchedule(schedule);
    setIsChecklistModalOpen(true);
  };

  const handleToggleCheckItem = (itemId: string) => {
    if (!activeChecklistSchedule) return;
    const updatedChecklist = activeChecklistSchedule.checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    const allDone = updatedChecklist.every(i => i.done);
    const newStatus: PMSchedule['status'] = allDone
      ? 'COMPLETED'
      : updatedChecklist.some(i => i.done)
      ? 'IN_PROGRESS'
      : activeChecklistSchedule.status;

    const updatedSchedule: PMSchedule = {
      ...activeChecklistSchedule,
      checklist: updatedChecklist,
      status: newStatus,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setActiveChecklistSchedule(updatedSchedule);
    setSchedules(prev => prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s)));
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const dataToExport = schedules.map(s => ({
      'ID Jadwal PM': s.id,
      'Nama Site / Lokasi': s.siteName,
      'Nama Perangkat': s.deviceName,
      'Tipe Perangkat': s.deviceType,
      'Tanggal Rencana PM': s.scheduledDate,
      'Jam Pelaksanaan': s.scheduledTime,
      'PIC Engineer': s.picEngineer,
      'Status PM': s.status,
      'Checklist Selesai': `${s.checklist.filter(c => c.done).length} / ${s.checklist.length}`,
      'Catatan / Scope': s.notes || '-',
      'Pembaruan Terakhir': s.lastUpdated,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal PM');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const filename = `Jadwal_Preventive_Maintenance_BSI_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await saveOrShareFile({
      filename,
      blob,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // Export to CSV
  const handleExportCsv = async () => {
    const dataToExport = schedules.map(s => ({
      ID: s.id,
      Site: s.siteName,
      Perangkat: s.deviceName,
      Tipe: s.deviceType,
      Tanggal: s.scheduledDate,
      Jam: s.scheduledTime,
      PIC: s.picEngineer,
      Status: s.status,
      Checklist: `${s.checklist.filter(c => c.done).length}/${s.checklist.length}`,
      Catatan: s.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Jadwal_Preventive_Maintenance_BSI_${new Date().toISOString().slice(0, 10)}.csv`;

    await saveOrShareFile({
      filename,
      blob,
      mimeType: 'text/csv',
    });
  };

  // Status Badge Helper
  const renderStatusBadge = (status: PMSchedule['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <CheckCircle2 size={12} /> Selesai
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <Clock3 size={12} /> Sedang Berjalan
          </span>
        );
      case 'OVERDUE':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <AlertCircle size={12} /> Terlambat
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <Calendar size={12} /> Terjadwal
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CalendarCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Jadwal Preventive Maintenance
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Perencanaan pemeliharaan berkala, inspeksi teknis hardware, dan verifikasi grid Infoblox BSI
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Download Jadwal format Excel"
          >
            <Download size={14} /> Download Excel
          </button>
          <button
            onClick={handleExportCsv}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Download Jadwal format CSV"
          >
            <FileSpreadsheet size={14} /> Download CSV
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Plus size={15} /> Tambah Jadwal PM
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
      }}>
        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Jadwal PM</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Seluruh site terdaftar</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#818cf8' }}>Terjadwal (Upcoming)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#818cf8', marginTop: '4px' }}>
            {scheduledCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Menunggu pelaksanaan</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Sedang Berjalan</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>
            {inProgressCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Inspeksi di lokasi</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981' }}>Selesai (Completed)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Laporan PM terverifikasi</div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Overdue / Perlu Tindakan</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Melewati target tanggal</div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cari site, nama perangkat, PIC engineer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            >
              <option value="ALL">Semua Status</option>
              <option value="SCHEDULED">Terjadwal</option>
              <option value="IN_PROGRESS">Sedang Berjalan</option>
              <option value="COMPLETED">Selesai</option>
              <option value="OVERDUE">Terlambat</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('table')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'table' ? 600 : 400,
              backgroundColor: activeTab === 'table' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'table' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Tabel Jadwal
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'calendar' ? 600 : 400,
              backgroundColor: activeTab === 'calendar' ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === 'calendar' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Kalender
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'table' ? (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 16px' }}>Site & Lokasi</th>
                  <th style={{ padding: '14px 16px' }}>Perangkat</th>
                  <th style={{ padding: '14px 16px' }}>Jadwal Pelaksanaan</th>
                  <th style={{ padding: '14px 16px' }}>PIC Engineer</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Checklist Teknis</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada jadwal Preventive Maintenance yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map(item => {
                    const doneCount = item.checklist.filter(c => c.done).length;
                    const totalCheck = item.checklist.length;
                    const percent = Math.round((doneCount / totalCheck) * 100);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} style={{ color: 'var(--accent-primary)' }} />
                            {item.siteName}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.id}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Server size={13} style={{ color: 'var(--text-muted)' }} />
                            {item.deviceName}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            {item.deviceType}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} style={{ color: 'var(--accent-primary)' }} />
                            {item.scheduledDate}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} /> {item.scheduledTime} WIB
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} style={{ color: 'var(--text-muted)' }} />
                            {item.picEngineer}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {renderStatusBadge(item.status)}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={() => handleOpenChecklist(item)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'transparent',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              color: 'var(--text-primary)',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              width: '100%',
                              maxWidth: '160px',
                            }}
                            title="Klik untuk membuka checklist inspeksi teknis"
                          >
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <span>{doneCount}/{totalCheck} Poin</span>
                              <div style={{
                                width: '100%', height: '5px', backgroundColor: 'var(--bg-primary)',
                                borderRadius: '3px', marginTop: '4px', overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${percent}%`, height: '100%',
                                  backgroundColor: percent === 100 ? '#10b981' : 'var(--accent-primary)'
                                }} />
                              </div>
                            </div>
                            <CheckSquare size={14} style={{ color: percent === 100 ? '#10b981' : 'var(--accent-primary)' }} />
                          </button>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Perbaiki / Edit Jadwal"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(item.id)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Hapus Jadwal"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar View */
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Kalender Jadwal PM — September 2026
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Klik pada jadwal untuk membuka checklist dan rincian
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            textAlign: 'center',
          }}>
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
              <div key={d} style={{ padding: '8px', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {d}
              </div>
            ))}

            {/* Simple Mock Calendar Grid for Sep 2026 */}
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
              const daySchedules = schedules.filter(s => s.scheduledDate === dateStr);

              return (
                <div
                  key={day}
                  style={{
                    minHeight: '85px',
                    padding: '8px',
                    backgroundColor: daySchedules.length > 0 ? 'var(--accent-glow)' : 'var(--bg-primary)',
                    borderRadius: '8px',
                    border: daySchedules.length > 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {day}
                  </div>
                  {daySchedules.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenChecklist(item)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.25)',
                        border: item.status === 'COMPLETED' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '3px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${item.siteName} (${item.deviceName}) - ${item.status}`}
                    >
                      {item.siteName.split('(')[0]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Input Manual & Perbaiki Jadwal PM */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            width: '100%', maxWidth: '580px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingSchedule ? 'Perbaiki Jadwal Preventive Maintenance' : 'Tambah Jadwal Preventive Maintenance'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Nama Site / Lokasi BSI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BSI KC Hasanuddin, BSI Menara Thamrin, DC Surabaya"
                  value={formSiteName}
                  onChange={e => setFormSiteName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Nama Perangkat / Hostname *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BSI-IBX-GM01"
                    value={formDeviceName}
                    onChange={e => setFormDeviceName(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Tipe / Model Perangkat
                  </label>
                  <select
                    value={formDeviceType}
                    onChange={e => setFormDeviceType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  >
                    <option value="Infoblox TE-1415">Infoblox TE-1415 (Member)</option>
                    <option value="Infoblox TE-2215">Infoblox TE-2215 (Grid Master)</option>
                    <option value="Infoblox PT-4000">Infoblox PT-4000 (External DNS)</option>
                    <option value="Infoblox Trinzic 815">Infoblox Trinzic 815</option>
                    <option value="Virtual Appliance NIOS">Virtual Appliance NIOS (VM)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Tanggal Pelaksanaan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Jam Mulai PM
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    PIC / Engineer Pelaksana *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama engineer penanggung jawab"
                    value={formPic}
                    onChange={e => setFormPic(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Status PM
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as PMSchedule['status'])}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '0.85rem'
                    }}
                  >
                    <option value="SCHEDULED">Terjadwal (Scheduled)</option>
                    <option value="IN_PROGRESS">Sedang Berjalan (In Progress)</option>
                    <option value="COMPLETED">Selesai (Completed)</option>
                    <option value="OVERDUE">Terlambat (Overdue)</option>
                    <option value="RESCHEDULED">Jadwal Ulang (Rescheduled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Catatan / Lingkup Pekerjaan PM
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan khusus, ruang lingkup pemeliharaan, atau koordinasi dengan PIC Site..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Jadwalkan PM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Checklist Inspeksi Teknis PM */}
      {isChecklistModalOpen && activeChecklistSchedule && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            width: '100%', maxWidth: '620px',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Checklist Inspeksi Teknis PM
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {activeChecklistSchedule.siteName} • {activeChecklistSchedule.deviceName}
                </div>
              </div>
              <button
                onClick={() => setIsChecklistModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{
                marginBottom: '18px', padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Status Saat Ini:</div>
                  <div style={{ marginTop: '3px' }}>{renderStatusBadge(activeChecklistSchedule.status)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Progress Inspeksi:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>
                    {activeChecklistSchedule.checklist.filter(c => c.done).length} / {activeChecklistSchedule.checklist.length} Selesai
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeChecklistSchedule.checklist.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheckItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: item.done ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-primary)',
                      border: item.done ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ marginTop: '2px', color: item.done ? '#10b981' : 'var(--text-muted)' }}>
                      {item.done ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)',
                        textDecoration: item.done ? 'line-through' : 'none',
                      }}>
                        {idx + 1}. {item.task}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeChecklistSchedule.notes && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Catatan Tambahan:</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {activeChecklistSchedule.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsChecklistModalOpen(false)}
                className="btn btn-primary"
              >
                Tutup & Simpan Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
