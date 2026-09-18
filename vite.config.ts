import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const rootDir = process.cwd();

function registerOtrsMiddlewares(server: any) {
  server.middlewares.use('/api/otrs/login', (req: any, res: any) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
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
        res.end(output);
      });
      py.stdin.write(body);
      py.stdin.end();
    });
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

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
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

function otrsBridgePlugin() {
  return {
    name: 'otrs-bridge-plugin',
    configureServer(server: any) {
      registerOtrsMiddlewares(server);
      registerShiftMiddlewares(server);
    },
    configurePreviewServer(server: any) {
      registerOtrsMiddlewares(server);
      registerShiftMiddlewares(server);
    },
  };
}

const targetPort = Number(process.env.PORT) || 8080;

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
  },
  preview: {
    port: targetPort,
    host: true,
    allowedHosts: true,
  },
  build: {
    sourcemap: false,
  },
});
