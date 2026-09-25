/**
 * router.ts - Native HTML5 History API Routing (Ponytail Architecture Pattern)
 * 
 * Memenuhi aturan Ponytail Rung 4:
 * Menggunakan fitur native platform web (HTML5 History API) tanpa bloating library eksternal.
 * Memberikan isolasi halaman menu terpisah dengan URL unik, tombol Back/Forward browser,
 * dan sinkronisasi judul halaman (document.title).
 */

export interface RouteConfig {
  id: string;
  path: string;
  title: string;
  aliases?: string[];
}

export const APP_ROUTES: RouteConfig[] = [
  { id: 'dashboard', path: '/dashboard', title: 'Dashboard - TicketOps', aliases: ['/', '/index.html'] },
  { id: 'tickets', path: '/tickets', title: 'Ticket Management - TicketOps' },
  { id: 'shift-schedule', path: '/shift-schedule', title: 'Jadwal Shift Kerja - TicketOps' },
  { id: 'pm-schedule', path: '/pm-schedule', title: 'Preventive Maintenance - TicketOps' },
  { id: 'icare-attendance', path: '/attendance', title: 'Absen iCare - TicketOps', aliases: ['/icare-attendance'] },
  { id: 'ms-devices', path: '/devices', title: 'Daftar Perangkat - TicketOps', aliases: ['/ms-devices'] },
  { id: 'worklog', path: '/worklog', title: 'Worklog Operasional - TicketOps' },
  { id: 'sla', path: '/sla', title: 'SLA Monitoring - TicketOps' },
  { id: 'reports', path: '/reports', title: 'Reports & Analytics - TicketOps' },
  { id: 'notifications', path: '/notifications', title: 'Notifikasi Sistem - TicketOps' },
  { id: 'users', path: '/users', title: 'User Management - TicketOps' },
  { id: 'integration', path: '/integration', title: 'Portal Integration - TicketOps' },
  { id: 'audit', path: '/audit', title: 'Audit Log - TicketOps' },
  { id: 'settings', path: '/settings', title: 'System Settings - TicketOps' },
];

/**
 * Dapatkan View ID dari pathname URL browser saat ini
 */
export function getViewFromPathname(pathname: string): string {
  const cleanPath = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  
  for (const route of APP_ROUTES) {
    if (route.path === cleanPath) return route.id;
    if (route.aliases && route.aliases.includes(cleanPath)) return route.id;
  }

  return 'dashboard';
}

/**
 * Dapatkan URL Path dari View ID
 */
export function getPathFromView(viewId: string): string {
  const route = APP_ROUTES.find(r => r.id === viewId);
  return route ? route.path : '/dashboard';
}

/**
 * Dapatkan Judul Dokumen dari View ID
 */
export function getTitleFromView(viewId: string): string {
  const route = APP_ROUTES.find(r => r.id === viewId);
  return route ? route.title : 'TicketOps - NOC & Incident Management';
}

/**
 * Navigasi ke view dengan memperbarui URL di address bar dan document.title
 */
export function pushRoute(viewId: string, replace = false): void {
  if (typeof window === 'undefined') return;

  const targetPath = getPathFromView(viewId);
  const targetTitle = getTitleFromView(viewId);

  // Update browser document title
  document.title = targetTitle;

  // Hanya push jika URL saat ini berbeda
  if (window.location.pathname !== targetPath) {
    if (replace) {
      window.history.replaceState({ viewId }, targetTitle, targetPath);
    } else {
      window.history.pushState({ viewId }, targetTitle, targetPath);
    }
  }
}
