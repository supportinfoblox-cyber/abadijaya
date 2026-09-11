import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const rootDir = process.cwd();

function registerOtrsMiddlewares(server: any) {
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
}

function otrsBridgePlugin() {
  return {
    name: 'otrs-bridge-plugin',
    configureServer(server: any) {
      registerOtrsMiddlewares(server);
    },
    configurePreviewServer(server: any) {
      registerOtrsMiddlewares(server);
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
