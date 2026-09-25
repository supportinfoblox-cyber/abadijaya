import { Ticket, User, Worklog, AuditLog, IntegrationConfig, SyncLog, AppNotification, SLAPolicyConfig } from '@/types';

export const SEED_USERS: User[] = [
  {
    id: 'usr-admin',
    name: 'Administrator',
    username: 'admin',
    email: 'admin@system.local',
    avatarUrl: '',
    role: 'admin',
    isActive: true,
    department: 'Operations',
    lastLoginAt: '2026-09-01T00:00:00Z',
  },
];

export const SEED_TICKETS: Ticket[] = [];

export const SEED_WORKLOGS: Worklog[] = [];

export const SEED_AUDIT_LOGS: AuditLog[] = [];

export const SEED_INTEGRATION_CONFIG: IntegrationConfig = {
  providerName: 'Ticket Portal Integration',
  portalUrl: '',
  apiUrl: '',
  authType: 'BASIC_AUTH',
  apiKeyOrToken: '',
  syncIntervalMinutes: 15,
  connectionStatus: 'DISCONNECTED',
  lastSyncAt: new Date().toISOString(),
  successRecordsCount: 0,
  failedRecordsCount: 0,
  isAutoSyncEnabled: false,
  mockPortalEnabled: false,
};

export const SEED_SYNC_LOGS: SyncLog[] = [];

export const SEED_NOTIFICATIONS: AppNotification[] = [];

export const DEFAULT_SLA_POLICY: SLAPolicyConfig = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};
