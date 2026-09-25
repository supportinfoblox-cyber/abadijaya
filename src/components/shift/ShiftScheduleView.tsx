'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Settings as SettingsIcon,
  ArrowLeftRight,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Briefcase,
  User,
  CalendarDays,
  FileSpreadsheet,
  Pencil,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportRosterToExcelStyled } from '@/services/exportShiftRosterExcel';
import { useTicketOps } from '@/context/TicketOpsContext';
import { ShiftRosterConfig } from '@/types/shiftRoster';
import { DEFAULT_SHIFT_ROSTER_CONFIG } from '@/data/defaultShiftRoster';
import { secureStorage } from '@/lib/secureStorage';

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_DAYS_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Helper to get standard YYYY-MM-DD string
function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get the Monday of a given date's week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function ShiftScheduleView() {
  const { currentUser } = useTicketOps();
  const today = new Date();
  const todayStr = formatDateStr(today);

  // Month navigation state
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Roster Configuration - Initialized immediately from localStorage or default static config
  const [rosterConfig, setRosterConfig] = useState<ShiftRosterConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const local = secureStorage.getItemSync('ticketops_shift_roster');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && Array.isArray(parsed.engineers) && Array.isArray(parsed.shifts)) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading cached shift roster:', e);
      }
    }
    return DEFAULT_SHIFT_ROSTER_CONFIG;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // View Mode: Calendar vs Matrix (Format Excel) vs Table
  const [viewMode, setViewMode] = useState<'calendar' | 'matrix' | 'table'>('calendar');
  const [matrixPreset, setMatrixPreset] = useState<'current_quarter' | 'single_month'>('current_quarter');

  // Modal States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditNamesModalOpen, setIsEditNamesModalOpen] = useState(false);
  const [editTeam1Name, setEditTeam1Name] = useState('');
  const [editTeam2Name, setEditTeam2Name] = useState('');
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayName: string;
    dayNum: number;
    isWorkday: boolean;
  } | null>(null);
  const [swapNote, setSwapNote] = useState('');

  // Edit Settings Draft State
  const [draftConfig, setDraftConfig] = useState<ShiftRosterConfig | null>(() => {
    return JSON.parse(JSON.stringify(rosterConfig));
  });

  // Helper to load roster config from secure backend API (if available)
  const fetchRosterData = useCallback(async (): Promise<ShiftRosterConfig | null> => {
    try {
      const res = await fetch('/api/shift/roster');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && Array.isArray(data.shifts) && Array.isArray(data.engineers)) {
            return data as ShiftRosterConfig;
          }
        }
      }
    } catch {
      // offline / client-side storage
    }
    return null;
  }, []);

  // Fetch initial config on mount
  useEffect(() => {
    let active = true;
    const loadInitialRoster = async () => {
      try {
        const networkData = await fetchRosterData();
        if (networkData && active) {
          const localStr = secureStorage.getItemSync('ticketops_shift_roster');
          if (localStr) {
            try {
              const localData = JSON.parse(localStr);
              const localTime = new Date(localData.lastUpdatedAt || 0).getTime();
              const networkTime = new Date(networkData.lastUpdatedAt || 0).getTime();
              if (networkTime > localTime) {
                setRosterConfig(networkData);
                setDraftConfig(JSON.parse(JSON.stringify(networkData)));
                secureStorage.setItem('ticketops_shift_roster', JSON.stringify(networkData));
              }
            } catch {
              setRosterConfig(networkData);
              setDraftConfig(JSON.parse(JSON.stringify(networkData)));
            }
          } else {
            setRosterConfig(networkData);
            setDraftConfig(JSON.parse(JSON.stringify(networkData)));
            secureStorage.setItem('ticketops_shift_roster', JSON.stringify(networkData));
          }
        }
      } catch (err: unknown) {
        console.warn('Network sync for shift roster skipped:', err);
      }
    };

    loadInitialRoster();
    return () => {
      active = false;
    };
  }, [fetchRosterData]);

  // Manual refresh handler
  const fetchRosterConfig = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRosterData();
      if (data) {
        setRosterConfig(data);
        setDraftConfig(JSON.parse(JSON.stringify(data)));
        secureStorage.setItem('ticketops_shift_roster', JSON.stringify(data));
        setFeedback({ type: 'success', message: 'Jadwal shift berhasil dimuat ulang!' });
      } else {
        setFeedback({ type: 'success', message: 'Jadwal shift aktif menggunakan konfigurasi tersimpan.' });
      }
    } catch (err: unknown) {
      console.warn('Manual refresh failed:', err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Save roster config to server & local storage
  const saveRosterToServer = async (newConfig: ShiftRosterConfig, successMsg = 'Jadwal shift berhasil diperbarui!') => {
    setIsSaving(true);
    const stampedConfig: ShiftRosterConfig = {
      ...newConfig,
      lastUpdatedAt: new Date().toISOString(),
    };
    try {
      // Immediate local state commit so user never loses their changes (encrypted)
      setRosterConfig(stampedConfig);
      setDraftConfig(JSON.parse(JSON.stringify(stampedConfig)));
      secureStorage.setItem('ticketops_shift_roster', JSON.stringify(stampedConfig));

      // Try syncing to backend API if available (e.g. Node/Docker/Vite)
      const res = await fetch('/api/shift/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stampedConfig),
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: successMsg });
      } else {
        setFeedback({ type: 'success', message: `${successMsg} (Tersimpan di browser)` });
      }
    } catch (err: unknown) {
      console.warn('Saving to server API skipped (static mode), cached locally:', err);
      setFeedback({ type: 'success', message: `${successMsg} (Tersimpan di browser)` });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Open Quick Edit Names Modal
  const handleOpenEditNames = () => {
    if (!rosterConfig) return;
    setEditTeam1Name(rosterConfig.engineers[0]?.name || 'Regu 1');
    setEditTeam2Name(rosterConfig.engineers[1]?.name || 'Regu 2');
    setIsEditNamesModalOpen(true);
  };

  // Save Edited Names
  const handleSaveNames = async () => {
    if (!rosterConfig) return;
    const t1 = editTeam1Name.trim() || 'Regu 1';
    const t2 = editTeam2Name.trim() || 'Regu 2';

    const updatedEngineers = [...rosterConfig.engineers];
    if (updatedEngineers[0]) {
      updatedEngineers[0] = { ...updatedEngineers[0], name: t1 };
    } else {
      updatedEngineers[0] = { id: 'usr-team-1', name: t1, username: 'team_1', role: 'Regu 1' };
    }
    if (updatedEngineers[1]) {
      updatedEngineers[1] = { ...updatedEngineers[1], name: t2 };
    } else {
      updatedEngineers[1] = { id: 'usr-team-2', name: t2, username: 'team_2', role: 'Regu 2' };
    }

    const updatedConfig: ShiftRosterConfig = {
      ...rosterConfig,
      engineers: updatedEngineers,
    };

    await saveRosterToServer(updatedConfig, 'Nama tim / pegawai pada jadwal berhasil diubah!');
    setIsEditNamesModalOpen(false);
  };

  // Quick navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Auto-generate calculation for any given date
  // Determines which shift each engineer has on date YYYY-MM-DD
  const getAssignmentForDate = useCallback((dateStr: string, engineerId: string) => {
    if (!rosterConfig) return null;

    const d = new Date(dateStr);
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const isWorkday = rosterConfig.workdays.includes(dayOfWeek);

    // 1. Check if there is an explicit day override
    const overrideKey = `${dateStr}_${engineerId}`;
    if (rosterConfig.overrides && rosterConfig.overrides[overrideKey]) {
      const ov = rosterConfig.overrides[overrideKey];
      const shiftDef = rosterConfig.shifts.find(s => s.id === ov.shiftId);
      return {
        shiftId: ov.shiftId,
        shift: shiftDef || null,
        isWorkday: ov.shiftId !== 'shift-off',
        isSwapped: !!ov.isSwapped,
        swappedWith: ov.swappedWith,
        note: ov.note,
        isOverride: true,
      };
    }

    // 2. If it is NOT a configured workday (e.g. Saturday or Sunday) or is a configured holiday, default to OFF
    const isHoliday = !!(rosterConfig.holidays && rosterConfig.holidays[dateStr]);
    if (!isWorkday || isHoliday) {
      const offShift = rosterConfig.shifts.find(s => s.id === 'shift-off');
      return {
        shiftId: 'shift-off',
        shift: offShift || null,
        isWorkday: false,
        isHoliday,
        holidayName: rosterConfig.holidays?.[dateStr] || '',
        isSwapped: false,
        isOverride: false,
      };
    }

    // 3. If mode is NON_SHIFT, everyone has the Non-Shift office hours
    if (rosterConfig.mode === 'NON_SHIFT') {
      const nsShift = rosterConfig.shifts.find(s => s.id === 'shift-ns');
      return {
        shiftId: 'shift-ns',
        shift: nsShift || null,
        isWorkday: true,
        isSwapped: false,
        isOverride: false,
      };
    }

    // 4. Mode is SHIFT (2-shift weekly alternating rotation)
    // Calculate week difference from baseWeekMonday
    const baseMonday = new Date(rosterConfig.baseWeekMonday);
    const currentMonday = getMonday(d);
    const diffTime = currentMonday.getTime() - baseMonday.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const isOddWeek = Math.abs(diffWeeks) % 2 === 1;

    const baseShiftId = rosterConfig.baseAssignments[engineerId] || 'shift-1';
    let assignedShiftId = baseShiftId;

    if (isOddWeek) {
      // Rotate: if base was shift-1 -> shift-2, if base was shift-2 -> shift-1
      assignedShiftId = baseShiftId === 'shift-1' ? 'shift-2' : 'shift-1';
    }

    const shiftDef = rosterConfig.shifts.find(s => s.id === assignedShiftId);
    return {
      shiftId: assignedShiftId,
      shift: shiftDef || null,
      isWorkday: true,
      isSwapped: false,
      isOverride: false,
    };
  }, [rosterConfig]);

  // Perform Shift Swap between the two engineers for a date
  const handleSwapShiftForDate = async (dateStr: string) => {
    if (!rosterConfig || rosterConfig.engineers.length < 2) return;

    const eng1 = rosterConfig.engineers[0];
    const eng2 = rosterConfig.engineers[1];

    const assign1 = getAssignmentForDate(dateStr, eng1.id);
    const assign2 = getAssignmentForDate(dateStr, eng2.id);

    if (!assign1 || !assign2) return;

    const newOverrides = { ...rosterConfig.overrides };

    // Swap: eng1 gets assign2's shift, eng2 gets assign1's shift
    newOverrides[`${dateStr}_${eng1.id}`] = {
      date: dateStr,
      engineerId: eng1.id,
      shiftId: assign2.shiftId,
      isSwapped: true,
      swappedWith: eng2.name,
      note: swapNote.trim() || 'Tukar shift antar rekan kerja',
      updatedBy: currentUser?.name || currentUser?.username || 'User',
      updatedAt: new Date().toISOString(),
    };

    newOverrides[`${dateStr}_${eng2.id}`] = {
      date: dateStr,
      engineerId: eng2.id,
      shiftId: assign1.shiftId,
      isSwapped: true,
      swappedWith: eng1.name,
      note: swapNote.trim() || 'Tukar shift antar rekan kerja',
      updatedBy: currentUser?.name || currentUser?.username || 'User',
      updatedAt: new Date().toISOString(),
    };

    const updatedConfig: ShiftRosterConfig = {
      ...rosterConfig,
      overrides: newOverrides,
    };

    await saveRosterToServer(
      updatedConfig,
      `Berhasil menukar shift antara ${eng1.name} dan ${eng2.name} pada tanggal ${dateStr}!`
    );

    setSelectedDayDetail(null);
    setSwapNote('');
  };

  // Set single engineer override (e.g. Leave, Off, specific Shift)
  const handleSetSingleOverride = async (dateStr: string, engineerId: string, shiftId: string) => {
    if (!rosterConfig) return;

    const newOverrides = { ...rosterConfig.overrides };
    const overrideKey = `${dateStr}_${engineerId}`;

    newOverrides[overrideKey] = {
      date: dateStr,
      engineerId,
      shiftId,
      isSwapped: false,
      note: swapNote.trim() || undefined,
      updatedBy: currentUser?.name || currentUser?.username || 'User',
      updatedAt: new Date().toISOString(),
    };

    const updatedConfig: ShiftRosterConfig = {
      ...rosterConfig,
      overrides: newOverrides,
    };

    await saveRosterToServer(updatedConfig, `Penyesuaian shift tanggal ${dateStr} berhasil disimpan.`);
    setSelectedDayDetail(null);
    setSwapNote('');
  };

  // Reset override for date back to normal rotation
  const handleResetDateOverride = async (dateStr: string) => {
    if (!rosterConfig) return;

    const newOverrides = { ...rosterConfig.overrides };
    rosterConfig.engineers.forEach(eng => {
      delete newOverrides[`${dateStr}_${eng.id}`];
    });

    const updatedConfig: ShiftRosterConfig = {
      ...rosterConfig,
      overrides: newOverrides,
    };

    await saveRosterToServer(updatedConfig, `Jadwal tanggal ${dateStr} dikembalikan ke pola rotasi normal.`);
    setSelectedDayDetail(null);
  };

  // Set shift for the entire week (Monday through Friday)
  const handleSetWeekShift = async (
    referenceDateStr: string,
    eng1ShiftId: string,
    eng2ShiftId: string
  ) => {
    if (!rosterConfig || rosterConfig.engineers.length < 2) return;

    const eng1 = rosterConfig.engineers[0];
    const eng2 = rosterConfig.engineers[1];

    const monday = getMonday(new Date(referenceDateStr));
    const newOverrides = { ...rosterConfig.overrides };

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + i);
      const targetDateStr = formatDateStr(targetDate);

      // Keep national holiday if configured
      const isHoliday = !!(rosterConfig.holidays && rosterConfig.holidays[targetDateStr]);
      if (isHoliday) continue;

      newOverrides[`${targetDateStr}_${eng1.id}`] = {
        date: targetDateStr,
        engineerId: eng1.id,
        shiftId: eng1ShiftId,
        isSwapped: false,
        note: `Set mingguan`,
        updatedBy: currentUser?.name || currentUser?.username || 'User',
        updatedAt: new Date().toISOString(),
      };

      newOverrides[`${targetDateStr}_${eng2.id}`] = {
        date: targetDateStr,
        engineerId: eng2.id,
        shiftId: eng2ShiftId,
        isSwapped: false,
        note: `Set mingguan`,
        updatedBy: currentUser?.name || currentUser?.username || 'User',
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedConfig: ShiftRosterConfig = {
      ...rosterConfig,
      overrides: newOverrides,
    };

    const s1Label = eng1ShiftId === 'shift-1' ? 'Shift 1' : 'Shift 2';
    const s2Label = eng2ShiftId === 'shift-1' ? 'Shift 1' : 'Shift 2';
    await saveRosterToServer(
      updatedConfig,
      `Jadwal 1 minggu (Senin - Jumat) berhasil diatur: ${eng1.name} = ${s1Label}, ${eng2.name} = ${s2Label}!`
    );
    setSelectedDayDetail(null);
  };

  // Reset entire week overrides back to rotation
  const handleResetWeekOverride = async (referenceDateStr: string) => {
    if (!rosterConfig) return;
    const monday = getMonday(new Date(referenceDateStr));
    const newOverrides = { ...rosterConfig.overrides };

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + i);
      const targetDateStr = formatDateStr(targetDate);
      rosterConfig.engineers.forEach(eng => {
        delete newOverrides[`${targetDateStr}_${eng.id}`];
      });
    }

    const updatedConfig: ShiftRosterConfig = {
      ...rosterConfig,
      overrides: newOverrides,
    };

    await saveRosterToServer(updatedConfig, `Jadwal 1 minggu ini dikembalikan ke rotasi normal.`);
    setSelectedDayDetail(null);
  };

  // Memoize active matrix months to display
  const matrixMonths = useMemo(() => {
    if (matrixPreset === 'current_quarter') {
      return [
        { year: currentYear, month: currentMonth },
        { year: currentMonth + 1 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 1) % 12 },
        { year: currentMonth + 2 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 2) % 12 },
      ];
    }
    return [{ year: currentYear, month: currentMonth }];
  }, [matrixPreset, currentYear, currentMonth]);

  // Export 1: Matrix Template (Acuan Format 3 Bulan)
  const handleExportMatrixTemplate = () => {
    if (!rosterConfig) return;
    exportRosterToExcelStyled(
      rosterConfig,
      [
        { year: 2026, month: 1 },
        { year: 2026, month: 2 },
        { year: 2026, month: 3 },
      ],
      'Matrix_Template_Roster_Shift_2026.xlsx'
    );
    setIsExportModalOpen(false);
  };

  // Export 2: Sesuai Format Gambar (3 Bulan Berjalan Berdasarkan Pilihan)
  const handleExportSelectedQuarter = () => {
    if (!rosterConfig) return;
    const months = [
      { year: currentYear, month: currentMonth },
      { year: currentMonth + 1 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 1) % 12 },
      { year: currentMonth + 2 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 2) % 12 },
    ];
    exportRosterToExcelStyled(rosterConfig, months);
    setIsExportModalOpen(false);
  };

  // Export 3: Sesuai Format Gambar (1 Bulan Aktif Saja)
  const handleExportCurrentMonthStyled = () => {
    if (!rosterConfig) return;
    exportRosterToExcelStyled(
      rosterConfig,
      [{ year: currentYear, month: currentMonth }],
      `Jadwal_Shift_${INDONESIAN_MONTHS[currentMonth]}_${currentYear}.xlsx`
    );
    setIsExportModalOpen(false);
  };

  // Export 4: Tabular Raw Rows (.xlsx)
  const exportToExcelTable = () => {
    if (!rosterConfig) return;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const rows: any[] = [];

    const eng1 = rosterConfig.engineers[0] || { id: 'usr-team-1', name: 'Regu 1' };
    const eng2 = rosterConfig.engineers[1] || { id: 'usr-team-2', name: 'Regu 2' };

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = formatDateStr(d);
      const dayName = INDONESIAN_DAYS_LONG[(d.getDay() + 6) % 7];

      const a1 = getAssignmentForDate(dateStr, eng1.id);
      const a2 = getAssignmentForDate(dateStr, eng2.id);

      rows.push({
        'Tanggal': dateStr,
        'Hari': dayName,
        [`${eng1.name} (Shift)`]: a1?.shift?.name || 'Off',
        [`${eng1.name} (Jam)`]: a1?.shift?.startTime !== '-' ? `${a1?.shift?.startTime} - ${a1?.shift?.endTime}` : 'Libur',
        [`${eng2.name} (Shift)`]: a2?.shift?.name || 'Off',
        [`${eng2.name} (Jam)`]: a2?.shift?.startTime !== '-' ? `${a2?.shift?.startTime} - ${a2?.shift?.endTime}` : 'Libur',
        'Status Penugasan': (a1?.isSwapped || a2?.isSwapped) ? 'Tukar Shift' : (a1?.isOverride || a2?.isOverride) ? 'Override' : 'Normal',
        'Catatan': a1?.note || a2?.note || '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${INDONESIAN_MONTHS[currentMonth]} ${currentYear}`);

    const fileName = `Jadwal_Shift_Tabular_${INDONESIAN_MONTHS[currentMonth]}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setIsExportModalOpen(false);
  };

  // Calendar days builder for current month view
  const calendarDays = useMemo(() => {
    if (!rosterConfig) return [];

    const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number;
      isWorkday: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatDateStr(prevDate);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek: (prevDate.getDay() + 6) % 7,
        isWorkday: rosterConfig.workdays.includes(prevDate.getDay()),
      });
    }

    // Days in current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const curDate = new Date(currentYear, currentMonth, i);
      const dateStr = formatDateStr(curDate);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dayOfWeek: (curDate.getDay() + 6) % 7,
        isWorkday: rosterConfig.workdays.includes(curDate.getDay()),
      });
    }

    // Trailing days from next month to complete 5 or 6 weeks (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateStr = formatDateStr(nextDate);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek: (nextDate.getDay() + 6) % 7,
        isWorkday: rosterConfig.workdays.includes(nextDate.getDay()),
      });
    }

    return days;
  }, [currentYear, currentMonth, rosterConfig, todayStr]);

  // Determine current active shifts today for cards
  const todayAssignments = useMemo(() => {
    if (!rosterConfig) return null;
    const eng1 = rosterConfig.engineers[0];
    const eng2 = rosterConfig.engineers[1];
    return {
      eng1,
      assign1: eng1 ? getAssignmentForDate(todayStr, eng1.id) : null,
      eng2,
      assign2: eng2 ? getAssignmentForDate(todayStr, eng2.id) : null,
    };
  }, [rosterConfig, todayStr, getAssignmentForDate]);

  if (!rosterConfig) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--accent-primary)' }} />
        <p>Memuat konfigurasi jadwal shift & roster kerja...</p>
      </div>
    );
  }

  const eng1 = rosterConfig.engineers[0] || { id: 'usr-team-1', name: 'Regu 1', username: 'team_1', role: 'Regu 1' };
  const eng2 = rosterConfig.engineers[1] || { id: 'usr-team-2', name: 'Regu 2', username: 'team_2', role: 'Regu 2' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          padding: '14px 18px', borderRadius: '10px',
          backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: feedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
          color: feedback.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.85rem', fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', padding: '22px 26px',
        backgroundColor: 'var(--bg-secondary)', borderRadius: '16px',
        border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CalendarDays size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Jadwal Shift Kerja & Roster
              </h1>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                backgroundColor: rosterConfig.mode === 'SHIFT' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: rosterConfig.mode === 'SHIFT' ? '#6366f1' : '#f59e0b',
                border: rosterConfig.mode === 'SHIFT' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                {rosterConfig.mode === 'SHIFT' ? 'Mode: Rotasi 2 Shift (Mingguan)' : 'Mode: Non-Shift (Jam Kantor)'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Rotasi mingguan silang otomatis • Fitur tukar shift langsung tersinkronisasi antar perangkat rekan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.8rem',
                fontWeight: viewMode === 'calendar' ? 600 : 400,
                backgroundColor: viewMode === 'calendar' ? 'var(--accent-glow)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '5px',
                cursor: 'pointer'
              }}
            >
              <CalendarDays size={13} />
              Kalender Bulanan
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.8rem',
                fontWeight: viewMode === 'matrix' ? 600 : 400,
                backgroundColor: viewMode === 'matrix' ? 'var(--accent-glow)' : 'transparent',
                color: viewMode === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '5px',
                cursor: 'pointer'
              }}
              title="Pratinjau Format Excel sesuai gambar asli"
            >
              <FileSpreadsheet size={13} />
              Matrix Excel
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.8rem',
                fontWeight: viewMode === 'table' ? 600 : 400,
                backgroundColor: viewMode === 'table' ? 'var(--accent-glow)' : 'transparent',
                color: viewMode === 'table' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '5px',
                cursor: 'pointer'
              }}
            >
              <Briefcase size={13} />
              Tabel Roster
            </button>
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
              backgroundColor: '#10b981', borderColor: '#059669', color: '#fff'
            }}
            title="Download Roster ke Format Excel (.xlsx)"
          >
            <Download size={14} /> Unduh Excel
          </button>

          <button
            onClick={handleOpenEditNames}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            title="Ubah nama Tim / Pegawai pada Jadwal Shift"
          >
            <Pencil size={14} /> Ubah Nama
          </button>

          <button
            onClick={() => {
              setDraftConfig(JSON.parse(JSON.stringify(rosterConfig)));
              setIsSettingsModalOpen(true);
            }}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            title="Buka Pengaturan Shift & Jam Kerja"
          >
            <SettingsIcon size={14} /> Pengaturan Shift
          </button>

          <button
            onClick={() => {
              setIsLoading(true);
              fetchRosterConfig();
            }}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            title="Sinkronkan jadwal dari server"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Cards: Today's Shift Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Card 1: Shift Today */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: '14px',
          border: '1px solid var(--border-subtle)', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="var(--accent-primary)" />
              <span>{eng1.name} (Anda)</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: todayAssignments?.assign1?.shift?.color || 'var(--text-primary)' }}>
              {todayAssignments?.assign1?.shift?.name || 'Libur / Off'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Jam Kerja: <strong>{todayAssignments?.assign1?.shift?.startTime !== '-' ? `${todayAssignments?.assign1?.shift?.startTime} - ${todayAssignments?.assign1?.shift?.endTime} WIB` : 'Libur'}</strong>
            </div>
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: '12px',
            backgroundColor: todayAssignments?.assign1?.shift?.bgColor || 'rgba(148, 163, 184, 0.15)',
            color: todayAssignments?.assign1?.shift?.color || '#94a3b8',
            fontWeight: 800, fontSize: '0.88rem'
          }}>
            {todayAssignments?.assign1?.shift?.shortName || 'OFF'}
          </div>
        </div>

        {/* Card 2: Colleague's Shift Today */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: '14px',
          border: '1px solid var(--border-subtle)', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="#6366f1" />
              <span>{eng2.name} (Rekan)</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: todayAssignments?.assign2?.shift?.color || 'var(--text-primary)' }}>
              {todayAssignments?.assign2?.shift?.name || 'Libur / Off'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Jam Kerja: <strong>{todayAssignments?.assign2?.shift?.startTime !== '-' ? `${todayAssignments?.assign2?.shift?.startTime} - ${todayAssignments?.assign2?.shift?.endTime} WIB` : 'Libur'}</strong>
            </div>
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: '12px',
            backgroundColor: todayAssignments?.assign2?.shift?.bgColor || 'rgba(148, 163, 184, 0.15)',
            color: todayAssignments?.assign2?.shift?.color || '#94a3b8',
            fontWeight: 800, fontSize: '0.88rem'
          }}>
            {todayAssignments?.assign2?.shift?.shortName || 'OFF'}
          </div>
        </div>

        {/* Card 3: Live Sync & Swap Info */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: '14px',
          border: '1px solid var(--border-subtle)', padding: '18px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Sinkronisasi Bersama Real-Time</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Tukar shift di satu laptop langsung tampil di laptop rekan.
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Klik tanggal di kalender bawah untuk menukar shift hari itu.
          </div>
        </div>
      </div>

      {/* Month Navigator Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handlePrevMonth}
            className="btn btn-outline btn-sm"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            title="Bulan Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleJumpToToday}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            Hari Ini
          </button>
          <button
            onClick={handleNextMonth}
            className="btn btn-outline btn-sm"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            title="Bulan Berikutnya"
          >
            <ChevronRight size={18} />
          </button>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0 10px', color: 'var(--text-primary)' }}>
            {INDONESIAN_MONTHS[currentMonth]} {currentYear}
          </h2>
        </div>

        {/* Shift Legend Guide */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          {rosterConfig.shifts.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: s.color, display: 'inline-block'
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {s.name} ({s.startTime !== '-' ? `${s.startTime}-${s.endTime}` : 'Libur'})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Views */}
      {viewMode === 'matrix' ? (
        /* Matrix Roster View - Persis Sesuai Gambar Excel Asli */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Preset Controls Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px',
            border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Rentang Bulan Matrix:
              </span>
              <div style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '2px'
              }}>
                <button
                  onClick={() => setMatrixPreset('current_quarter')}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '0.78rem',
                    fontWeight: matrixPreset === 'current_quarter' ? 600 : 400,
                    backgroundColor: matrixPreset === 'current_quarter' ? 'var(--accent-glow)' : 'transparent',
                    color: matrixPreset === 'current_quarter' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  3 Bulan Berjalan
                </button>
                <button
                  onClick={() => setMatrixPreset('single_month')}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '0.78rem',
                    fontWeight: matrixPreset === 'single_month' ? 600 : 400,
                    backgroundColor: matrixPreset === 'single_month' ? 'var(--accent-glow)' : 'transparent',
                    color: matrixPreset === 'single_month' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  1 Bulan Saja ({INDONESIAN_MONTHS[currentMonth]} {currentYear})
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={handleOpenEditNames}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                title="Ubah Nama Tim / Regu pada tabel jadwal"
              >
                <Pencil size={13} /> Ubah Nama Tim
              </button>
              <button
                onClick={handleExportMatrixTemplate}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#059669', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem',
                  padding: '6px 14px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title="Unduh file Excel Matrix Template"
              >
                <Download size={14} /> Download Matrix Template
              </button>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                title="Buka pilihan opsi download Excel lainnya"
              >
                <FileSpreadsheet size={14} /> Pilihan Export...
              </button>
            </div>
          </div>

          {/* Month Blocks */}
          {matrixMonths.map((mSpec) => {
            const { year, month } = mSpec;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthTitle = `${INDONESIAN_MONTHS[month]} ${year}`;

            return (
              <div
                key={`${year}-${month}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1.5px solid #000000',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  overflowX: 'auto',
                  padding: '2px'
                }}
              >
                <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%', fontFamily: 'Calibri, Arial, sans-serif' }}>
                  <tbody>
                    {/* 1. Yellow Header Row */}
                    <tr>
                      <td
                        colSpan={daysInMonth + 1}
                        style={{
                          backgroundColor: '#FFFF00',
                          color: '#000000',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          textAlign: 'center',
                          padding: '7px 12px',
                          border: '1px solid #000000',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {monthTitle}
                      </td>
                    </tr>

                    {/* 2. Days Row */}
                    <tr>
                      {/* Corner Black Cell above Names */}
                      <td style={{
                        backgroundColor: '#000000',
                        width: '180px',
                        minWidth: '180px',
                        border: '1px solid #000000'
                      }} />

                      {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                        const day = dIdx + 1;
                        const d = new Date(year, month, day);
                        const dateStr = formatDateStr(d);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isHoliday = isWeekend || !!(rosterConfig.holidays && rosterConfig.holidays[dateStr]);

                        return (
                          <td
                            key={day}
                            style={{
                              backgroundColor: isHoliday ? '#FF0000' : '#FFFFFF',
                              color: isHoliday ? '#FFFFFF' : '#000000',
                              fontWeight: isHoliday ? 700 : 500,
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              width: '32px',
                              minWidth: '32px',
                              height: '26px',
                              fontSize: '0.8rem',
                              border: '1px solid #000000'
                            }}
                          >
                            {day}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 3. Team 1 */}
                    <tr>
                      <td style={{
                        backgroundColor: '#FFFFFF',
                        color: '#000000',
                        padding: '4px 8px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        border: '1px solid #000000',
                        whiteSpace: 'nowrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span>{eng1.name}</span>
                          <button
                            type="button"
                            onClick={handleOpenEditNames}
                            title="Klik untuk mengubah nama tim/pegawai ini"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#64748b',
                              borderRadius: '4px'
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      </td>

                      {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                        const day = dIdx + 1;
                        const d = new Date(year, month, day);
                        const dateStr = formatDateStr(d);
                        const a1 = getAssignmentForDate(dateStr, eng1.id);
                        const isLibur = !a1?.isWorkday || a1?.shiftId === 'shift-off';
                        const label = a1?.shift?.shortName || (a1?.shiftId === 'shift-1' ? 'S1' : a1?.shiftId === 'shift-2' ? 'S2' : '');

                        return (
                          <td
                            key={day}
                            onClick={() => setSelectedDayDetail({
                              dateStr,
                              dayName: INDONESIAN_DAYS_LONG[(d.getDay() + 6) % 7],
                              dayNum: day,
                              isWorkday: !isLibur
                            })}
                            style={{
                              backgroundColor: isLibur ? '#FF0000' : '#FFFFFF',
                              color: '#000000',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              width: '32px',
                              minWidth: '32px',
                              height: '26px',
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              border: '1px solid #000000',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                            title={`${eng1.name} - ${dateStr}: ${isLibur ? 'Hari Libur' : label} (Klik untuk detail / tukar shift)`}
                          >
                            {!isLibur ? label : ''}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 4. Team 2 */}
                    <tr>
                      <td style={{
                        backgroundColor: '#FFFFFF',
                        color: '#000000',
                        padding: '4px 8px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        border: '1px solid #000000',
                        whiteSpace: 'nowrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span>{eng2.name}</span>
                          <button
                            type="button"
                            onClick={handleOpenEditNames}
                            title="Klik untuk mengubah nama tim/pegawai ini"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#64748b',
                              borderRadius: '4px'
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      </td>

                      {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                        const day = dIdx + 1;
                        const d = new Date(year, month, day);
                        const dateStr = formatDateStr(d);
                        const a2 = getAssignmentForDate(dateStr, eng2.id);
                        const isLibur = !a2?.isWorkday || a2?.shiftId === 'shift-off';
                        const label = a2?.shift?.shortName || (a2?.shiftId === 'shift-1' ? 'S1' : a2?.shiftId === 'shift-2' ? 'S2' : '');

                        return (
                          <td
                            key={day}
                            onClick={() => setSelectedDayDetail({
                              dateStr,
                              dayName: INDONESIAN_DAYS_LONG[(d.getDay() + 6) % 7],
                              dayNum: day,
                              isWorkday: !isLibur
                            })}
                            style={{
                              backgroundColor: isLibur ? '#FF0000' : '#FFFFFF',
                              color: '#000000',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              width: '32px',
                              minWidth: '32px',
                              height: '26px',
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              border: '1px solid #000000',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                            title={`${eng2.name} - ${dateStr}: ${isLibur ? 'Hari Libur' : label} (Klik untuk detail / tukar shift)`}
                          >
                            {!isLibur ? label : ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Remark Legend Table matching exact image */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            border: '1.5px solid #000000',
            width: '240px',
            overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
            fontFamily: 'Calibri, Arial, sans-serif',
            marginTop: '8px'
          }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      backgroundColor: '#FFFF00',
                      color: '#000000',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      textAlign: 'center',
                      padding: '5px',
                      border: '1px solid #000000'
                    }}
                  >
                    Remark
                  </td>
                </tr>
                <tr>
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    width: '45px',
                    padding: '4px',
                    border: '1px solid #000000'
                  }}>
                    S1
                  </td>
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    padding: '4px',
                    border: '1px solid #000000'
                  }}>
                    {rosterConfig.shifts.find(s => s.id === 'shift-1')?.startTime || '07.00'} - {rosterConfig.shifts.find(s => s.id === 'shift-1')?.endTime || '15.00'}
                  </td>
                </tr>
                <tr>
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    padding: '4px',
                    border: '1px solid #000000'
                  }}>
                    S2
                  </td>
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    padding: '4px',
                    border: '1px solid #000000'
                  }}>
                    {rosterConfig.shifts.find(s => s.id === 'shift-2')?.startTime || '14.00'} - {rosterConfig.shifts.find(s => s.id === 'shift-2')?.endTime || '22.00'}
                  </td>
                </tr>
                <tr>
                  <td style={{
                    backgroundColor: '#FF0000',
                    width: '45px',
                    height: '24px',
                    border: '1px solid #000000'
                  }} />
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    padding: '4px',
                    border: '1px solid #000000'
                  }}>
                    Hari Libur
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: '16px',
          border: '1px solid var(--border-subtle)', overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Day of Week Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)',
            textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)'
          }}>
            {INDONESIAN_DAYS_LONG.map((dName, idx) => {
              const isWeekend = idx >= 5; // Saturday or Sunday
              return (
                <div key={dName} style={{
                  padding: '12px 6px',
                  color: isWeekend ? '#ef4444' : 'var(--text-secondary)',
                  borderRight: idx < 6 ? '1px solid var(--border-subtle)' : 'none'
                }}>
                  {dName}
                </div>
              );
            })}
          </div>

          {/* Calendar Grid Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '520px' }}>
            {calendarDays.map((cell, idx) => {
              const assign1 = getAssignmentForDate(cell.dateStr, eng1.id);
              const assign2 = getAssignmentForDate(cell.dateStr, eng2.id);
              const isSwapped = assign1?.isSwapped || assign2?.isSwapped;
              const hasOverride = assign1?.isOverride || assign2?.isOverride;

              const isRightEdge = (idx + 1) % 7 === 0;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => {
                    setSelectedDayDetail({
                      dateStr: cell.dateStr,
                      dayName: INDONESIAN_DAYS_LONG[cell.dayOfWeek],
                      dayNum: cell.dayNum,
                      isWorkday: cell.isWorkday,
                    });
                  }}
                  style={{
                    padding: '8px',
                    minHeight: '105px',
                    backgroundColor: cell.isToday
                      ? 'rgba(99, 102, 241, 0.06)'
                      : cell.isCurrentMonth
                      ? 'transparent'
                      : 'rgba(0,0,0,0.15)',
                    borderRight: !isRightEdge ? '1px solid var(--border-subtle)' : 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s ease',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.12)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = cell.isToday
                      ? 'rgba(99, 102, 241, 0.06)'
                      : cell.isCurrentMonth
                      ? 'transparent'
                      : 'rgba(0,0,0,0.15)';
                  }}
                  title={`Klik untuk melihat detail atau menukar shift tanggal ${cell.dateStr}`}
                >
                  {/* Date Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', fontWeight: cell.isToday ? 700 : 500,
                        backgroundColor: cell.isToday ? 'var(--accent-primary)' : 'transparent',
                        color: cell.isToday ? '#fff' : cell.dayOfWeek >= 5 ? '#ef4444' : 'var(--text-primary)'
                      }}>
                        {cell.dayNum}
                      </span>
                      {cell.dayOfWeek === 0 && cell.isCurrentMonth && (
                        <span
                          style={{
                            fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)'
                          }}
                          title="Klik untuk atur shift 1 minggu penuh (Senin s/d Jumat)"
                        >
                          ⚡ Set Minggu
                        </span>
                      )}
                    </div>

                    {/* Swap / Override indicator */}
                    {isSwapped ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b',
                        display: 'flex', alignItems: 'center', gap: '3px'
                      }} title="Shift telah ditukar">
                        <ArrowLeftRight size={10} /> Ditukar
                      </span>
                    ) : hasOverride ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6'
                      }}>
                        Custom
                      </span>
                    ) : null}
                  </div>

                  {/* Assignments Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Engineer 1 */}
                    <div style={{
                      padding: '3px 6px', borderRadius: '6px',
                      backgroundColor: assign1?.shift?.bgColor || 'rgba(148, 163, 184, 0.15)',
                      border: `1px solid ${assign1?.shift?.borderColor || 'rgba(148, 163, 184, 0.25)'}`,
                      fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65px' }}>
                        {eng1.name.split(' ')[0]}
                      </span>
                      <span style={{ fontWeight: 700, color: assign1?.shift?.color || '#94a3b8' }}>
                        {assign1?.shift?.shortName || 'Off'}
                      </span>
                    </div>

                    {/* Engineer 2 (Colleague) */}
                    <div style={{
                      padding: '3px 6px', borderRadius: '6px',
                      backgroundColor: assign2?.shift?.bgColor || 'rgba(148, 163, 184, 0.15)',
                      border: `1px solid ${assign2?.shift?.borderColor || 'rgba(148, 163, 184, 0.25)'}`,
                      fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65px' }}>
                        {eng2.name.split(' ')[0]}
                      </span>
                      <span style={{ fontWeight: 700, color: assign2?.shift?.color || '#94a3b8' }}>
                        {assign2?.shift?.shortName || 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div style={{
          backgroundColor: 'var(--bg-secondary)', borderRadius: '16px',
          border: '1px solid var(--border-subtle)', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', width: '140px' }}>Tanggal</th>
                <th style={{ padding: '12px 16px', width: '100px' }}>Hari</th>
                <th style={{ padding: '12px 16px' }}>{eng1.name} (Anda)</th>
                <th style={{ padding: '12px 16px' }}>{eng2.name} (Rekan)</th>
                <th style={{ padding: '12px 16px', width: '130px' }}>Status</th>
                <th style={{ padding: '12px 16px', width: '110px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }).map((_, idx) => {
                const day = idx + 1;
                const d = new Date(currentYear, currentMonth, day);
                const dateStr = formatDateStr(d);
                const dayName = INDONESIAN_DAYS_LONG[(d.getDay() + 6) % 7];
                const isToday = dateStr === todayStr;

                const a1 = getAssignmentForDate(dateStr, eng1.id);
                const a2 = getAssignmentForDate(dateStr, eng2.id);
                const isSwapped = a1?.isSwapped || a2?.isSwapped;

                return (
                  <tr
                    key={dateStr}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isToday ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: isToday ? 700 : 500 }}>
                      {dateStr} {isToday && <span style={{ color: 'var(--accent-primary)', fontSize: '0.72rem' }}>(Hari Ini)</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: (d.getDay() === 0 || d.getDay() === 6) ? '#ef4444' : 'inherit' }}>
                      {dayName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px',
                        backgroundColor: a1?.shift?.bgColor, color: a1?.shift?.color, fontWeight: 600, fontSize: '0.8rem'
                      }}>
                        {a1?.shift?.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        {a1?.shift?.startTime !== '-' ? `${a1?.shift?.startTime} - ${a1?.shift?.endTime}` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px',
                        backgroundColor: a2?.shift?.bgColor, color: a2?.shift?.color, fontWeight: 600, fontSize: '0.8rem'
                      }}>
                        {a2?.shift?.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        {a2?.shift?.startTime !== '-' ? `${a2?.shift?.startTime} - ${a2?.shift?.endTime}` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isSwapped ? (
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b'
                        }}>
                          Ditukar
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Normal</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedDayDetail({
                          dateStr, dayName, dayNum: day, isWorkday: rosterConfig.workdays.includes(d.getDay())
                        })}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                      >
                        Kelola
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Export to Excel Options Modal */}
      {isExportModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: '18px',
            border: '1px solid var(--border-subtle)', width: '100%', maxWidth: '580px',
            padding: 'clamp(16px, 4vw, 24px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative',
            boxSizing: 'border-box'
          }}>
            <button
              onClick={() => setIsExportModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <FileSpreadsheet size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Unduh Jadwal Roster ke Excel
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Pilih format ekspor spreadsheet (.xlsx) yang diinginkan
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* Option 1: Matrix Template Acuan */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '2px solid #10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Matrix Template (Format Acuan)
                    </span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', whiteSpace: 'nowrap'
                    }}>
                      Template Acuan
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    Template acuan matrix jadwal 3 bulan (Feb - Apr 2026): Header kuning, tanggal libur, blok shift S1/S2 putih, dan tabel Remark.
                  </div>
                </div>
                <button
                  onClick={handleExportMatrixTemplate}
                  className="btn btn-primary btn-sm"
                  style={{
                    backgroundColor: '#10b981', borderColor: '#059669', color: '#fff',
                    whiteSpace: 'nowrap', padding: '7px 14px', fontWeight: 600, flexShrink: 0
                  }}
                >
                  Unduh .xlsx
                </button>
              </div>

              {/* Option 2: 3 Months Quarter based on selection */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    Format Roster 3 Bulan (Kuartal Berjalan)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                    Mulai dari {INDONESIAN_MONTHS[currentMonth]} {currentYear} + 2 bulan berikutnya.
                  </div>
                </div>
                <button
                  onClick={handleExportSelectedQuarter}
                  className="btn btn-outline btn-sm"
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px', flexShrink: 0 }}
                >
                  Unduh .xlsx
                </button>
              </div>

              {/* Option 3: Current Month Only */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    Format Roster 1 Bulan Saja ({INDONESIAN_MONTHS[currentMonth]} {currentYear})
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                    Satu blok bulan terpilih lengkap dengan warna dan tabel Remark.
                  </div>
                </div>
                <button
                  onClick={handleExportCurrentMonthStyled}
                  className="btn btn-outline btn-sm"
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px', flexShrink: 0 }}
                >
                  Unduh .xlsx
                </button>
              </div>

              {/* Option 4: Tabular Data */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    Format Tabel Baris per Hari (Raw Data)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                    Data mentah per baris untuk rekap atau olah pivot table di Excel.
                  </div>
                </div>
                <button
                  onClick={exportToExcelTable}
                  className="btn btn-outline btn-sm"
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px', flexShrink: 0 }}
                >
                  Unduh .xlsx
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="btn btn-outline btn-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Detail & Shift Swap Modal */}
      {selectedDayDetail && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: '18px',
            border: '1px solid var(--border-subtle)', width: '100%', maxWidth: '540px',
            maxHeight: '92vh', overflowY: 'auto',
            padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative'
          }}>
            <button
              onClick={() => { setSelectedDayDetail(null); setSwapNote(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CalendarIcon size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {(() => {
                    const [y, m, d] = selectedDayDetail.dateStr.split('-');
                    return `${selectedDayDetail.dayName}, ${parseInt(d, 10)} ${INDONESIAN_MONTHS[parseInt(m, 10) - 1]} ${y}`;
                  })()}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Tanggal: {selectedDayDetail.dateStr}
                </span>
              </div>
            </div>

            {/* Current Day Assignments Info */}
            <div style={{
              backgroundColor: 'var(--bg-primary)', borderRadius: '12px',
              padding: '14px', border: '1px solid var(--border-subtle)', marginBottom: '18px',
              display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                JADWAL PENUGASAN SAAT INI:
              </div>

              {/* Engineer 1 */}
              {(() => {
                const a = getAssignmentForDate(selectedDayDetail.dateStr, eng1.id);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      👤 {eng1.name} (Anda):
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px',
                      backgroundColor: a?.shift?.bgColor, color: a?.shift?.color,
                      fontSize: '0.8rem', fontWeight: 700
                    }}>
                      {a?.shift?.name} ({a?.shift?.startTime !== '-' ? `${a?.shift?.startTime}-${a?.shift?.endTime}` : 'Libur'})
                    </span>
                  </div>
                );
              })()}

              {/* Engineer 2 */}
              {(() => {
                const a = getAssignmentForDate(selectedDayDetail.dateStr, eng2.id);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      👤 {eng2.name} (Rekan):
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px',
                      backgroundColor: a?.shift?.bgColor, color: a?.shift?.color,
                      fontSize: '0.8rem', fontWeight: 700
                    }}>
                      {a?.shift?.name} ({a?.shift?.startTime !== '-' ? `${a?.shift?.startTime}-${a?.shift?.endTime}` : 'Libur'})
                    </span>
                  </div>
                );
              })()}

              {/* Check if already swapped */}
              {(() => {
                const a1 = getAssignmentForDate(selectedDayDetail.dateStr, eng1.id);
                if (a1?.isSwapped) {
                  return (
                    <div style={{
                      marginTop: '6px', padding: '8px 10px', borderRadius: '6px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)',
                      fontSize: '0.75rem', color: '#f59e0b'
                    }}>
                      🔄 <strong>Shift Ditukar:</strong> {a1.note || 'Tukar shift dengan rekan kerja'}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* SECTION 1: ATUR 1 MINGGU PENUH (SENIN - JUMAT) */}
            <div style={{
              backgroundColor: 'var(--bg-primary)', borderRadius: '12px',
              padding: '14px', border: '1.5px solid var(--accent-glow)', marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ⚡ Atur Jadwal 1 Minggu Ini (Senin s/d Jumat)
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }}>
                  Auto 1 Minggu
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                Pilih shift Anda di minggu ini. Seluruh hari kerja (Senin - Jumat) otomatis terisi, namun setiap hari tetap bebas Anda edit:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* Button Option 1: Anda S1, Rekan S2 */}
                <button
                  type="button"
                  onClick={() => handleSetWeekShift(selectedDayDetail.dateStr, 'shift-1', 'shift-2')}
                  disabled={isSaving}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1.5px solid #10b981',
                    color: '#10b981', cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    textAlign: 'center', transition: 'all 0.15s ease'
                  }}
                  title="Terapkan Senin s/d Jumat: Anda Shift 1, Rekan Shift 2"
                >
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    🟢 Anda Shift 1 (Pagi)
                  </span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, color: 'var(--text-secondary)' }}>
                    Rekan: Shift 2 (Sore)
                  </span>
                </button>

                {/* Button Option 2: Anda S2, Rekan S1 */}
                <button
                  type="button"
                  onClick={() => handleSetWeekShift(selectedDayDetail.dateStr, 'shift-2', 'shift-1')}
                  disabled={isSaving}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)', border: '1.5px solid #6366f1',
                    color: '#6366f1', cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    textAlign: 'center', transition: 'all 0.15s ease'
                  }}
                  title="Terapkan Senin s/d Jumat: Anda Shift 2, Rekan Shift 1"
                >
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    🟣 Anda Shift 2 (Sore)
                  </span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, color: 'var(--text-secondary)' }}>
                    Rekan: Shift 1 (Pagi)
                  </span>
                </button>
              </div>
            </div>

            {/* SECTION 2: EDIT KHUSUS HARI INI (MASIH BISA DI EDIT) */}
            <div style={{
              backgroundColor: 'var(--bg-primary)', borderRadius: '12px',
              padding: '14px', border: '1px solid var(--border-subtle)', marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                ✏️ Edit Khusus Hari Ini Saja
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                Ubah shift individu untuk {selectedDayDetail.dayName}, {selectedDayDetail.dayNum}:
              </p>

              {/* Shift Anda Picker */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Shift untuk Anda ({eng1.name}):
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {rosterConfig.shifts.map(s => {
                    const currentAssign = getAssignmentForDate(selectedDayDetail.dateStr, eng1.id);
                    const isSelected = currentAssign?.shiftId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSetSingleOverride(selectedDayDetail.dateStr, eng1.id, s.id)}
                        disabled={isSaving}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                          border: isSelected ? `2px solid ${s.color}` : '1px solid var(--border-subtle)',
                          backgroundColor: isSelected ? s.bgColor : 'transparent',
                          color: isSelected ? s.color : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {s.shortName} ({s.startTime !== '-' ? `${s.startTime}` : 'Off'})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift Rekan Picker */}
              <div style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Shift untuk Rekan ({eng2.name}):
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {rosterConfig.shifts.map(s => {
                    const currentAssign = getAssignmentForDate(selectedDayDetail.dateStr, eng2.id);
                    const isSelected = currentAssign?.shiftId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSetSingleOverride(selectedDayDetail.dateStr, eng2.id, s.id)}
                        disabled={isSaving}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                          border: isSelected ? `2px solid ${s.color}` : '1px solid var(--border-subtle)',
                          backgroundColor: isSelected ? s.bgColor : 'transparent',
                          color: isSelected ? s.color : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {s.shortName} ({s.startTime !== '-' ? `${s.startTime}` : 'Off'})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 3: TUKAR SHIFT & RESET */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  Catatan / Alasan Tukar Shift (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tukar shift hari ini karena ada keperluan"
                  value={swapNote}
                  onChange={e => setSwapNote(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.8rem'
                  }}
                />
              </div>

              {/* Primary Action Button: Swap Shift */}
              <button
                type="button"
                onClick={() => handleSwapShiftForDate(selectedDayDetail.dateStr)}
                disabled={isSaving}
                className="btn btn-outline"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '10px', borderRadius: '8px',
                  fontWeight: 600, fontSize: '0.84rem', cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                <ArrowLeftRight size={15} />
                {isSaving ? 'Menyimpan...' : 'Tukar Shift Antar Rekan Hari Ini'}
              </button>

              {/* Reset Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(getAssignmentForDate(selectedDayDetail.dateStr, eng1.id)?.isOverride ||
                  getAssignmentForDate(selectedDayDetail.dateStr, eng2.id)?.isOverride) && (
                  <button
                    type="button"
                    onClick={() => handleResetDateOverride(selectedDayDetail.dateStr)}
                    disabled={isSaving}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '7px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={13} /> Reset Hari Ini ke Normal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleResetWeekOverride(selectedDayDetail.dateStr)}
                  disabled={isSaving}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '7px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} /> Reset 1 Minggu Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Shift Config & Workdays Template) */}
      {isSettingsModalOpen && draftConfig && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: '18px',
            border: '1px solid var(--border-subtle)', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflowY: 'auto', padding: '26px', position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <SettingsIcon size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Pengaturan Shift & Template Jam Kerja
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Atur jam shift, rentang hari kerja, dan pola rotasi mingguan otomatis
                </p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await saveRosterToServer(draftConfig, 'Konfigurasi shift & pola rotasi berhasil disimpan ke server!');
              setIsSettingsModalOpen(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Mode Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Mode Operasional Kerja
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setDraftConfig(prev => prev ? { ...prev, mode: 'SHIFT' } : null)}
                    style={{
                      padding: '12px', borderRadius: '10px', border: draftConfig.mode === 'SHIFT' ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                      backgroundColor: draftConfig.mode === 'SHIFT' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)',
                      color: draftConfig.mode === 'SHIFT' ? '#6366f1' : 'var(--text-secondary)',
                      cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Mode Shift (Rotasi 2 Regu)</div>
                    <div style={{ fontSize: '0.74rem', marginTop: '2px', opacity: 0.8 }}>Bergantian Shift 1 & 2 tiap minggu</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftConfig(prev => prev ? { ...prev, mode: 'NON_SHIFT' } : null)}
                    style={{
                      padding: '12px', borderRadius: '10px', border: draftConfig.mode === 'NON_SHIFT' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                      backgroundColor: draftConfig.mode === 'NON_SHIFT' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-primary)',
                      color: draftConfig.mode === 'NON_SHIFT' ? '#f59e0b' : 'var(--text-secondary)',
                      cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Mode Non-Shift (Jam Kantor)</div>
                    <div style={{ fontSize: '0.74rem', marginTop: '2px', opacity: 0.8 }}>Jam kerja standar tanpa pembagian regu</div>
                  </button>
                </div>
              </div>

              {/* Engineer / Team Names Settings */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  <User size={15} color="var(--accent-primary)" />
                  <span>Nama Regu / Pegawai di Jadwal</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                  Nama ini akan tercantum pada tabel matrix jadwal, kalender, serta ekspor file Excel (.xlsx).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Nama Tim / Regu 1:
                    </label>
                    <input
                      type="text"
                      value={draftConfig.engineers[0]?.name || ''}
                      placeholder="Contoh: Regu 1"
                      onChange={e => {
                        const val = e.target.value;
                        setDraftConfig(prev => {
                          if (!prev) return null;
                          const updated = [...prev.engineers];
                          if (updated[0]) {
                            updated[0] = { ...updated[0], name: val };
                          } else {
                            updated[0] = { id: 'usr-team-1', name: val, username: 'team_1', role: 'Regu 1' };
                          }
                          return { ...prev, engineers: updated };
                        });
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                        border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 600
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Nama Tim / Regu 2:
                    </label>
                    <input
                      type="text"
                      value={draftConfig.engineers[1]?.name || ''}
                      placeholder="Contoh: Regu 2"
                      onChange={e => {
                        const val = e.target.value;
                        setDraftConfig(prev => {
                          if (!prev) return null;
                          const updated = [...prev.engineers];
                          if (updated[1]) {
                            updated[1] = { ...updated[1], name: val };
                          } else {
                            updated[1] = { id: 'usr-team-2', name: val, username: 'team_2', role: 'Regu 2' };
                          }
                          return { ...prev, engineers: updated };
                        });
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                        border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 600
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Shift Hours Settings */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Pengaturan Jam Kerja Shift
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {draftConfig.shifts.filter(s => s.id !== 'shift-off').map((s) => (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: s.color }}>
                        {s.name}:
                      </span>
                      <div>
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={e => {
                            const val = e.target.value;
                            setDraftConfig(prev => {
                              if (!prev) return null;
                              const updated = prev.shifts.map(item => item.id === s.id ? { ...item, startTime: val } : item);
                              return { ...prev, shifts: updated };
                            });
                          }}
                          style={{
                            width: '100%', padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)', fontSize: '0.82rem'
                          }}
                        />
                      </div>
                      <div>
                        <input
                          type="time"
                          value={s.endTime}
                          onChange={e => {
                            const val = e.target.value;
                            setDraftConfig(prev => {
                              if (!prev) return null;
                              const updated = prev.shifts.map(item => item.id === s.id ? { ...item, endTime: val } : item);
                              return { ...prev, shifts: updated };
                            });
                          }}
                          style={{
                            width: '100%', padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)', fontSize: '0.82rem'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workdays Range (Rentang Hari Kerja) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Rentang Hari Kerja Aktif
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { val: 1, label: 'Senin' },
                    { val: 2, label: 'Selasa' },
                    { val: 3, label: 'Rabu' },
                    { val: 4, label: 'Kamis' },
                    { val: 5, label: 'Jumat' },
                    { val: 6, label: 'Sabtu' },
                    { val: 0, label: 'Minggu' },
                  ].map(day => {
                    const isChecked = draftConfig.workdays.includes(day.val);
                    return (
                      <button
                        key={day.val}
                        type="button"
                        onClick={() => {
                          setDraftConfig(prev => {
                            if (!prev) return null;
                            const exists = prev.workdays.includes(day.val);
                            const updated = exists
                              ? prev.workdays.filter(d => d !== day.val)
                              : [...prev.workdays, day.val];
                            return { ...prev, workdays: updated };
                          });
                        }}
                        style={{
                          padding: '6px 14px', borderRadius: '8px',
                          border: isChecked ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                          backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                          color: isChecked ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '0.8rem', fontWeight: isChecked ? 700 : 500, cursor: 'pointer'
                        }}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Hari di luar pilihan ini otomatis ditetapkan sebagai Libur (Off).
                </span>
              </div>

              {/* Base Week Assignment Setting */}
              {draftConfig.mode === 'SHIFT' && (
                <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Pola Acuan Awal (Minggu Ini)
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                    Tentukan siapa yang memegang Shift 1 pada minggu acuan. Minggu berikutnya akan otomatis berotasi silang.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {eng1.name} (Anda)
                      </label>
                      <select
                        value={draftConfig.baseAssignments[eng1.id] || 'shift-1'}
                        onChange={e => {
                          const val = e.target.value;
                          setDraftConfig(prev => {
                            if (!prev) return null;
                            const otherVal = val === 'shift-1' ? 'shift-2' : 'shift-1';
                            return {
                              ...prev,
                              baseAssignments: {
                                [eng1.id]: val,
                                [eng2.id]: otherVal,
                              }
                            };
                          });
                        }}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: '6px',
                          border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600
                        }}
                      >
                        <option value="shift-1">Shift 1 (Pagi)</option>
                        <option value="shift-2">Shift 2 (Sore/Malam)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {eng2.name} (Rekan)
                      </label>
                      <select
                        value={draftConfig.baseAssignments[eng2.id] || 'shift-2'}
                        disabled
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: '6px',
                          border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)', fontSize: '0.82rem', opacity: 0.8
                        }}
                      >
                        <option value="shift-1">Shift 1 (Pagi)</option>
                        <option value="shift-2">Shift 2 (Sore/Malam)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '10px 18px', borderRadius: '8px',
                    backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none',
                    fontWeight: 600, fontSize: '0.85rem', cursor: isSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan & Terapkan ke Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Modal: Ubah Nama di Jadwal */}
      {isEditNamesModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: '18px',
            border: '1px solid var(--border-subtle)', width: '100%', maxWidth: '480px',
            padding: '24px', position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <button
              onClick={() => setIsEditNamesModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Ubah Nama di Jadwal Shift
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Ubah nama Tim / Pegawai untuk tabel matrix dan ekspor file Excel
                </p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveNames();
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Nama Tim / Regu 1
                </label>
                <input
                  type="text"
                  value={editTeam1Name}
                  onChange={e => setEditTeam1Name(e.target.value)}
                  placeholder="Contoh: Regu 1"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Nama Tim / Regu 2
                </label>
                <input
                  type="text"
                  value={editTeam2Name}
                  onChange={e => setEditTeam2Name(e.target.value)}
                  placeholder="Contoh: Regu 2"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditNamesModalOpen(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '10px 18px', borderRadius: '8px',
                    backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none',
                    fontWeight: 600, fontSize: '0.85rem', cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Check size={16} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Nama'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
