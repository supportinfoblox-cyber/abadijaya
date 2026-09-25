import { Ticket } from '@/types';
import { saveOrShareFile } from './exportExcel';

/**
 * Clean & Formatted CSV Exporter for TicketOps
 * Prepends UTF-8 BOM (\uFEFF) to guarantee seamless formatting in Microsoft Excel
 */
export async function exportTicketsToCsv(tickets: Ticket[], filenamePrefix: string = 'tiket_export'): Promise<boolean> {
  if (!tickets || tickets.length === 0) {
    alert('Tidak ada tiket yang dapat diexport.');
    return false;
  }

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ').trim();
    // Neutralize spreadsheet formula injection (CWE-1236 / Data exfiltration)
    if (/^[=+@\-\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str}"`;
  };

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

  // CSV Headers
  const headers = [
    'No. Tiket',
    'ID Sistem',
    'Antrean (OP)',
    'Judul Tiket (Subject)',
    'Kriteria Utama',
    'Sub-Kriteria / Detail Tipe',
    'Status Tiket',
    'Prioritas',
    'Pelapor (Requester)',
    'Email Pelapor',
    'PIC / Assignee',
    'Unit Kerja',
    'Tanggal Dibuat',
    'Tanggal Selesai / Ditutup',
    'Catatan Resolusi',
    'Tautan Portal',
  ];

  const rows: string[] = [headers.map(h => `"${h}"`).join(',')];

  tickets.forEach(t => {
    const queue = t.queueCode || (t.queueName ? t.queueName.split(' ')[0] : 'General');
    const row = [
      escapeCsv(t.ticketNumber || t.id),
      escapeCsv(t.externalId || t.id),
      escapeCsv(queue),
      escapeCsv(t.subject),
      escapeCsv(t.kriteria || t.mainCategory),
      escapeCsv(t.subKriteria || t.subTipe || t.technicalCategory),
      escapeCsv(t.status),
      escapeCsv(t.priority),
      escapeCsv(t.requester || t.requesterName || 'Pengguna'),
      escapeCsv(t.requesterEmail || '-'),
      escapeCsv(t.assigneeName || 'Petugas'),
      escapeCsv(t.department || 'Network Operations'),
      escapeCsv(formatDate(t.createdAt)),
      escapeCsv(formatDate(t.closedAt)),
      escapeCsv(t.resolutionNote || '-'),
      escapeCsv(t.otrsUrl || ''),
    ];
    rows.push(row.join(','));
  });

  // UTF-8 BOM (\uFEFF) ensures Excel displays Indonesian characters cleanly
  const csvString = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateSuffix}.csv`;

  return await saveOrShareFile({
    filename,
    blob,
    mimeType: 'text/csv;charset=utf-8;',
  });
}

