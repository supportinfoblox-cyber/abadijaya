import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const rootDir = process.cwd();

function validateCsrfAndOrigin(req: any, res: any): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }

  const originHeader = req.headers.origin || req.headers.referer;
  if (!originHeader) {
    const fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'CSRF Protection: Cross-site request rejected.' }));
      return false;
    }
    return true;
  }

  const hostHeader = req.headers.host;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  try {
    const parsedOrigin = new URL(originHeader);
    const originHost = parsedOrigin.host;
    const isLocalhost = originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1');
    const isCurrentHost = hostHeader && originHost === hostHeader;
    const isExplicitAllowed = allowed.some((a: string) => {
      try { return new URL(a).host === originHost; } catch { return false; }
    });

    if (!isLocalhost && !isCurrentHost && !isExplicitAllowed) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden: Cross-origin request rejected.' }));
      return false;
    }
  } catch {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden: Invalid request origin.' }));
    return false;
  }

  return true;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.ceil((existing.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

function validateLoginPayload(body: string): { valid: boolean; data?: { username: string; password: string }; error?: string } {
  if (!body || body.length > 4096) {
    return { valid: false, error: 'Request body kosong atau melebihi batas ukuran (4KB).' };
  }
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Format JSON tidak valid.' };
    }
    const username = typeof parsed.username === 'string' ? parsed.username.trim() : '';
    const password = typeof parsed.password === 'string' ? parsed.password : '';
    if (!username || username.length > 100) {
      return { valid: false, error: 'Username wajib diisi dan maksimal 100 karakter.' };
    }
    if (!password || password.length > 128) {
      return { valid: false, error: 'Password wajib diisi dan maksimal 128 karakter.' };
    }
    return { valid: true, data: { username, password } };
  } catch (err: any) {
    return { valid: false, error: 'Malformed JSON payload: ' + err.message };
  }
}

function validateClosePayload(body: string): { valid: boolean; data?: { ticketIds: (string | number)[]; note: string; stateId: string }; error?: string } {
  if (!body || body.length > 65536) {
    return { valid: false, error: 'Request body kosong atau melebihi batas ukuran (64KB).' };
  }
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Format JSON tidak valid.' };
    }
    if (!Array.isArray(parsed.ticketIds) || parsed.ticketIds.length === 0 || parsed.ticketIds.length > 500) {
      return { valid: false, error: 'ticketIds harus berupa array dengan 1 hingga 500 tiket.' };
    }
    const note = typeof parsed.note === 'string' ? parsed.note.slice(0, 2000) : '';
    const stateId = typeof parsed.stateId === 'string' ? parsed.stateId.slice(0, 10) : '2';
    return { valid: true, data: { ticketIds: parsed.ticketIds, note, stateId } };
  } catch (err: any) {
    return { valid: false, error: 'Malformed JSON payload: ' + err.message };
  }
}

function registerOtrsMiddlewares(server: any) {
  server.middlewares.use('/api/otrs/login', (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!validateCsrfAndOrigin(req, res)) return;

    // Rate Limiting: max 10 requests per minute per IP for auth endpoint (PRD S-09)
    const ip = getClientIp(req);
    const rl = checkRateLimit(`login:${ip}`, 10, 60000);
    if (!rl.allowed) {
      res.statusCode = 429;
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: `Too Many Requests: Percobaan login terlampaui. Silakan tunggu ${rl.retryAfterSec} detik sebelum mencoba kembali.`
      }));
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      // Input Validation (PRD S-10)
      const val = validateLoginPayload(body);
      if (!val.valid) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: val.error }));
        return;
      }

      const py = spawn('python3', [path.resolve(rootDir, 'scripts/otrs_login_bridge.py'), '--json-stdin']);
      let output = '';
      let errOutput = '';
      py.stdout.on('data', (chunk: any) => { output += chunk.toString(); });
      py.stderr.on('data', (chunk: any) => { errOutput += chunk.toString(); });
      py.on('close', () => {
        res.setHeader('Content-Type', 'application/json');
        if (!output) {
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, error: errOutput || 'Autentikasi gagal atau server iCare tidak merespons.' }));
          return;
        }

        try {
          const parsed = JSON.parse(output);
          if (parsed && parsed.success) {
            const isProd = process.env.NODE_ENV === 'production';
            res.setHeader('Set-Cookie', 'ticketops_auth=1; Path=/; HttpOnly; SameSite=Lax' + (isProd ? '; Secure' : ''));
          }
        } catch {
          // ignore parse error
        }

        res.end(output);
      });
      py.stdin.write(body);
      py.stdin.end();
    });
  });

  server.middlewares.use('/api/otrs/logout', (req: any, res: any) => {
    res.setHeader('Set-Cookie', 'ticketops_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  });

  server.middlewares.use('/api/otrs/session', (req: any, res: any) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    const py = spawn('python3', [path.resolve(rootDir, 'scripts/otrs_close_bridge.py'), '--check-session']);
    let output = '';
    py.stdout.on('data', (chunk: any) => { output += chunk.toString(); });
    py.stderr.on('data', (chunk: any) => { console.error('OTRS Error:', chunk.toString()); });
    py.on('close', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(output || JSON.stringify({ success: false, error: 'Empty bridge response' }));
    });
  });

  server.middlewares.use('/api/otrs/close', (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!validateCsrfAndOrigin(req, res)) return;

    // Server-side role check: viewer role cannot close tickets
    const userRole = (req.headers['x-user-role'] || '').toLowerCase();
    if (userRole === 'viewer') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Akses Ditolak: Role Viewer tidak memiliki hak menutup tiket.' }));
      return;
    }

    // Rate Limiting on batch close: max 30 requests per minute per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`close:${ip}`, 30, 60000);
    if (!rl.allowed) {
      res.statusCode = 429;
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: `Too Many Requests: Batas frekuensi eksekusi penutupan tiket terlampaui. Tunggu ${rl.retryAfterSec} detik.`
      }));
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      // Input Validation (PRD S-10)
      const val = validateClosePayload(body);
      if (!val.valid) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: val.error }));
        return;
      }

      const py = spawn('python3', [path.resolve(rootDir, 'scripts/otrs_close_bridge.py'), '--json-stdin']);
      let output = '';
      let errOutput = '';
      py.stdout.on('data', (chunk: any) => { output += chunk.toString(); });
      py.stderr.on('data', (chunk: any) => { errOutput += chunk.toString(); });
      py.on('close', (code: number) => {
        res.setHeader('Content-Type', 'application/json');
        if (code !== 0 && !output) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: errOutput || `Process exited with code ${code}` }));
          return;
        }
        res.end(output);
      });
      py.stdin.write(body);
      py.stdin.end();
    });
  });

  server.middlewares.use('/api/otrs/cache', (req: any, res: any) => {
    const cachePath = path.resolve(rootDir, 'scripts/otrs_tickets_cache.json');
    res.setHeader('Content-Type', 'application/json');
    if (fs.existsSync(cachePath)) {
      const content = fs.readFileSync(cachePath, 'utf-8');
      res.end(content);
    } else {
      res.end(JSON.stringify({ success: false, tickets: [], totalFetched: 0 }));
    }
  });

  server.middlewares.use('/api/otrs/fetch-history', (req: any, res: any) => {
    const urlObj = new URL(req.url, 'http://localhost');
    const mode = urlObj.searchParams.get('mode') || 'historical';
    const limit = urlObj.searchParams.get('limit') || '250';
    const timeRange = urlObj.searchParams.get('timeRange') || urlObj.searchParams.get('range') || '1-year';

    const py = spawn('python3', [
      path.resolve(rootDir, 'scripts/otrs_history_fetcher.py'),
      '--mode', mode,
      '--limit', limit,
      '--time-range', timeRange,
      '--save-cache'
    ]);

    let output = '';
    let errOutput = '';
    py.stdout.on('data', (chunk: any) => { output += chunk.toString(); });
    py.stderr.on('data', (chunk: any) => { errOutput += chunk.toString(); });
    py.on('close', (code: number) => {
      res.setHeader('Content-Type', 'application/json');
      if (code !== 0 && !output) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: errOutput || `Process exited with code ${code}` }));
        return;
      }
      res.end(output);
    });
  });

  server.middlewares.use('/api/icare/daily-report', (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!validateCsrfAndOrigin(req, res)) return;

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      try {
        const payload = JSON.parse(body || '{}');
        const formData = new URLSearchParams();
        formData.append('opnumber', payload.opnumber || '');
        formData.append('sitename', payload.sitename || '');
        formData.append('epm', payload.epm || '');
        formData.append('asgdate1', payload.asgdate1 || '');
        formData.append('asgdate2', payload.asgdate2 || '');
        if (Array.isArray(payload.asgproject)) {
          payload.asgproject.forEach((p: string) => formData.append('asgproject[]', p));
        }
        if (payload.actdeploy) formData.append('actdeploy', payload.actdeploy);
        if (Array.isArray(payload.asgjob)) {
          payload.asgjob.forEach((j: string) => formData.append('asgjob[]', j));
        }
        formData.append('actstatus', payload.actstatus || '1');
        formData.append('techissue', payload.techissue || 'NO');
        formData.append('troubleticket', payload.troubleticket || '');
        formData.append('summary', payload.summary || '');
        formData.append('session', payload.session || '');

        const postData = formData.toString();
        const py = spawn('curl', [
          '-s', '-k', '-L',
          '-X', 'POST',
          'https://icare.lt-integra.com/daily_report/input.php',
          '-H', 'Content-Type: application/x-www-form-urlencoded',
          '--data', postData,
        ]);

        let output = '';
        py.stdout.on('data', (chunk: any) => { output += chunk.toString(); });
        py.on('close', (code: number) => {
          res.end(JSON.stringify({ success: true, message: 'Daily report posted to iCare', code, receivedLength: output.length }));
        });
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  });
}

const SHIFT_DATA_DIR = path.resolve(rootDir, 'data');
const SHIFT_ROSTER_FILE = path.resolve(SHIFT_DATA_DIR, 'shift_roster.json');

function getDefaultShiftRoster() {
  return {
    mode: 'SHIFT',
    shifts: [
      {
        id: 'shift-1',
        name: 'Shift 1 (Pagi)',
        shortName: 'S1',
        startTime: '07.00',
        endTime: '15.00',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
      },
      {
        id: 'shift-2',
        name: 'Shift 2 (Sore/Malam)',
        shortName: 'S2',
        startTime: '14.00',
        endTime: '22.00',
        color: '#6366f1',
        bgColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.35)',
      },
      {
        id: 'shift-ns',
        name: 'Non-Shift (Office Hours)',
        shortName: 'Office',
        startTime: '08.30',
        endTime: '17.30',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
      },
      {
        id: 'shift-off',
        name: 'Hari Libur',
        shortName: 'Off',
        startTime: '-',
        endTime: '-',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
      },
    ],
    workdays: [1, 2, 3, 4, 5], // Senin - Jumat (5 hari kerja)
    engineers: [
      { id: 'usr-team-1', name: 'Djomy / Sonda', username: 'djomy_sonda', role: 'Regu 1' },
      { id: 'usr-team-2', name: 'Wisnu / Ismail', username: 'wisnu_ismail', role: 'Regu 2' },
    ],
    baseWeekMonday: '2026-02-02',
    baseAssignments: {
      'usr-team-1': 'shift-2',
      'usr-team-2': 'shift-1',
    },
    holidays: {
      '2026-04-03': 'Wafat Isa Almasih (Jumat Agung)',
    },
    overrides: {},
    lastUpdatedAt: new Date().toISOString(),
  };
}

function registerShiftMiddlewares(server: any) {
  if (!fs.existsSync(SHIFT_DATA_DIR)) {
    fs.mkdirSync(SHIFT_DATA_DIR, { recursive: true });
  }

  server.middlewares.use('/api/shift/roster', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
      try {
        if (fs.existsSync(SHIFT_ROSTER_FILE)) {
          const content = fs.readFileSync(SHIFT_ROSTER_FILE, 'utf-8');
          if (content && content.trim().length > 0) {
            try {
              JSON.parse(content);
              res.end(content);
              return;
            } catch {
              // Corrupted JSON, rewrite default below
            }
          }
        }
        const defaultData = getDefaultShiftRoster();
        fs.writeFileSync(SHIFT_ROSTER_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
        res.end(JSON.stringify(defaultData));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (req.method === 'POST') {
      if (!validateCsrfAndOrigin(req, res)) return;

      const userRole = (req.headers['x-user-role'] || '').toLowerCase();
      if (userRole === 'viewer') {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Akses Ditolak: Role Viewer tidak memiliki hak mengubah data shift.' }));
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          parsed.lastUpdatedAt = new Date().toISOString();
          fs.writeFileSync(SHIFT_ROSTER_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          res.end(JSON.stringify({ success: true, data: parsed }));
        } catch (err: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  });
}

function registerSecurityHeaders(server: any) {
  server.middlewares.use((req: any, res: any, next: any) => {
    // S-13 Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://icare.lt-integra.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
    );

    // S-15 CORS Whitelist Handling
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      try {
        const parsedOrigin = new URL(origin);
        const isLocal = parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname === '127.0.0.1';
        if (isLocal || allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Role');
        }
      } catch {
        // Invalid origin URL
      }
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  });
}

function otrsBridgePlugin() {
  return {
    name: 'otrs-bridge-plugin',
    configureServer(server: any) {
      registerSecurityHeaders(server);
      registerOtrsMiddlewares(server);
      registerShiftMiddlewares(server);
    },
    configurePreviewServer(server: any) {
      registerSecurityHeaders(server);
      registerOtrsMiddlewares(server);
      registerShiftMiddlewares(server);
    },
  };
}

const targetPort = Number(process.env.PORT) || 8080;

const commonSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), otrsBridgePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: true,
    allowedHosts: true,
    headers: commonSecurityHeaders,
  },
  preview: {
    port: targetPort,
    host: true,
    allowedHosts: true,
    headers: commonSecurityHeaders,
  },
  build: {
    sourcemap: false,
  },
});
