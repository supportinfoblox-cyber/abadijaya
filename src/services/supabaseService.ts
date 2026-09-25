/**
 * Supabase Data Service
 * Handles all CRUD operations to Supabase cloud database.
 * Replaces localStorage persistence in TicketOpsContext.
 */

import { supabase } from '@/lib/supabase';
import type {
  Ticket,
  Worklog,
  AuditLog,
  AppNotification,
  User,
  DeviceItem,
} from '@/types';

// ─────────────────────────────────────────────
// Type mappers: DB row <-> App type
// ─────────────────────────────────────────────

function rowToDevice(row: any): DeviceItem {
  return {
    id: row.id,
    hostname: row.hostname,
    model: row.model,
    serialNumber: row.serial_number ?? '',
    ipAddress: row.ip_address ?? '',
    ipManagement: row.ip_management ?? undefined,
    siteLocation: row.site_location ?? '',
    role: row.role ?? 'Member',
    licenseType: row.license_type ?? '',
    licenseActiveDate: row.license_active_date ?? '',
    licenseExpiredDate: row.license_expired_date ?? '',
    status: (row.status as DeviceItem['status']) || 'ACTIVE',
    notes: row.notes ?? undefined,
    lastUpdated: row.last_updated ?? row.updated_at ?? new Date().toISOString().substring(0, 16).replace('T', ' '),
  };
}

function deviceToRow(d: DeviceItem): Record<string, any> {
  return {
    id: d.id,
    hostname: d.hostname,
    model: d.model,
    serial_number: d.serialNumber ?? null,
    ip_address: d.ipAddress ?? null,
    ip_management: d.ipManagement ?? null,
    site_location: d.siteLocation ?? null,
    role: d.role ?? null,
    license_type: d.licenseType ?? null,
    license_active_date: d.licenseActiveDate ?? null,
    license_expired_date: d.licenseExpiredDate ?? null,
    status: d.status ?? 'ACTIVE',
    notes: d.notes ?? null,
    last_updated: d.lastUpdated ?? new Date().toISOString().substring(0, 16).replace('T', ' '),
    updated_at: new Date().toISOString(),
  };
}

function rowToTicket(row: any): Ticket {
  return {
    id: row.id,
    externalId: row.external_id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    description: row.description ?? '',
    mainCategory: row.main_category,
    technicalCategory: row.technical_category,
    priority: row.priority,
    status: row.status,
    kriteria: row.kriteria ?? undefined,
    subKriteria: row.sub_kriteria ?? undefined,
    subTipe: row.sub_tipe ?? undefined,
    queueCode: row.queue_code ?? undefined,
    queueName: row.queue_name ?? undefined,
    requester: row.requester,
    requesterEmail: row.requester_email,
    requesterName: row.requester_name ?? undefined,
    department: row.department ?? undefined,
    otrsUrl: row.otrs_url ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    assigneeName: row.assignee_name ?? undefined,
    assignmentGroup: row.assignment_group,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    slaHours: row.sla_hours,
    slaStatus: row.sla_status,
    ruleEngineSuggested: row.rule_engine_suggested ?? undefined,
  };
}

function ticketToRow(t: Ticket): Record<string, any> {
  return {
    id: t.id,
    external_id: t.externalId,
    ticket_number: t.ticketNumber,
    subject: t.subject,
    description: t.description ?? '',
    main_category: t.mainCategory,
    technical_category: t.technicalCategory,
    priority: t.priority,
    status: t.status,
    kriteria: t.kriteria ?? null,
    sub_kriteria: t.subKriteria ?? null,
    sub_tipe: t.subTipe ?? null,
    queue_code: t.queueCode ?? null,
    queue_name: t.queueName ?? null,
    requester: t.requester,
    requester_email: t.requesterEmail,
    requester_name: t.requesterName ?? null,
    department: t.department ?? null,
    otrs_url: t.otrsUrl ?? null,
    assignee_id: t.assigneeId ?? null,
    assignee_name: t.assigneeName ?? null,
    assignment_group: t.assignmentGroup,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    due_at: t.dueAt,
    resolved_at: t.resolvedAt ?? null,
    closed_at: t.closedAt ?? null,
    resolution_note: t.resolutionNote ?? null,
    sla_hours: t.slaHours,
    sla_status: t.slaStatus,
    rule_engine_suggested: t.ruleEngineSuggested ?? null,
  };
}

function rowToWorklog(row: any): Worklog {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    kriteria: row.kriteria ?? undefined,
    subKriteria: row.sub_kriteria ?? undefined,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    description: row.description,
    durationMinutes: row.duration_minutes,
    createdAt: row.created_at,
  };
}

function worklogToRow(w: Worklog): Record<string, any> {
  return {
    id: w.id,
    ticket_id: w.ticketId,
    ticket_number: w.ticketNumber,
    kriteria: w.kriteria ?? null,
    sub_kriteria: w.subKriteria ?? null,
    user_id: w.userId,
    user_name: w.userName,
    user_role: w.userRole,
    date: w.date,
    start_time: w.startTime,
    end_time: w.endTime,
    description: w.description,
    duration_minutes: w.durationMinutes,
    created_at: w.createdAt,
  };
}

function rowToAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    action: row.action,
    module: row.module,
    entityId: row.entity_id,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    ipAddress: row.ip_address ?? '',
  };
}

function auditLogToRow(a: AuditLog): Record<string, any> {
  return {
    id: a.id,
    timestamp: a.timestamp,
    user_id: a.userId,
    user_name: a.userName,
    role: a.role,
    action: a.action,
    module: a.module,
    entity_id: a.entityId,
    old_value: a.oldValue ?? null,
    new_value: a.newValue ?? null,
    ip_address: a.ipAddress ?? null,
  };
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? undefined,
    email: row.email,
    avatarUrl: row.avatar_url ?? '',
    role: row.role,
    isActive: row.is_active,
    department: row.department,
    lastLoginAt: row.last_login_at ?? '',
    password: row.password ?? undefined,
  };
}

function userToRow(u: User): Record<string, any> {
  return {
    id: u.id,
    name: u.name,
    username: u.username ?? null,
    email: u.email,
    avatar_url: u.avatarUrl ?? null,
    role: u.role,
    is_active: u.isActive,
    department: u.department,
    last_login_at: u.lastLoginAt ?? null,
    password: u.password ?? null,
  };
}

function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    ticketId: row.ticket_id ?? undefined,
    createdAt: row.created_at,
    read: row.read,
  };
}

function notificationToRow(n: AppNotification): Record<string, any> {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    ticket_id: n.ticketId ?? null,
    created_at: n.createdAt,
    read: n.read,
  };
}

// ─────────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────────

export async function fetchTickets(): Promise<Ticket[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] fetchTickets error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToTicket);
}

export async function upsertTicket(ticket: Ticket): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('tickets')
    .upsert(ticketToRow(ticket), { onConflict: 'ticket_number' });
  if (error) console.error('[Supabase] upsertTicket error:', error.message);
}

export async function upsertTickets(tickets: Ticket[]): Promise<void> {
  if (!supabase || tickets.length === 0) return;
  const { error } = await supabase
    .from('tickets')
    .upsert(tickets.map(ticketToRow), { onConflict: 'ticket_number' });
  if (error) console.error('[Supabase] upsertTickets error:', error.message);
}


// ─────────────────────────────────────────────
// WORKLOGS
// ─────────────────────────────────────────────

export async function fetchWorklogs(): Promise<Worklog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('worklogs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] fetchWorklogs error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToWorklog);
}

export async function insertWorklog(worklog: Worklog): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('worklogs')
    .upsert(worklogToRow(worklog), { onConflict: 'id' });
  if (error) console.error('[Supabase] insertWorklog error:', error.message);
}

export async function upsertWorklogs(worklogs: Worklog[]): Promise<void> {
  if (!supabase || worklogs.length === 0) return;
  const { error } = await supabase
    .from('worklogs')
    .upsert(worklogs.map(worklogToRow), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertWorklogs error:', error.message);
}

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(500);
  if (error) {
    console.error('[Supabase] fetchAuditLogs error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToAuditLog);
}

export async function insertAuditLog(log: AuditLog): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('audit_logs')
    .insert(auditLogToRow(log));
  if (error) console.error('[Supabase] insertAuditLog error:', error.message);
}

export async function upsertAuditLogs(logs: AuditLog[]): Promise<void> {
  if (!supabase || logs.length === 0) return;
  const { error } = await supabase
    .from('audit_logs')
    .upsert(logs.map(auditLogToRow), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertAuditLogs error:', error.message);
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export async function fetchUsers(): Promise<User[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('app_users')
    .select('id, name, username, email, avatar_url, role, is_active, department, last_login_at');
  if (error) {
    console.error('[Supabase] fetchUsers error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToUser);
}

export async function fetchUserForAuth(usernameOrEmail: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
    .maybeSingle();
  if (error || !data) return null;
  return rowToUser(data);
}

export async function upsertUser(user: User): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('app_users')
    .upsert(userToRow(user), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertUser error:', error.message);
}

export async function upsertUsers(users: User[]): Promise<void> {
  if (!supabase || users.length === 0) return;
  const { error } = await supabase
    .from('app_users')
    .upsert(users.map(userToRow), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertUsers error:', error.message);
}

export async function deleteUserById(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('app_users')
    .delete()
    .eq('id', id);
  if (error) console.error('[Supabase] deleteUser error:', error.message);
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[Supabase] fetchNotifications error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToNotification);
}

export async function insertNotification(notif: AppNotification): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .upsert(notificationToRow(notif), { onConflict: 'id' });
  if (error) console.error('[Supabase] insertNotification error:', error.message);
}

export async function upsertNotifications(notifs: AppNotification[]): Promise<void> {
  if (!supabase || notifs.length === 0) return;
  const { error } = await supabase
    .from('notifications')
    .upsert(notifs.map(notificationToRow), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertNotifications error:', error.message);
}

export async function markNotificationReadInDB(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) console.error('[Supabase] markNotificationRead error:', error.message);
}

export async function markAllNotificationsReadInDB(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);
  if (error) console.error('[Supabase] markAllNotificationsRead error:', error.message);
}

export async function deleteAllNotificationsFromDB(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .delete()
    .neq('id', '');
  if (error) console.error('[Supabase] deleteAllNotifications error:', error.message);
}

// ─────────────────────────────────────────────
// CHECK: Apakah DB sudah ada data (untuk migrasi pertama)
// ─────────────────────────────────────────────
export async function isDbEmpty(): Promise<boolean> {
  if (!supabase) return true;
  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });
  if (error) return true;
  return (count ?? 0) === 0;
}

// ─────────────────────────────────────────────
// DEVICES (MANAGE SERVICES)
// ─────────────────────────────────────────────

export async function fetchDevices(): Promise<DeviceItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] fetchDevices error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToDevice);
}

export async function upsertDevice(device: DeviceItem): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('devices')
    .upsert(deviceToRow(device), { onConflict: 'id' });
  if (error) {
    console.error('[Supabase] upsertDevice error:', error.message);
    return false;
  }
  return true;
}

export async function upsertDevices(devices: DeviceItem[]): Promise<boolean> {
  if (!supabase || devices.length === 0) return true;
  const { error } = await supabase
    .from('devices')
    .upsert(devices.map(deviceToRow), { onConflict: 'id' });
  if (error) {
    console.error('[Supabase] upsertDevices error:', error.message);
    return false;
  }
  return true;
}

export async function deleteDeviceById(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[Supabase] deleteDeviceById error:', error.message);
    return false;
  }
  return true;
}

export function subscribeToDevices(onChange: () => void) {
  if (!supabase) return null;
  try {
    return supabase
      .channel('public:devices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          onChange();
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('[Supabase Realtime] Devices subscribe failed or unsupported:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// REALTIME SUBSCRIPTIONS
// ─────────────────────────────────────────────
export function subscribeToTickets(
  onUpdate: (ticket: Ticket) => void,
  onInsert: (ticket: Ticket) => void
) {
  if (!supabase) return null;
  try {
    return supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.new) {
            onUpdate(rowToTicket(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.new) {
            onInsert(rowToTicket(payload.new));
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('[Supabase Realtime] Subscribe failed or unsupported in this environment:', err);
    return null;
  }
}


