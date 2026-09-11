import { Ticket, Worklog, User } from '@/types';

export interface FullBackupPayload {
  version: string;
  system: string;
  exportedAt: string;
  metadata: {
    totalTickets: number;
    totalWorklogs: number;
    totalUsers: number;
    totalAuditLogs: number;
    exportedBy?: string;
  };
  tickets: Ticket[];
  worklogs?: Worklog[];
  auditLogs?: any[];
  notifications?: any[];
  integrationConfig?: any;
  users?: User[];
}

/**
 * Trigger file download directly in browser
 */
function downloadJsonFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export filtered or selected tickets to clean JSON format
 */
export function exportTicketsToJson(tickets: Ticket[], filenamePrefix: string = 'tiket_icare_bsi'): void {
  if (!tickets || tickets.length === 0) {
    alert('Tidak ada tiket yang dapat diexport ke JSON.');
    return;
  }

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${filenamePrefix}_${dateSuffix}.json`;

  const payload = {
    system: 'TicketOps BSI Infoblox & iCare OTRS',
    version: '1.0',
    exportedAt: now.toISOString(),
    totalCount: tickets.length,
    tickets: tickets.map(t => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      externalId: t.externalId,
      queueCode: t.queueCode || (t.queueName ? t.queueName.split(' ')[0] : 'OP0899'),
      queueName: t.queueName,
      subject: t.subject,
      description: t.description,
      kriteria: t.kriteria || t.mainCategory,
      subKriteria: t.subKriteria || t.subTipe || t.technicalCategory,
      mainCategory: t.mainCategory,
      technicalCategory: t.technicalCategory,
      status: t.status,
      priority: t.priority,
      slaStatus: t.slaStatus,
      slaHours: t.slaHours,
      requester: t.requester || t.requesterName,
      requesterEmail: t.requesterEmail,
      assigneeName: t.assigneeName,
      department: t.department,
      createdAt: t.createdAt,
      closedAt: t.closedAt || null,
      resolvedAt: t.resolvedAt || null,
      resolutionNote: t.resolutionNote || null,
      otrsUrl: t.otrsUrl || `https://icare.lt-integra.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=${t.id.replace('tkt-otrs-', '')}`,
    })),
  };

  downloadJsonFile(JSON.stringify(payload, null, 2), filename);
}

/**
 * Export full system snapshot (tickets, worklogs, audits, config, users)
 */
export function exportFullSystemBackup(data: {
  tickets: Ticket[];
  worklogs?: Worklog[];
  auditLogs?: any[];
  notifications?: any[];
  integrationConfig?: any;
  users?: User[];
  currentUser?: User | null;
}): void {
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const filename = `ticketops_full_backup_${dateSuffix}.json`;

  const payload: FullBackupPayload = {
    version: '1.0.0',
    system: 'TicketOps BSI Infoblox & iCare OTRS Management System',
    exportedAt: now.toISOString(),
    metadata: {
      totalTickets: data.tickets?.length || 0,
      totalWorklogs: data.worklogs?.length || 0,
      totalUsers: data.users?.length || 0,
      totalAuditLogs: data.auditLogs?.length || 0,
      exportedBy: data.currentUser?.name || 'Administrator',
    },
    tickets: data.tickets || [],
    worklogs: data.worklogs || [],
    auditLogs: data.auditLogs || [],
    notifications: data.notifications || [],
    integrationConfig: data.integrationConfig || {},
    users: data.users || [],
  };

  downloadJsonFile(JSON.stringify(payload, null, 2), filename);
}

/**
 * Validates and parses uploaded JSON backup file
 */
export function validateAndParseBackupJson(jsonString: string): {
  isValid: boolean;
  error?: string;
  data?: FullBackupPayload;
  summary?: {
    ticketCount: number;
    worklogCount: number;
    userCount: number;
    exportedAt?: string;
    system?: string;
  };
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'File tidak berisi objek JSON yang valid.' };
    }

    // Support both full backup format and tickets-only array/object format
    let tickets: Ticket[] = [];
    let worklogs: Worklog[] = [];
    let auditLogs: any[] = [];
    let notifications: any[] = [];
    let integrationConfig: any = {};
    let users: User[] = [];
    let exportedAt = parsed.exportedAt || new Date().toISOString();
    let system = parsed.system || 'TicketOps';

    if (Array.isArray(parsed)) {
      // Direct array of tickets
      tickets = parsed;
    } else if (Array.isArray(parsed.tickets)) {
      // Standard TicketOps structure
      tickets = parsed.tickets;
      worklogs = Array.isArray(parsed.worklogs) ? parsed.worklogs : [];
      auditLogs = Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [];
      notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
      integrationConfig = parsed.integrationConfig || {};
      users = Array.isArray(parsed.users) ? parsed.users : [];
    } else {
      return {
        isValid: false,
        error: 'Struktur file JSON tidak dikenali. File harus memiliki properti "tickets" berupa array tiket.',
      };
    }

    if (tickets.length === 0) {
      return {
        isValid: false,
        error: 'File JSON tidak memiliki data tiket yang dapat dipulihkan.',
      };
    }

    // Check basic ticket fields in first few records
    const sample = tickets[0];
    if (!sample.id && !sample.ticketNumber && !sample.subject) {
      return {
        isValid: false,
        error: 'Data tiket di dalam JSON tidak memiliki atribut standar (id / ticketNumber / subject).',
      };
    }

    const backupPayload: FullBackupPayload = {
      version: parsed.version || '1.0.0',
      system,
      exportedAt,
      metadata: {
        totalTickets: tickets.length,
        totalWorklogs: worklogs.length,
        totalUsers: users.length,
        totalAuditLogs: auditLogs.length,
        exportedBy: parsed.metadata?.exportedBy,
      },
      tickets,
      worklogs,
      auditLogs,
      notifications,
      integrationConfig,
      users,
    };

    return {
      isValid: true,
      data: backupPayload,
      summary: {
        ticketCount: tickets.length,
        worklogCount: worklogs.length,
        userCount: users.length,
        exportedAt,
        system,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Gagal membaca file JSON: ${err.message || 'Format JSON rusak'}`,
    };
  }
}
