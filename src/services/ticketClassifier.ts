import { Ticket, MainCategory, TechnicalCategory } from '@/types';

export interface TicketClassification {
  mainCategory: MainCategory;
  technicalCategory: TechnicalCategory;
  kriteria: 'IPAM' | 'Reserve IP' | 'DNS Request' | 'DRP' | 'Other';
  subTipe: string;
}

/**
 * Normalizes text by removing non-breaking spaces (\xa0, &nbsp;) and collapsing whitespace.
 */
export function normalizeTicketText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/[\s\xa0\u200b\u200c\u200d\ufeff]+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Robust classification function matching Enterprise Operations rules.
 * Handles non-breaking spaces and all known variations of ticket subjects.
 */
export function classifyTicketText(subject?: string, description?: string): TicketClassification {
  const fullText = normalizeTicketText(`${subject || ''} ${description || ''}`);

  const isDrp = ['standby', 'drp', 'onsite', 'drc', 'pendampingan', 'disaster recovery'].some(k =>
    fullText.includes(k)
  );

  const isReserveIp =
    [
      'reserve ip',
      'reserved ip',
      'reservasi ip',
      'fixed address',
      'static ip',
      'ip static',
      'permohonan ip',
      'request ip',
      'reserve_ip',
      'permohonan reserve',
      'reserved_ip',
      'reserve ip address',
      'ip address baru',
      'ip address laptop',
    ].some(k => fullText.includes(k)) &&
    !(fullText.includes('penambahan dns') && !fullText.includes('reserve'));

  // IPAM: subnet, segment, range, pool, IP allocation (Domain: Network)
  const isIpam = [
    'ipam',
    'segment',
    'subnet',
    'vlan',
    'range ip',
    'pool ip',
    'ip pool',
    'alokasi ip',
    'ip allocation',
    'reverse ip segment',
    'data segment',
  ].some(k => fullText.includes(k));

  // DNS: DNS requests, CNAME, A Record, PTR, Load Balancer / VIP, FKK
  const isDns =
    [
      'dns',
      'cname',
      'a record',
      'a-record',
      'arecord',
      'ptr',
      'reverse dns',
      'mapping ip',
      'txt record',
      'mx record',
      'subdomain',
      'fkk',
      'load balancer',
      'lb atm',
      'f5',
    ].some(k => fullText.includes(k)) ||
    (fullText.includes('reverse ip') && !isIpam);

  if (isDrp) {
    return {
      mainCategory: 'Maintenance',
      kriteria: 'DRP',
      subTipe: 'Standby Support DRP',
      technicalCategory: 'Infrastructure',
    };
  }

  if (isReserveIp) {
    const isFixed = fullText.includes('fixed address') || fullText.includes('static');
    return {
      mainCategory: 'Service Request',
      kriteria: 'Reserve IP',
      subTipe: isFixed ? 'Fixed Address / Static IP' : 'Reserve IP (Static/DHCP)',
      technicalCategory: 'DHCP',
    };
  }

  if (isIpam) {
    const isSubnet = fullText.includes('segment') || fullText.includes('subnet');
    return {
      mainCategory: 'Service Request',
      kriteria: 'IPAM',
      subTipe: isSubnet ? 'Subnet & Segment Allocation' : 'IPAM Management',
      technicalCategory: 'Network', // User requirement: IPAM in Network domain
    };
  }

  if (isDns) {
    const types: string[] = [];
    if (fullText.includes('cname')) types.push('CNAME');
    if (fullText.includes('a record') || fullText.includes('a-record') || fullText.includes('arecord') || fullText.includes('mapping ip')) types.push('A Record');
    if (fullText.includes('txt')) types.push('TXT');
    if (fullText.includes('ptr') || fullText.includes('reverse')) types.push('PTR (Reverse DNS)');
    if (fullText.includes('mx')) types.push('MX');
    if (fullText.includes('lb') || fullText.includes('load balancer') || fullText.includes('fkk')) types.push('Load Balancer / VIP');

    const subTipe = types.length > 0 ? types.join(', ') : 'A Record';
    return {
      mainCategory: 'Change Request',
      kriteria: 'DNS Request',
      subTipe,
      technicalCategory: 'DNS',
    };
  }

  // Fallback: Other
  const isMeetingOrReport = ['meeting', 'report', 'laporan', 'koordinasi', 'notulen'].some(k =>
    fullText.includes(k)
  );
  const isNetwork = ['network', 'jaringan', 'koneksi', 'switch', 'router'].some(k =>
    fullText.includes(k)
  );

  return {
    mainCategory: 'Service Request',
    kriteria: 'Other',
    subTipe: isMeetingOrReport ? 'Report & Meeting' : 'General Support',
    technicalCategory: isNetwork ? 'Network' : 'Application',
  };
}

/**
 * Detects if a string represents an elapsed time or age instead of a person name (e.g. "7 h 12 j", "38 m").
 */
export function isTimeString(s?: string): boolean {
  if (!s) return true;
  const str = s.trim();
  if (/^\d+\s*[hjdms]\b/i.test(str)) return true;
  if (/^\d+\s*(?:j|h|d|m|jam|hari|menit)/i.test(str)) return true;
  if (/\d+\s*[hjdm]\s+\d+\s*[hjdm]/i.test(str)) return true;
  return false;
}

/**
 * Cleans an engineer name, strictly filtering out any age/time strings.
 */
export function cleanAssigneeName(rawName?: string): string {
  if (!rawName || isTimeString(rawName)) return 'Unassigned';
  let name = rawName.split('/')[0].trim();
  name = name.replace(/\(.*?\)/g, '').replace(/<.*?>/g, '').replace(/["']/g, '').trim();
  name = name.replace(/\s+/g, ' ');
  if (!name || name.toLowerCase().includes('admin otrs') || isTimeString(name)) {
    return 'Unassigned';
  }
  return name;
}

/**
 * Enforces correct classification and user rules on a ticket object:
 * 1. PIC / Assignee is always a real engineer name, NEVER an elapsed time string (e.g. "7 h 12 j")
 * 2. IPAM is always domain 'Network'
 * 3. If kriteria is 'Other', re-checks subject to see if it should be Reserve IP / DNS / IPAM / DRP
 * 4. Ensures createdAt is correctly formatted in WIB (GMT+7)
 */
export function normalizeTicket(ticket: Ticket): Ticket {
  const normSubject = normalizeTicketText(ticket.subject);

  // Clean assignee name (prevent age/time strings)
  const cleanAssignee = cleanAssigneeName(ticket.assigneeName);

  // Fix old buggy 22:00:00+00:00 timestamps if present
  let cleanCreatedAt = ticket.createdAt;
  if (cleanCreatedAt && cleanCreatedAt.includes('T22:00:00')) {
    if (ticket.ticketNumber && ticket.ticketNumber.length >= 8 && /^\d{8}/.test(ticket.ticketNumber)) {
      const y = ticket.ticketNumber.substring(0, 4);
      const m = ticket.ticketNumber.substring(4, 6);
      const d = ticket.ticketNumber.substring(6, 8);
      cleanCreatedAt = `${y}-${m}-${d}T09:00:00+07:00`;
    }
  }

  // If current ticket is marked 'Other' or has missing/empty kriteria or has IPAM not in Network
  const needsReclass =
    !ticket.kriteria ||
    ticket.kriteria === 'Other' ||
    (ticket.kriteria === 'IPAM' && ticket.technicalCategory !== 'Network') ||
    normSubject.includes('reserve ip') ||
    normSubject.includes('reverse ip') ||
    normSubject.includes('segment');

  if (needsReclass) {
    const cls = classifyTicketText(ticket.subject, ticket.description);
    return {
      ...ticket,
      assigneeName: cleanAssignee,
      createdAt: cleanCreatedAt,
      updatedAt: cleanCreatedAt,
      kriteria: cls.kriteria,
      subKriteria: cls.subTipe,
      mainCategory: ticket.mainCategory && ticket.mainCategory !== 'Service Request' ? ticket.mainCategory : cls.mainCategory,
      technicalCategory: cls.kriteria === 'IPAM' ? 'Network' : cls.technicalCategory,
    };
  }

  return {
    ...ticket,
    assigneeName: cleanAssignee,
    createdAt: cleanCreatedAt,
    technicalCategory: ticket.kriteria === 'IPAM' ? 'Network' : ticket.technicalCategory,
  };
}
