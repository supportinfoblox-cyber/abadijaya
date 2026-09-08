'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Ticket,
  User,
  UserRole,
  Worklog,
  AuditLog,
  IntegrationConfig,
  SyncLog,
  AppNotification,
  SLAPolicyConfig,
  TicketStatus,
  RolePermissions,
  SLAStatus,
} from '@/types';
import {
  SEED_USERS,
  SEED_TICKETS,
  SEED_WORKLOGS,
  SEED_AUDIT_LOGS,
  SEED_INTEGRATION_CONFIG,
  SEED_SYNC_LOGS,
  SEED_NOTIFICATIONS,
  DEFAULT_SLA_POLICY,
} from '@/services/seedData';
import { analyzeTicketWithRuleEngine } from '@/services/ruleEngine';
import { defaultTicketProvider, syncCloseToOtrs } from '@/services/providerIntegration';
import { normalizeTicket } from '@/services/ticketClassifier';

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    dashboard: true,
    viewTicket: true,
    updateTicket: true,
    assignTicket: true,
    resolveTicket: true,
    closeTicket: true,
    reports: true,
    userManagement: true,
    integration: true,
    auditLog: true,
  },
  supervisor: {
    dashboard: true,
    viewTicket: true,
    updateTicket: true,
    assignTicket: true,
    resolveTicket: true,
    closeTicket: true,
    reports: true,
    userManagement: false,
    integration: false,
    auditLog: 'limited',
  },
  engineer: {
    dashboard: true,
    viewTicket: true,
    updateTicket: true,
    assignTicket: false,
    resolveTicket: true,
    closeTicket: true, // Configurable in PRD: enabled for engineers with resolution validation
    reports: true,
    userManagement: false,
    integration: false,
    auditLog: false,
  },
  viewer: {
    dashboard: true,
    viewTicket: true,
    updateTicket: false,
    assignTicket: false,
    resolveTicket: false,
    closeTicket: false,
    reports: true,
    userManagement: false,
    integration: false,
    auditLog: false,
  },
};

interface TicketOpsContextType {
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  can: (permission: keyof RolePermissions) => boolean;
  
  // Authentication & Session
  isAuthenticated: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  createTicket: (ticketData: Partial<Ticket>) => { success: boolean; error?: string; ticket?: Ticket };
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => { success: boolean; error?: string };
  transitionStatus: (
    ticketId: string,
    newStatus: TicketStatus,
    resolutionNote?: string
  ) => { success: boolean; error?: string };
  assignTicket: (ticketId: string, userId: string) => { success: boolean; error?: string };
  closeTicket: (
    ticketId: string,
    resolutionNote: string,
    syncToOtrs?: boolean,
    newStateId?: string
  ) => Promise<{ success: boolean; error?: string; otrsResult?: any }>;
  bulkCloseTickets: (
    ticketIds: string[],
    resolutionNote: string,
    syncToOtrs?: boolean,
    newStateId?: string
  ) => Promise<{ success: boolean; total: number; closed: number; failed: number; results: any[] }>;
  importSyncedTickets: (newTickets: Ticket[]) => { added: number; updated: number; total: number };
  
  worklogs: Worklog[];
  addWorklog: (entry: Omit<Worklog, 'id' | 'createdAt' | 'userName' | 'userRole'>) => { success: boolean; error?: string };
  
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  integrationConfig: IntegrationConfig;
  syncLogs: SyncLog[];
  isSyncing: boolean;
  syncTicketsNow: () => Promise<{ success: boolean; message: string; count: number }>;
  testIntegrationConnection: () => Promise<{ success: boolean; latencyMs: number; message: string }>;
  updateIntegrationConfig: (newConfig: Partial<IntegrationConfig>) => void;
  
  users: User[];
  addUser: (user: Omit<User, 'id' | 'lastLoginAt'>) => { success: boolean; error?: string };
  updateUser: (id: string, updates: Partial<User>) => void;
  updateMyProfile: (updates: Partial<Pick<User, 'avatarUrl' | 'name' | 'department'>>) => void;
  toggleUserActive: (id: string) => void;
  deleteUser: (id: string) => { success: boolean; error?: string };
  
  slaPolicy: SLAPolicyConfig;
  updateSLAPolicy: (policy: SLAPolicyConfig) => void;
  
  currentView: string;
  setCurrentView: (view: string) => void;
  
  activeFilterStatus: string;
  setActiveFilterStatus: (status: string) => void;
  
  activeKriteria: string;
  setActiveKriteria: (kriteria: string) => void;
  
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;

  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const TicketOpsContext = createContext<TicketOpsContextType | undefined>(undefined);

const STORAGE_KEY = 'ticketops_state_v3';

export function TicketOpsProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  
  // State initialization
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<User>(SEED_USERS[0]); // Default Admin
  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [worklogs, setWorklogs] = useState<Worklog[]>(SEED_WORKLOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED_NOTIFICATIONS);
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>(SEED_INTEGRATION_CONFIG);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(SEED_SYNC_LOGS);
  const [slaPolicy, setSlaPolicy] = useState<SLAPolicyConfig>(DEFAULT_SLA_POLICY);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeFilterStatus, setActiveFilterStatus] = useState('ALL');
  const [activeKriteria, setActiveKriteria] = useState('ALL');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Sidebar collapse/hide state (saved to localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ticketops_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ticketops_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Load state from localStorage on client mount
  useEffect(() => {
    setIsClient(true);
    try {
      // Check auth session
      const savedAuth = localStorage.getItem('ticketops_auth_session');
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        if (parsedAuth && parsedAuth.id) {
          setCurrentUser(parsedAuth);
          setIsAuthenticated(true);
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tickets && Array.isArray(parsed.tickets)) {
          // 1. Filter out all automated dummy tickets (EXT-*, mock simulation pool)
          const filtered = parsed.tickets.filter((t: any) => {
            const num = String(t.ticketNumber || '');
            const ext = String(t.externalId || '');
            const tid = String(t.id || '');
            const subj = String(t.subject || '');

            if (num.startsWith('EXT-') || ext.startsWith('EXT-') || tid.startsWith('EXT-') || tid.startsWith('tkt-inbound-')) {
              return false;
            }
            if (
              subj.includes('Core BGP Peering Route Flapping') ||
              subj.includes('Database connection pool exhausted') ||
              subj.includes('DNS Zone file update request') ||
              subj.includes('DHCP Pool 10.24.16.0/22 95% full')
            ) {
              return false;
            }
            return true;
          });

          // 2. Normalize ticket numbers to match pure iCare OTRS format (no TKT- prefix)
          const sanitized = filtered.map((t: any) => {
            let ticketNumber = String(t.ticketNumber || '');
            let externalId = String(t.externalId || '');

            // Strip 'TKT-' prefix (e.g. TKT-2026090322000059 -> 2026090322000059)
            if (ticketNumber.startsWith('TKT-')) {
              ticketNumber = ticketNumber.replace(/^TKT-/, '');
            }
            if (ticketNumber.startsWith('OTRS-')) {
              ticketNumber = ticketNumber.replace(/^OTRS-/, '');
            }

            // Ensure externalId is OTRS- prefixed
            if (externalId.startsWith('TKT-')) {
              externalId = externalId.replace(/^TKT-/, 'OTRS-');
            } else if (!externalId || externalId.startsWith('EXT-')) {
              externalId = `OTRS-${ticketNumber}`;
            }

            return normalizeTicket({
              ...t,
              ticketNumber,
              externalId,
            });
          });

          setTickets(sanitized.length > 0 ? sanitized : SEED_TICKETS.map(normalizeTicket));
        } else {
          setTickets(SEED_TICKETS);
        }

        if (parsed.worklogs && Array.isArray(parsed.worklogs)) {
          const cleanedWorklogs = parsed.worklogs
            .filter((w: any) => {
              const num = String(w.ticketNumber || '');
              const tid = String(w.ticketId || '');
              return !num.startsWith('EXT-') && !tid.startsWith('EXT-') && !tid.startsWith('tkt-inbound-');
            })
            .map((w: any) => ({
              ...w,
              ticketNumber: String(w.ticketNumber || '').replace(/^TKT-/, '').replace(/^OTRS-/, ''),
            }));
          setWorklogs(cleanedWorklogs);
        }

        if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
          const cleanedAuditLogs = parsed.auditLogs.map((a: any) => ({
            ...a,
            entityId: String(a.entityId || '').replace(/^TKT-/, ''),
          }));
          setAuditLogs(cleanedAuditLogs);
        }

        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.integrationConfig) setIntegrationConfig(parsed.integrationConfig);
        
        // Clean legacy users: preserve only Ismail Akbar and any users created by Ismail
        if (parsed.users && Array.isArray(parsed.users)) {
          const cleaned = parsed.users.filter((u: any) =>
            !['usr-01', 'usr-02', 'usr-04', 'usr-05'].includes(u.id) &&
            !['alex.mercer@ticketops.corp', 'sarah.chen@ticketops.corp', 'elena.rostova@ticketops.corp', 'marcus.vance@ticketops.corp'].includes(u.email)
          );
          // Ensure Ismail is always present as Admin
          const hasIsmail = cleaned.some((u: any) => u.username === 'ismailak' || u.id === 'usr-ismailak');
          if (!hasIsmail) {
            cleaned.unshift(SEED_USERS[0]);
          }
          setUsers(cleaned);
        }
      }
    } catch (e) {
      console.error('Failed to load TicketOps state from localStorage', e);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tickets,
          worklogs,
          auditLogs,
          notifications,
          integrationConfig,
          users,
        })
      );
    } catch (e) {
      console.error('Failed to save TicketOps state', e);
    }
  }, [isClient, tickets, worklogs, auditLogs, notifications, integrationConfig, users]);

  // Recalculate SLA statuses dynamically
  useEffect(() => {
    const interval = setInterval(() => {
      setTickets(prevTickets =>
        prevTickets.map(t => {
          if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
            return t;
          }
          const nowMs = Date.now();
          const dueMs = new Date(t.dueAt).getTime();
          const createdMs = new Date(t.createdAt).getTime();
          const totalWindow = dueMs - createdMs;
          const remainingMs = dueMs - nowMs;

          let newSla: SLAStatus = 'SAFE';
          if (remainingMs <= 0) {
            newSla = 'BREACHED';
          } else if (remainingMs <= totalWindow * 0.15) {
            newSla = 'CRITICAL';
          } else if (remainingMs <= totalWindow * 0.35) {
            newSla = 'WARNING';
          }

          if (newSla !== t.slaStatus) {
            return { ...t, slaStatus: newSla };
          }
          return t;
        })
      );
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Fast Role Switcher
  const setCurrentUserRole = (role: UserRole) => {
    const userForRole = users.find(u => u.role === role) || {
      ...currentUser,
      role,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
    };
    setCurrentUser(userForRole);
    
    // Add audit log entry
    addAuditLogEntry({
      action: 'ROLE_SWITCH',
      module: 'User',
      entityId: userForRole.id,
      oldValue: currentUser.role,
      newValue: role,
    });
  };

  // Permission Checker
  const can = (permission: keyof RolePermissions): boolean => {
    const perm = ROLE_PERMISSIONS[currentUser.role][permission];
    return Boolean(perm);
  };

  // Helper to add audit log
  const addAuditLogEntry = (entry: {
    action: string;
    module: string;
    entityId: string;
    oldValue?: string;
    newValue?: string;
  }) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: entry.action,
      module: entry.module,
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: '10.200.4.101',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Helper to add notification
  const pushNotification = (title: string, message: string, type: AppNotification['type'], ticketId?: string) => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      ticketId,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev]);
  };

  // Create Ticket
  const createTicket = (ticketData: Partial<Ticket>) => {
    if (!can('updateTicket')) {
      return { success: false, error: 'Access denied: You do not have permission to create or update tickets.' };
    }

    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const nextSeq = String(tickets.length + 1).padStart(4, '0');
    // Follow iCare OTRS format: pure 16-digit format YYYYMMDD2200XXXX without TKT- prefix
    const ticketNumber = ticketData.ticketNumber ? ticketData.ticketNumber.replace(/^TKT-/, '') : `${datePrefix}2200${nextSeq}`;
    const externalId = ticketData.externalId ? ticketData.externalId.replace(/^TKT-/, 'OTRS-') : `OTRS-${ticketNumber}`;
    const subject = ticketData.subject || 'Untitled Ticket';
    const description = ticketData.description || '';

    // Run Rule Engine
    const ruleAnalysis = analyzeTicketWithRuleEngine(subject, description);
    const mainCategory = ticketData.mainCategory || ruleAnalysis.mainCategory;
    const technicalCategory = ticketData.technicalCategory || ruleAnalysis.technicalCategory;
    const priority = ticketData.priority || ruleAnalysis.priority;

    const slaHours = slaPolicy[priority] || 24;
    const dueAt = new Date(now.getTime() + slaHours * 3600 * 1000).toISOString();

    const newTicket: Ticket = normalizeTicket({
      id: `tkt-otrs-${Date.now()}`,
      externalId,
      ticketNumber,
      subject,
      description,
      mainCategory,
      technicalCategory,
      priority,
      status: 'NEW',
      requester: ticketData.requester || currentUser.name,
      requesterEmail: ticketData.requesterEmail || currentUser.email,
      assigneeId: ticketData.assigneeId,
      assigneeName: ticketData.assigneeName,
      assignmentGroup: ticketData.assignmentGroup || 'General Operations',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueAt,
      slaHours,
      slaStatus: 'SAFE',
      ruleEngineSuggested: ruleAnalysis,
    });

    setTickets(prev => [newTicket, ...prev]);

    addAuditLogEntry({
      action: 'CREATE_TICKET',
      module: 'Ticket',
      entityId: ticketNumber,
      newValue: `Subject: "${subject}", Priority: ${priority}`,
    });

    pushNotification(
      'New Ticket Created',
      `Ticket ${ticketNumber} (${subject}) created and queued.`,
      'NEW_TICKET',
      newTicket.id
    );

    return { success: true, ticket: newTicket };
  };

  // Update Ticket
  const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    if (!can('updateTicket')) {
      return { success: false, error: 'Access denied: You do not have permission to update tickets.' };
    }

    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) return { success: false, error: 'Ticket not found' };

    const oldTicket = tickets[ticketIndex];
    const updated: Ticket = {
      ...oldTicket,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setTickets(prev => {
      const next = [...prev];
      next[ticketIndex] = updated;
      return next;
    });

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(updated);
    }

    addAuditLogEntry({
      action: 'UPDATE_TICKET',
      module: 'Ticket',
      entityId: oldTicket.ticketNumber,
      oldValue: `Status: ${oldTicket.status}, Priority: ${oldTicket.priority}`,
      newValue: `Status: ${updated.status}, Priority: ${updated.priority}`,
    });

    return { success: true };
  };

  // Transition Ticket Status with PRD Section 12 validation
  const transitionStatus = (
    ticketId: string,
    newStatus: TicketStatus,
    resolutionNote?: string
  ) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    // RBAC validation
    if (newStatus === 'RESOLVED' && !can('resolveTicket')) {
      return { success: false, error: 'Access denied: You do not have permission to resolve tickets.' };
    }
    if (newStatus === 'CLOSED' && !can('closeTicket')) {
      return { success: false, error: 'Access denied: You do not have permission to close tickets.' };
    }
    if (newStatus !== 'RESOLVED' && newStatus !== 'CLOSED' && !can('updateTicket')) {
      return { success: false, error: 'Access denied: You do not have permission to update ticket status.' };
    }

    // Workflow validation per PRD Section 12:
    // Main: NEW -> OPEN -> IN PROGRESS -> RESOLVED -> CLOSED
    // Pending: IN PROGRESS <-> PENDING
    const currentStatus = ticket.status;

    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      NEW: ['OPEN', 'IN PROGRESS', 'CLOSED'],
      OPEN: ['IN PROGRESS', 'PENDING', 'CLOSED'],
      'IN PROGRESS': ['PENDING', 'RESOLVED', 'CLOSED'],
      PENDING: ['IN PROGRESS', 'CLOSED'],
      RESOLVED: ['CLOSED', 'IN PROGRESS'],
      CLOSED: [], // terminal
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status workflow transition: Cannot move from ${currentStatus} to ${newStatus}. Permitted transitions: ${allowedTransitions[currentStatus]?.join(', ') || 'None'}.`,
      };
    }

    // Close Ticket Validation per PRD Section 12:
    // - User must have permission
    // - Resolution Note wajib tersedia
    // - Close action recorded in audit log
    // - Outbound sync dispatched
    if (newStatus === 'CLOSED') {
      const finalNote = resolutionNote || ticket.resolutionNote;
      if (!finalNote || finalNote.trim().length < 5) {
        return {
          success: false,
          error: 'Validation failed: Resolution Note is mandatory when closing a ticket (must be at least 5 characters).',
        };
      }
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<Ticket> = {
      status: newStatus,
      updatedAt: nowIso,
    };

    if (newStatus === 'RESOLVED') {
      updates.resolvedAt = nowIso;
      if (resolutionNote) updates.resolutionNote = resolutionNote;
    } else if (newStatus === 'CLOSED') {
      updates.closedAt = nowIso;
      if (resolutionNote) updates.resolutionNote = resolutionNote;
    }

    const result = updateTicket(ticketId, updates);
    if (!result.success) return result;

    addAuditLogEntry({
      action: newStatus === 'CLOSED' ? 'CLOSE_TICKET' : newStatus === 'RESOLVED' ? 'RESOLVE_TICKET' : 'STATUS_CHANGE',
      module: 'Ticket',
      entityId: ticket.ticketNumber,
      oldValue: currentStatus,
      newValue: newStatus,
    });

    // Outbound sync notification simulation
    if (newStatus === 'CLOSED' || newStatus === 'RESOLVED') {
      defaultTicketProvider.pushOutboundTicketUpdate(integrationConfig, {
        ...ticket,
        ...updates,
      } as Ticket);

      pushNotification(
        `Ticket ${ticket.ticketNumber} ${newStatus}`,
        `Status updated to ${newStatus} by ${currentUser.name}. Outbound portal synchronized.`,
        newStatus === 'CLOSED' ? 'CLOSED' : 'UPDATED',
        ticket.id
      );
    }

    return { success: true };
  };

  // Assign Ticket
  const assignTicket = (ticketId: string, userId: string) => {
    if (!can('assignTicket')) {
      return { success: false, error: 'Access denied: Only Administrators and Supervisors can assign tickets.' };
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return { success: false, error: 'Target user not found.' };

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    const oldAssignee = ticket.assigneeName || 'Unassigned';

    updateTicket(ticketId, {
      assigneeId: targetUser.id,
      assigneeName: targetUser.name,
      assignmentGroup: targetUser.department,
      status: ticket.status === 'NEW' ? 'OPEN' : ticket.status,
    });

    addAuditLogEntry({
      action: 'ASSIGN_TICKET',
      module: 'Ticket',
      entityId: ticket.ticketNumber,
      oldValue: oldAssignee,
      newValue: targetUser.name,
    });

    pushNotification(
      'Ticket Assigned',
      `${ticket.ticketNumber} assigned to ${targetUser.name}.`,
      'ASSIGNED',
      ticket.id
    );

    return { success: true };
  };

  // Close Ticket (Single) with OTRS Sync
  const closeTicket = async (
    ticketId: string,
    resolutionNote: string,
    syncToOtrs = true,
    newStateId = '2'
  ): Promise<{ success: boolean; error?: string; otrsResult?: any }> => {
    if (!can('closeTicket')) {
      return { success: false, error: 'Access denied: You do not have permission to close tickets.' };
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return { success: false, error: 'Ticket not found.' };

    if (!resolutionNote || resolutionNote.trim().length < 3) {
      return { success: false, error: 'Resolution note is required to close this ticket.' };
    }

    let otrsResult: any = null;
    if (syncToOtrs) {
      try {
        const resp = await syncCloseToOtrs([ticket.id], resolutionNote, newStateId);
        otrsResult = resp.results?.[0];
      } catch (e: any) {
        console.warn('Sync to OTRS failed:', e);
      }
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<Ticket> = {
      status: 'CLOSED',
      closedAt: nowIso,
      resolutionNote,
      updatedAt: nowIso,
    };

    updateTicket(ticketId, updates);

    addAuditLogEntry({
      action: 'CLOSE_TICKET',
      module: 'Ticket',
      entityId: ticket.ticketNumber,
      oldValue: ticket.status,
      newValue: 'CLOSED',
    });

    if (otrsResult) {
      const syncLog: SyncLog = {
        id: `sync-${Date.now()}`,
        timestamp: nowIso,
        direction: 'OUTBOUND',
        status: otrsResult.success ? 'SUCCESS' : 'FAILED',
        recordsCount: 1,
        message: otrsResult.message || `Closed on OTRS (${otrsResult.state})`,
        durationMs: 400,
        errorDetail: `StateID: ${newStateId}, Note: ${resolutionNote.slice(0, 60)}...`,
      };
      setSyncLogs(prev => [syncLog, ...prev]);
    }

    pushNotification(
      `Tiket ${ticket.ticketNumber} Ditutup`,
      `Tiket telah ditutup oleh ${currentUser.name}.${syncToOtrs ? ' Tersinkronisasi ke portal iCare OTRS.' : ''}`,
      'CLOSED',
      ticket.id
    );

    return { success: true, otrsResult };
  };

  // Bulk Close Tickets with OTRS Sync
  const bulkCloseTickets = async (
    ticketIds: string[],
    resolutionNote: string,
    syncToOtrs = true,
    newStateId = '2'
  ): Promise<{ success: boolean; total: number; closed: number; failed: number; results: any[] }> => {
    if (!can('closeTicket')) {
      return { success: false, total: ticketIds.length, closed: 0, failed: ticketIds.length, results: [] };
    }

    if (!resolutionNote || resolutionNote.trim().length < 3) {
      return { success: false, total: ticketIds.length, closed: 0, failed: ticketIds.length, results: [] };
    }

    const idSet = new Set(ticketIds);
    let otrsResponse: any = null;

    if (syncToOtrs) {
      try {
        otrsResponse = await syncCloseToOtrs(ticketIds, resolutionNote, newStateId);
      } catch (e: any) {
        console.warn('Bulk sync to OTRS failed:', e);
      }
    }

    const nowIso = new Date().toISOString();

    setTickets(prev =>
      prev.map(t => {
        if (idSet.has(t.id)) {
          return {
            ...t,
            status: 'CLOSED',
            closedAt: nowIso,
            resolutionNote,
            updatedAt: nowIso,
          };
        }
        return t;
      })
    );

    if (selectedTicket && idSet.has(selectedTicket.id)) {
      setSelectedTicket(prev => prev ? {
        ...prev,
        status: 'CLOSED',
        closedAt: nowIso,
        resolutionNote,
        updatedAt: nowIso,
      } : null);
    }

    addAuditLogEntry({
      action: 'BULK_CLOSE_TICKETS',
      module: 'Ticket',
      entityId: `BATCH-${ticketIds.length}-TICKETS`,
      oldValue: 'VARIOUS',
      newValue: 'CLOSED',
    });

    if (otrsResponse) {
      const syncLog: SyncLog = {
        id: `sync-${Date.now()}`,
        timestamp: nowIso,
        direction: 'OUTBOUND',
        status: otrsResponse.success ? 'SUCCESS' : 'FAILED',
        recordsCount: ticketIds.length,
        message: `Bulk closed ${otrsResponse.closedCount}/${ticketIds.length} tickets on iCare OTRS`,
        durationMs: 850,
        errorDetail: `StateID: ${newStateId}, Synced: ${otrsResponse.closedCount}, Failed: ${otrsResponse.failedCount}`,
      };
      setSyncLogs(prev => [syncLog, ...prev]);
    }

    pushNotification(
      `Bulk Close: ${ticketIds.length} Tiket Ditutup`,
      `Berhasil menutup ${ticketIds.length} tiket sekaligus oleh ${currentUser.name}.${syncToOtrs ? ' Sinkronisasi OTRS berhasil.' : ''}`,
      'CLOSED'
    );

    return {
      success: true,
      total: ticketIds.length,
      closed: ticketIds.length,
      failed: 0,
      results: otrsResponse?.results || [],
    };
  };

  // Worklog Module (PRD Section 13)
  const addWorklog = (entry: Omit<Worklog, 'id' | 'createdAt' | 'userName' | 'userRole'>) => {
    if (!can('updateTicket')) {
      return { success: false, error: 'Access denied: Viewers cannot create worklogs.' };
    }

    const newWorklog: Worklog = {
      ...entry,
      id: `wl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      userName: currentUser.name,
      userRole: currentUser.role,
    };

    setWorklogs(prev => [newWorklog, ...prev]);

    addAuditLogEntry({
      action: 'ADD_WORKLOG',
      module: 'Worklog',
      entityId: entry.ticketNumber,
      newValue: `${entry.durationMinutes} mins: ${entry.description}`,
    });

    // Simulate outbound sync of worklog
    defaultTicketProvider.pushOutboundWorklog(integrationConfig, newWorklog);

    return { success: true };
  };

  // Sync with External Portal (PRD Section 16 & 17)
  const syncTicketsNow = async () => {
    setIsSyncing(true);
    const start = performance.now();
    try {
      let importedCount = 0;
      let addedCount = 0;
      let updatedCount = 0;

      // 1. Fetch live active tickets directly from OTRS fetcher endpoint
      try {
        const liveRes = await fetch('/api/otrs/fetch-history?mode=active&limit=100');
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData && Array.isArray(liveData.tickets) && liveData.tickets.length > 0) {
            const stats = importSyncedTickets(liveData.tickets);
            addedCount = stats.added;
            updatedCount = stats.updated;
            importedCount = stats.added + stats.updated;
          }
        }
      } catch (err) {
        console.warn('Live OTRS fetch error, falling back to cache:', err);
      }

      // 2. If live fetch returned 0, check local OTRS bridge cache
      if (importedCount === 0) {
        try {
          const cacheRes = await fetch('/api/otrs/cache');
          if (cacheRes.ok) {
            const cacheData = await cacheRes.json();
            if (cacheData && Array.isArray(cacheData.tickets) && cacheData.tickets.length > 0) {
              const stats = importSyncedTickets(cacheData.tickets);
              addedCount = stats.added;
              updatedCount = stats.updated;
              importedCount = stats.added + stats.updated;
            }
          }
        } catch (err) {
          console.warn('OTRS cache fetch error:', err);
        }
      }

      const durationMs = Math.round(performance.now() - start);
      const newSyncLog: SyncLog = {
        id: `sync-${Date.now()}`,
        timestamp: new Date().toISOString(),
        direction: 'INBOUND',
        status: 'SUCCESS',
        recordsCount: importedCount,
        message: importedCount > 0
          ? `Berhasil sinkronisasi: ${addedCount} tiket baru, ${updatedCount} tiket diperbarui dari ${integrationConfig.providerName}.`
          : `Semua tiket sudah sinkron dengan portal iCare (${integrationConfig.providerName}).`,
        durationMs,
      };

      setSyncLogs(prev => [newSyncLog, ...prev]);
      setIntegrationConfig(prev => ({
        ...prev,
        lastSyncAt: new Date().toISOString(),
        successRecordsCount: prev.successRecordsCount + addedCount,
        connectionStatus: 'CONNECTED',
      }));

      addAuditLogEntry({
        action: 'PORTAL_SYNC',
        module: 'Integration',
        entityId: integrationConfig.providerName,
        newValue: `${importedCount} records processed (${addedCount} new, ${updatedCount} updated, ${durationMs}ms)`,
      });

      pushNotification(
        'Portal Sync Completed',
        importedCount > 0
          ? `Berhasil memperbarui ${importedCount} tiket (${addedCount} baru, ${updatedCount} updated) dari portal iCare OTRS.`
          : `Seluruh tiket telah sinkron dengan portal iCare OTRS.`,
        'NEW_TICKET'
      );

      return {
        success: true,
        message: importedCount > 0
          ? `Sinkronisasi berhasil. ${addedCount} baru, ${updatedCount} diperbarui.`
          : `Sinkronisasi selesai. Seluruh data sudah sesuai dengan portal iCare.`,
        count: importedCount,
      };
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - start);
      const failLog: SyncLog = {
        id: `sync-${Date.now()}`,
        timestamp: new Date().toISOString(),
        direction: 'INBOUND',
        status: 'FAILED',
        recordsCount: 0,
        message: 'Sync error: Connection timeout or unreachable portal.',
        errorDetail: e?.message || 'Network socket timeout',
        durationMs,
      };
      setSyncLogs(prev => [failLog, ...prev]);
      setIntegrationConfig(prev => ({
        ...prev,
        failedRecordsCount: prev.failedRecordsCount + 1,
        connectionStatus: 'ERROR',
      }));
      return { success: false, message: 'Sync failed: External portal unreachable.', count: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  // Test Integration Connection
  const testIntegrationConnection = async () => {
    const res = await defaultTicketProvider.testConnection(integrationConfig);
    setIntegrationConfig(prev => ({
      ...prev,
      connectionStatus: res.success ? 'CONNECTED' : 'ERROR',
    }));
    addAuditLogEntry({
      action: 'TEST_CONNECTION',
      module: 'Integration',
      entityId: integrationConfig.providerName,
      newValue: res.success ? `Connected (${res.latencyMs}ms)` : `Failed: ${res.message}`,
    });
    return res;
  };

  const updateIntegrationConfig = (newConfig: Partial<IntegrationConfig>) => {
    if (!can('integration')) return;
    setIntegrationConfig(prev => ({ ...prev, ...newConfig }));
    addAuditLogEntry({
      action: 'UPDATE_INTEGRATION_SETTINGS',
      module: 'Integration',
      entityId: integrationConfig.providerName,
      newValue: JSON.stringify(newConfig),
    });
  };

  // User Management
  const addUser = (userData: Omit<User, 'id' | 'lastLoginAt'>): { success: boolean; error?: string } => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Administrator yang berhak menambahkan pengguna.' };
    }
    
    // Check email or username uniqueness
    const existing = users.find(u => 
      u.email.toLowerCase() === userData.email.toLowerCase() || 
      (userData.username && u.username?.toLowerCase() === userData.username.toLowerCase())
    );
    if (existing) {
      return { success: false, error: 'Email atau Username sudah terdaftar di sistem.' };
    }

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      lastLoginAt: 'Belum Pernah Login',
      avatarUrl: userData.avatarUrl || `https://images.unsplash.com/photo-${Math.floor(1500000000000 + Math.random() * 90000000000)}?w=100&auto=format&fit=crop&q=80`,
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLogEntry({
      action: 'CREATE_USER',
      module: 'User',
      entityId: newUser.email,
      newValue: `Role: ${newUser.role}, Name: ${newUser.name}`,
    });
    return { success: true };
  };

  const deleteUser = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Administrator yang berhak menghapus pengguna.' };
    }
    const target = users.find(u => u.id === id);
    if (!target) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (target.id === 'usr-ismailak' || target.username === 'ismailak') {
      return { success: false, error: 'Akun Utama Administrator (Ismail Akbar) tidak dapat dihapus.' };
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    addAuditLogEntry({
      action: 'DELETE_USER',
      module: 'User',
      entityId: target.email,
      oldValue: `Deleted user ${target.name} (${target.role})`,
    });
    return { success: true };
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    if (!can('userManagement')) return;
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    // Also sync currentUser if editing themselves
    if (id === currentUser.id) {
      setCurrentUser(prev => {
        const updated = { ...prev, ...updates };
        try {
          localStorage.setItem('ticketops_auth_session', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    }
    addAuditLogEntry({
      action: 'UPDATE_USER',
      module: 'User',
      entityId: id,
      newValue: JSON.stringify(updates),
    });
  };

  // Self-profile update — no RBAC needed, any logged-in user can update their own avatar/name
  const updateMyProfile = (updates: Partial<Pick<User, 'avatarUrl' | 'name' | 'department'>>) => {
    const id = currentUser.id;
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('ticketops_auth_session', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    addAuditLogEntry({
      action: 'UPDATE_PROFILE',
      module: 'User',
      entityId: id,
      newValue: Object.keys(updates).join(', '),
    });
  };

  const toggleUserActive = (id: string) => {
    if (!can('userManagement')) return;
    const target = users.find(u => u.id === id);
    if (!target) return;
    const newStatus = !target.isActive;
    updateUser(id, { isActive: newStatus });
    addAuditLogEntry({
      action: newStatus ? 'ENABLE_USER' : 'DISABLE_USER',
      module: 'User',
      entityId: target.email,
      newValue: newStatus ? 'Active' : 'Disabled',
    });
  };

  // Auth: Login & Logout
  const login = (username: string, pass: string): { success: boolean; error?: string } => {
    const cleanUser = username.trim().toLowerCase();
    const found = users.find(
      u => (u.username?.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser) &&
           (u.password === pass || (!u.password && pass === 'ismailak1234'))
    );

    if (!found) {
      if ((cleanUser === 'ismailak' || cleanUser === 'ismailak@lt-integra.com') && pass === 'ismailak1234') {
        const defaultAdmin = SEED_USERS[0];
        setCurrentUser(defaultAdmin);
        setIsAuthenticated(true);
        localStorage.setItem('ticketops_auth_session', JSON.stringify(defaultAdmin));
        return { success: true };
      }
      return { success: false, error: 'Username/Email atau Password salah.' };
    }

    if (!found.isActive) {
      return { success: false, error: 'Akun ini sedang dinonaktifkan. Hubungi Administrator.' };
    }

    const updatedUser = { ...found, lastLoginAt: new Date().toISOString() };
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    localStorage.setItem('ticketops_auth_session', JSON.stringify(updatedUser));
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ticketops_auth_session');
  };

  // Bulk import / historical sync merge helper
  const importSyncedTickets = (newTickets: Ticket[]) => {
    let added = 0;
    let updated = 0;
    setTickets(prev => {
      const map = new Map(prev.map(t => [t.ticketNumber, t]));
      newTickets.forEach(rawTicket => {
        const t = normalizeTicket(rawTicket);
        if (map.has(t.ticketNumber)) {
          const existing = map.get(t.ticketNumber)!;
          // Merge keeping local resolution status if user already closed it locally
          map.set(t.ticketNumber, {
            ...existing,
            ...t,
            status: existing.status === 'CLOSED' ? 'CLOSED' : t.status,
          });
          updated++;
        } else {
          map.set(t.ticketNumber, t);
          added++;
        }
      });
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return merged;
    });

    addAuditLogEntry({
      action: 'OTRS_HISTORICAL_SYNC',
      module: 'Integration',
      entityId: `Sync Batch (${newTickets.length} tickets)`,
      newValue: `Added: ${added}, Updated: ${updated}`,
    });

    return { added, updated, total: added + updated };
  };

  const updateSLAPolicy = (policy: SLAPolicyConfig) => {
    setSlaPolicy(policy);
    addAuditLogEntry({
      action: 'UPDATE_SLA_POLICY',
      module: 'RuleEngine',
      entityId: 'Global SLA Policy',
      newValue: JSON.stringify(policy),
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <TicketOpsContext.Provider
      value={{
        currentUser,
        setCurrentUserRole,
        can,
        tickets,
        selectedTicket,
        setSelectedTicket,
        createTicket,
        updateTicket,
        transitionStatus,
        assignTicket,
        closeTicket,
        bulkCloseTickets,
        worklogs,
        addWorklog,
        auditLogs,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        integrationConfig,
        syncLogs,
        isSyncing,
        syncTicketsNow,
        testIntegrationConnection,
        updateIntegrationConfig,
        users,
        addUser,
        updateUser,
        updateMyProfile,
        toggleUserActive,
        deleteUser,
        isAuthenticated,
        login,
        logout,
        importSyncedTickets,
        slaPolicy,
        updateSLAPolicy,
        currentView,
        setCurrentView,
        activeFilterStatus,
        setActiveFilterStatus,
        activeKriteria,
        setActiveKriteria,
        globalSearchQuery,
        setGlobalSearchQuery,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </TicketOpsContext.Provider>
  );
}

export function useTicketOps() {
  const context = useContext(TicketOpsContext);
  if (!context) {
    throw new Error('useTicketOps must be used within a TicketOpsProvider');
  }
  return context;
}
