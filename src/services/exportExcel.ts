import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Ticket } from '@/types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Helper to convert Blob to pure Base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Universal file saver & sharer that works on both Web Browsers and Native Android APK
 */
export async function saveOrShareFile(options: {
  filename: string;
  blob: Blob;
  mimeType: string;
  base64Data?: string;
}): Promise<boolean> {
  const { filename, blob } = options;

  // Check if running on native mobile (Capacitor Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      let base64 = options.base64Data;
      if (!base64) {
        base64 = await blobToBase64(blob);
      }

      // Write to Cache directory
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      // Trigger Android native share / file handler sheet
      await Share.share({
        title: filename,
        text: `Export file: ${filename}`,
        url: savedFile.uri,
        dialogTitle: 'Buka atau Simpan File',
      });
      return true;
    } catch (err: any) {
      console.warn('Native share/filesystem export failed, falling back to web download:', err);
    }
  }

  // Web Browser fallback
  try {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (webErr) {
    console.error('Web file download failed:', webErr);
    alert('Gagal mendownload file: ' + String(webErr));
    return false;
  }
}

export interface ExcelExportOptions {
  filenamePrefix?: string;
  filterLabel?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Export tickets to professional multi-sheet Microsoft Excel (.xlsx) file
 */
export async function exportTicketsToExcel(
  tickets: Ticket[],
  options: ExcelExportOptions = {}
): Promise<boolean> {
  if (!tickets || tickets.length === 0) {
    alert('Tidak ada tiket yang dapat diexport.');
    return false;
  }

  const {
    filenamePrefix = 'tiket_export',
    filterLabel = 'Semua Tiket',
    dateRange,
  } = options;

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hr}:${min}`;
    } catch {
      return dateStr;
    }
  };

  // Sanitize cell values against formula injection (CWE-1236 / Data leakage prevention)
  const sanitizeCell = (val: any, fallback = '-'): string => {
    if (val === null || val === undefined || val === '') return fallback;
    let str = String(val).trim();
    if (/^[=+@\-\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) {
      str = "'" + str;
    }
    return str;
  };

  // 1. Build Ticket Table Rows
  const ticketRows = tickets.map((t, index) => {
    const queue = t.queueCode || (t.queueName ? t.queueName.split(' ')[0] : 'General');
    return {
      'No.': index + 1,
      'No. Tiket': sanitizeCell(t.ticketNumber || t.id),
      'ID Sistem': sanitizeCell(t.externalId || t.id),
      'Antrean (Queue)': sanitizeCell(queue),
      'Judul Tiket (Subject)': sanitizeCell(t.subject),
      'Kriteria Utama': sanitizeCell(t.kriteria || t.mainCategory || 'Other'),
      'Sub-Kriteria / Detail Tipe': sanitizeCell(t.subKriteria || t.subTipe || t.technicalCategory),
      'Status Tiket': t.status,
      'Prioritas': t.priority,
      'Status SLA': t.slaStatus || 'SAFE',
      'Pelapor (Requester)': sanitizeCell(t.requester || t.requesterName || 'Pengguna'),
      'Email Pelapor': sanitizeCell(t.requesterEmail),
      'PIC / Assignee': sanitizeCell(t.assigneeName || 'Petugas'),
      'Unit Kerja': sanitizeCell(t.department || 'Network Operations'),
      'Tanggal Dibuat': formatDate(t.createdAt),
      'Tanggal Diperbarui': formatDate(t.updatedAt),
      'Tanggal Selesai / Tutup': formatDate(t.closedAt),
      'Catatan Resolusi': sanitizeCell(t.resolutionNote),
      'Tautan Portal': t.otrsUrl || '',
    };
  });

  // 2. Build Summary Rows
  const dnsCount = tickets.filter(t => t.kriteria === 'DNS Request' || t.subject?.toLowerCase().includes('dns') || t.subject?.toLowerCase().includes('cname')).length;
  const reserveCount = tickets.filter(t => t.kriteria === 'Reserve IP' || t.subject?.toLowerCase().includes('reserve')).length;
  const ipamCount = tickets.filter(t => t.kriteria === 'IPAM' || t.subject?.toLowerCase().includes('ipam')).length;
  const drpCount = tickets.filter(t => t.kriteria === 'DRP' || t.subject?.toLowerCase().includes('drp') || t.subject?.toLowerCase().includes('standby')).length;
  const otherCount = tickets.length - (dnsCount + reserveCount + ipamCount + drpCount);

  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN PROGRESS').length;
  const pendingCount = tickets.filter(t => t.status === 'PENDING').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const closedCount = tickets.filter(t => t.status === 'CLOSED').length;

  const summaryRows = [
    { 'Parameter Telemetri': 'Judul Laporan', 'Nilai / Keterangan': 'Portal Abadi Jaya Enterprise - Laporan Tiket Operasional' },
    { 'Parameter Telemetri': 'Periode Penarikan', 'Nilai / Keterangan': dateRange?.startDate && dateRange?.endDate ? `${dateRange.startDate} s/d ${dateRange.endDate}` : filterLabel },
    { 'Parameter Telemetri': 'Tanggal & Jam Export', 'Nilai / Keterangan': formatDate(new Date().toISOString()) + ' WIB' },
    { 'Parameter Telemetri': 'Total Tiket Terdata', 'Nilai / Keterangan': tickets.length },
    { 'Parameter Telemetri': '---', 'Nilai / Keterangan': '---' },
    { 'Parameter Telemetri': 'Kriteria: DNS Request', 'Nilai / Keterangan': dnsCount },
    { 'Parameter Telemetri': 'Kriteria: Reserve IP / Fixed Address', 'Nilai / Keterangan': reserveCount },
    { 'Parameter Telemetri': 'Kriteria: IPAM', 'Nilai / Keterangan': ipamCount },
    { 'Parameter Telemetri': 'Kriteria: DRP / Standby', 'Nilai / Keterangan': drpCount },
    { 'Parameter Telemetri': 'Kriteria: Lainnya', 'Nilai / Keterangan': Math.max(0, otherCount) },
    { 'Parameter Telemetri': '---', 'Nilai / Keterangan': '---' },
    { 'Parameter Telemetri': 'Status: Open', 'Nilai / Keterangan': openCount },
    { 'Parameter Telemetri': 'Status: In Progress', 'Nilai / Keterangan': inProgressCount },
    { 'Parameter Telemetri': 'Status: Pending', 'Nilai / Keterangan': pendingCount },
    { 'Parameter Telemetri': 'Status: Resolved', 'Nilai / Keterangan': resolvedCount },
    { 'Parameter Telemetri': 'Status: Closed', 'Nilai / Keterangan': closedCount },
  ];

  // 3. Create Workbook and Sheets
  const wb = XLSX.utils.book_new();

  const wsTickets = XLSX.utils.json_to_sheet(ticketRows);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  // Auto-fit column widths
  wsTickets['!cols'] = [
    { wch: 6 },  // No.
    { wch: 22 }, // No. Tiket
    { wch: 18 }, // ID Sistem
    { wch: 16 }, // Antrean
    { wch: 45 }, // Judul Tiket
    { wch: 20 }, // Kriteria Utama
    { wch: 26 }, // Sub-Kriteria
    { wch: 14 }, // Status
    { wch: 12 }, // Prioritas
    { wch: 14 }, // Status SLA
    { wch: 26 }, // Pelapor
    { wch: 26 }, // Email
    { wch: 22 }, // Assignee
    { wch: 30 }, // Unit Kerja
    { wch: 18 }, // Tgl Dibuat
    { wch: 18 }, // Tgl Diperbarui
    { wch: 18 }, // Tgl Selesai
    { wch: 35 }, // Catatan Resolusi
    { wch: 45 }, // Tautan iCare
  ];

  wsSummary['!cols'] = [
    { wch: 38 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, wsTickets, 'Daftar Tiket');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan & Statistik');

  // Filename with timestamp
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateSuffix}.xlsx`;

  // Write Excel
  const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  return await saveOrShareFile({
    filename,
    blob,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64Data,
  });
}

export interface MonthlyChartExportOptions {
  chartImageBase64: string;
  chartData: Array<{
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
  }>;
  timeframeLabel: string;
  peakLabel?: string;
  peakTotal?: number;
  averageTickets?: number;
  periodUnit?: 'bulan' | 'hari';
  filenamePrefix?: string;
}

/**
 * Export tickets + high-resolution diagram image to Excel with dedicated sheets:
 * Sheet 1: 'Visualisasi Diagram' (Summary KPIs + Embedded Chart Image)
 * Sheet 2: 'Rekapitulasi Periode' (Aggregated stats table)
 * Sheet 3: 'Data Tiket Detail' (Raw ticket data)
 */
export async function exportMonthlyChartToExcel(
  tickets: Ticket[],
  options: MonthlyChartExportOptions
): Promise<boolean> {
  const {
    chartImageBase64,
    chartData,
    timeframeLabel,
    peakLabel = '-',
    peakTotal = 0,
    averageTickets = 0,
    periodUnit = 'bulan',
    filenamePrefix = 'laporan_diagram_tiket',
  } = options;

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hr}:${min}`;
    } catch {
      return dateStr;
    }
  };

  const sanitizeCell = (val: any, fallback = '-'): string => {
    if (val === null || val === undefined || val === '') return fallback;
    let str = String(val).trim();
    if (/^[=+@\-\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) {
      str = "'" + str;
    }
    return str;
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TicketOps Management System - iCare OTRS';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Summary counts
  const dnsTotal = tickets.filter(t => t.kriteria === 'DNS Request' || t.subject?.toLowerCase().includes('dns') || t.subject?.toLowerCase().includes('cname')).length;
  const reserveTotal = tickets.filter(t => t.kriteria === 'Reserve IP' || t.subject?.toLowerCase().includes('reserve') || t.subject?.toLowerCase().includes('fixed address')).length;
  const ipamTotal = tickets.filter(t => t.kriteria === 'IPAM' || t.subject?.toLowerCase().includes('ipam')).length;
  const drpTotal = tickets.filter(t => t.kriteria === 'DRP' || t.subject?.toLowerCase().includes('drp') || t.subject?.toLowerCase().includes('standby')).length;

  // ─────────────────────────────────────────────────────────────
  // SHEET 1: VISUALISASI DIAGRAM
  // ─────────────────────────────────────────────────────────────
  const wsDiagram = workbook.addWorksheet('Visualisasi Diagram', {
    views: [{ showGridLines: true }],
  });

  // Margin column
  wsDiagram.getColumn('A').width = 4;
  wsDiagram.getColumn('B').width = 24;
  wsDiagram.getColumn('C').width = 16;
  wsDiagram.getColumn('D').width = 26;
  wsDiagram.getColumn('E').width = 20;
  wsDiagram.getColumn('F').width = 16;
  wsDiagram.getColumn('G').width = 20;
  wsDiagram.getColumn('H').width = 16;
  wsDiagram.getColumn('I').width = 16;

  // Title Banner
  const titleCell = wsDiagram.getCell('B2');
  titleCell.value = 'DIAGRAM TIKET BULANAN & PEAK VELOCITY (iCare OTRS)';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF4338CA' } };

  const subCell = wsDiagram.getCell('B3');
  subCell.value = `Periode: ${timeframeLabel}   |   Total Tiket: ${tickets.length} Tiket   |   Tanggal Unduh: ${formatDate(new Date().toISOString())} WIB`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };

  // KPI Header Cards (Row 5 & Row 6)
  const kpiHeaders = [
    { col: 'B', title: 'Periode Filter', val: timeframeLabel },
    { col: 'C', title: 'Total Tiket', val: tickets.length },
    { col: 'D', title: 'Puncak (Peak Velocity)', val: `${peakLabel} (${peakTotal} Tiket)` },
    { col: 'E', title: 'Rata-rata Volume', val: `~${averageTickets} tiket/${periodUnit}` },
    { col: 'F', title: 'DNS Request', val: `${dnsTotal} Tiket` },
    { col: 'G', title: 'Reserve IP', val: `${reserveTotal} Tiket` },
    { col: 'H', title: 'IPAM', val: `${ipamTotal} Tiket` },
    { col: 'I', title: 'DRP / Standby', val: `${drpTotal} Tiket` },
  ];

  kpiHeaders.forEach(kpi => {
    const hCell = wsDiagram.getCell(`${kpi.col}5`);
    hCell.value = kpi.title;
    hCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    hCell.alignment = { vertical: 'middle', horizontal: 'center' };
    hCell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    };

    const vCell = wsDiagram.getCell(`${kpi.col}6`);
    vCell.value = kpi.val;
    vCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    vCell.alignment = { vertical: 'middle', horizontal: 'center' };
    vCell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF6366F1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  const noteCell = wsDiagram.getCell('B8');
  noteCell.value = 'Grafik visualisasi diagram resolusi tinggi sesuai filter yang dipilih:';
  noteCell.font = { name: 'Segoe UI', size: 9.5, italic: true, bold: true, color: { argb: 'FF475569' } };

  // Add Chart Image
  if (chartImageBase64) {
    const imgId = workbook.addImage({
      base64: chartImageBase64,
      extension: 'png',
    });

    wsDiagram.addImage(imgId, {
      tl: { col: 1, row: 8 }, // Cell B9
      ext: { width: 980, height: 530 },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SHEET 2: REKAPITULASI PERIODE
  // ─────────────────────────────────────────────────────────────
  const wsRekap = workbook.addWorksheet('Rekapitulasi Periode', {
    views: [{ showGridLines: true }],
  });

  wsRekap.getColumn('A').width = 4;   // Margin
  wsRekap.getColumn('B').width = 6;   // No.
  wsRekap.getColumn('C').width = 24;  // Periode Waktu
  wsRekap.getColumn('D').width = 16;  // DNS
  wsRekap.getColumn('E').width = 20;  // Reserve IP
  wsRekap.getColumn('F').width = 14;  // IPAM
  wsRekap.getColumn('G').width = 16;  // DRP
  wsRekap.getColumn('H').width = 14;  // Lainnya
  wsRekap.getColumn('I').width = 16;  // Total Tiket
  wsRekap.getColumn('J').width = 16;  // % dari Total
  wsRekap.getColumn('K').width = 20;  // Status Peak

  const rekapTitle = wsRekap.getCell('B2');
  rekapTitle.value = `TABEL REKAPITULASI TIKET - PERIODE ${timeframeLabel.toUpperCase()}`;
  rekapTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };

  const rekapSub = wsRekap.getCell('B3');
  rekapSub.value = `Data teragregasi per interval waktu berdasarkan kriteria operasional`;
  rekapSub.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };

  // Table Headers
  const rekapCols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const rekapHeaderNames = [
    'No.',
    'Periode Waktu',
    'DNS Request',
    'Reserve IP / Fixed',
    'IPAM',
    'DRP / Standby',
    'Lainnya',
    'Total Tiket',
    '% Kontribusi',
    'Status Peak',
  ];

  rekapCols.forEach((col, idx) => {
    const c = wsRekap.getCell(`${col}5`);
    c.value = rekapHeaderNames[idx];
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF4338CA' } },
      left: { style: 'thin', color: { argb: 'FF4338CA' } },
      bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
      right: { style: 'thin', color: { argb: 'FF4338CA' } },
    };
  });

  const totalAllPeriodTickets = chartData.reduce((acc, d) => acc + d.total, 0) || 1;
  let curRow = 6;

  chartData.forEach((item, index) => {
    const isPeak = peakLabel && (item.fullLabel?.includes(peakLabel) || item.label.includes(peakLabel) || item.key === peakLabel);
    const rowBg = isPeak
      ? 'FFFEF3C7' // light gold
      : (index % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF');

    const pct = ((item.total / totalAllPeriodTickets) * 100).toFixed(1) + '%';
    const values = [
      index + 1,
      item.fullLabel || `${item.label} ${item.subLabel || ''}`,
      item.dns,
      item.reserve,
      item.ipam,
      item.drp,
      item.other,
      item.total,
      pct,
      isPeak ? '★ PUNCAK (PEAK)' : '-',
    ];

    rekapCols.forEach((col, cIdx) => {
      const c = wsRekap.getCell(`${col}${curRow}`);
      c.value = values[cIdx];
      c.font = {
        name: 'Segoe UI',
        size: 10,
        bold: isPeak || cIdx === 1 || cIdx === 7,
        color: isPeak && cIdx === 9 ? { argb: 'FFD97706' } : { argb: 'FF1E293B' },
      };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 1 ? 'left' : 'center',
      };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    curRow++;
  });

  // Summary Row at the bottom
  const sumDns = chartData.reduce((a, b) => a + b.dns, 0);
  const sumReserve = chartData.reduce((a, b) => a + b.reserve, 0);
  const sumIpam = chartData.reduce((a, b) => a + b.ipam, 0);
  const sumDrp = chartData.reduce((a, b) => a + b.drp, 0);
  const sumOther = chartData.reduce((a, b) => a + b.other, 0);
  const sumTotal = chartData.reduce((a, b) => a + b.total, 0);

  const totalValues = ['TOTAL', 'Semua Data', sumDns, sumReserve, sumIpam, sumDrp, sumOther, sumTotal, '100%', '-'];

  rekapCols.forEach((col, cIdx) => {
    const c = wsRekap.getCell(`${col}${curRow}`);
    c.value = totalValues[cIdx];
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.alignment = { vertical: 'middle', horizontal: cIdx === 1 ? 'left' : 'center' };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // SHEET 3: DATA TIKET DETAIL
  // ─────────────────────────────────────────────────────────────
  const wsTickets = workbook.addWorksheet('Data Tiket Detail', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });

  const detailTitle = wsTickets.getCell('B2');
  detailTitle.value = `DATA TIKET DETAIL (FILTER PERIODE: ${timeframeLabel.toUpperCase()})`;
  detailTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E293B' } };

  const detailSub = wsTickets.getCell('B3');
  detailSub.value = `Total ${tickets.length} baris tiket yang tercakup dalam periode ini`;
  detailSub.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };

  const ticketCols = [
    { key: 'A', name: '', width: 4 },
    { key: 'B', name: 'No.', width: 6 },
    { key: 'C', name: 'No. Tiket', width: 22 },
    { key: 'D', name: 'ID Sistem', width: 18 },
    { key: 'E', name: 'Antrean (Queue)', width: 18 },
    { key: 'F', name: 'Judul Tiket (Subject)', width: 45 },
    { key: 'G', name: 'Kriteria Utama', width: 20 },
    { key: 'H', name: 'Sub-Kriteria / Detail', width: 26 },
    { key: 'I', name: 'Status Tiket', width: 14 },
    { key: 'J', name: 'Prioritas', width: 12 },
    { key: 'K', name: 'Status SLA', width: 14 },
    { key: 'L', name: 'Pelapor (Requester)', width: 24 },
    { key: 'M', name: 'Email Pelapor', width: 26 },
    { key: 'N', name: 'PIC / Assignee', width: 22 },
    { key: 'O', name: 'Unit Kerja', width: 26 },
    { key: 'P', name: 'Tanggal Dibuat', width: 18 },
    { key: 'Q', name: 'Tanggal Selesai / Tutup', width: 18 },
    { key: 'R', name: 'Catatan Resolusi', width: 35 },
    { key: 'S', name: 'Tautan iCare OTRS', width: 35 },
  ];

  ticketCols.forEach(col => {
    wsTickets.getColumn(col.key).width = col.width;
  });

  // Table Headers
  ticketCols.slice(1).forEach(col => {
    const c = wsTickets.getCell(`${col.key}5`);
    c.value = col.name;
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Add autofilter
  wsTickets.autoFilter = `B5:S5`;

  let ticketRowIdx = 6;
  tickets.forEach((t, index) => {
    const queue = t.queueCode || (t.queueName ? t.queueName.split(' ')[0] : 'General');
    const rowBg = index % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

    const rowData = [
      index + 1,
      sanitizeCell(t.ticketNumber || t.id),
      sanitizeCell(t.externalId || t.id),
      sanitizeCell(queue),
      sanitizeCell(t.subject),
      sanitizeCell(t.kriteria || t.mainCategory || 'Other'),
      sanitizeCell(t.subKriteria || t.subTipe || t.technicalCategory),
      t.status,
      t.priority,
      t.slaStatus || 'SAFE',
      sanitizeCell(t.requester || t.requesterName || 'Pengguna'),
      sanitizeCell(t.requesterEmail),
      sanitizeCell(t.assigneeName || 'Petugas'),
      sanitizeCell(t.department || 'Network Operations'),
      formatDate(t.createdAt),
      formatDate(t.closedAt),
      sanitizeCell(t.resolutionNote),
      t.otrsUrl || '',
    ];

    ticketCols.slice(1).forEach((col, cIdx) => {
      const c = wsTickets.getCell(`${col.key}${ticketRowIdx}`);
      c.value = rowData[cIdx];
      c.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c.alignment = {
        vertical: 'middle',
        horizontal: (cIdx === 0 || cIdx === 6 || cIdx === 7 || cIdx === 8) ? 'center' : 'left',
        wrapText: cIdx === 3 || cIdx === 16,
      };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    ticketRowIdx++;
  });

  // ─────────────────────────────────────────────────────────────
  // WRITE FILE & DOWNLOAD
  // ─────────────────────────────────────────────────────────────
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateSuffix}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  return await saveOrShareFile({
    filename,
    blob,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

