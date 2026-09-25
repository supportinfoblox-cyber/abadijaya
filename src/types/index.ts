export type UserRole = 'admin' | 'supervisor' | 'engineer' | 'viewer';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  isActive: boolean;
  department: string;
  lastLoginAt: string;
  password?: string;
}

export type TicketStatus = 'NEW' | 'OPEN' | 'IN PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type MainCategory = 
  | 'Incident' 
  | 'Service Request' 
  | 'Problem' 
  | 'Change Request' 
  | 'Maintenance';

export type TechnicalCategory = 
  | 'DNS' 
  | 'DHCP' 
  | 'Network' 
  | 'Server' 
  | 'Security' 
  | 'Application' 
  | 'Infrastructure' 
  | 'Database';

export type SLAStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';

export interface TicketActivity {
  id: string;
  ticketId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
}

export interface Ticket {
  id: string;
  externalId: string; // e.g. OTRS-2026090322000059
  ticketNumber: string; // e.g. 2026090322000059 (iCare OTRS standard)
  subject: string;
  description: string;
  mainCategory: MainCategory;
  technicalCategory: TechnicalCategory;
  priority: TicketPriority;
  status: TicketStatus;
  kriteria?: 'IPAM' | 'Reserve IP' | 'DNS Request' | 'DRP' | string;
  subKriteria?: string;
  subTipe?: string;
  queueCode?: string;
  queueName?: string;
  requester: string;
  requesterEmail: string;
  requesterName?: string;
  department?: string;
  otrsUrl?: string;
  assigneeId?: string;
  assigneeName?: string;
  assignmentGroup: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNote?: string;
  slaHours: number;
  slaStatus: SLAStatus;
  ruleEngineSuggested?: {
    mainCategory: MainCategory;
    technicalCategory: TechnicalCategory;
    priority: TicketPriority;
    confidence: number;
    matchedKeywords: string[];
    explanation?: string;
  };
}

export interface Worklog {
  id: string;
  ticketId: string;
  ticketNumber: string;
  kriteria?: string;
  subKriteria?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  description: string;
  durationMinutes: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string; // 'STATUS_CHANGE' | 'RESOLVE' | 'CLOSE' | 'INTEGRATION_UPDATE' | 'USER_UPDATE' | 'SYNC' | 'ASSIGN'
  module: string; // 'Ticket' | 'Worklog' | 'Integration' | 'User' | 'RuleEngine'
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
}

export interface IntegrationConfig {
  providerName: string;
  portalUrl: string;
  apiUrl: string;
  authType: 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH';
  apiKeyOrToken: string;
  syncIntervalMinutes: number; // 5, 10, 15, 30, 60
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastSyncAt: string | null;
  successRecordsCount: number;
  failedRecordsCount: number;
  isAutoSyncEnabled: boolean;
  mockPortalEnabled: boolean;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  recordsCount: number;
  message: string;
  errorDetail?: string;
  durationMs: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'NEW_TICKET' | 'ASSIGNED' | 'UPDATED' | 'CLOSED' | 'SLA_WARNING' | 'SLA_CRITICAL' | 'SLA_BREACHED';
  ticketId?: string;
  createdAt: string;
  read: boolean;
}

export interface SLAPolicyConfig {
  CRITICAL: number; // hours (default 4)
  HIGH: number; // hours (default 8)
  MEDIUM: number; // hours (default 24)
  LOW: number; // hours (default 72)
}

export interface RolePermissions {
  dashboard: boolean;
  viewTicket: boolean;
  updateTicket: boolean;
  assignTicket: boolean;
  resolveTicket: boolean;
  closeTicket: boolean;
  reports: boolean;
  userManagement: boolean;
  integration: boolean;
  auditLog: boolean | 'limited';
}

export interface DeviceItem {
  id: string;
  hostname: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  ipManagement?: string;
  siteLocation: string;
  role: string;
  licenseType: string;
  licenseActiveDate: string; // YYYY-MM-DD
  licenseExpiredDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'STANDBY' | 'MAINTENANCE';
  notes?: string;
  lastUpdated: string;
}

