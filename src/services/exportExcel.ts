import * as XLSX from 'xlsx';
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
