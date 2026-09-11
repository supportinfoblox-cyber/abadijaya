import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://swetbrajtwfworcvgssh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZXRicmFqdHdmd29yY3Znc3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4Njc3MjksImV4cCI6MjEwNDQ0MzcyOX0.LpW33pYy1RMJKLdZHCvz-a-4_1MqnOIZez-92E3gKTA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function runFetcher(args) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [
      path.resolve(__dirname, 'otrs_history_fetcher.py'),
      ...args,
      '--save-cache'
    ], { cwd: rootDir });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Fetcher exited with code ${code}: ${stderr}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Failed to parse fetcher JSON: ${e.message}. Raw output: ${stdout}`));
      }
    });

    py.on('error', (err) => {
      reject(err);
    });
  });
}

function ticketToRow(t) {
  let ticketNumber = String(t.ticketNumber || '');
  if (ticketNumber.startsWith('TKT-')) ticketNumber = ticketNumber.replace(/^TKT-/, '');
  if (ticketNumber.startsWith('OTRS-')) ticketNumber = ticketNumber.replace(/^OTRS-/, '');

  let externalId = String(t.externalId || '');
  if (!externalId.startsWith('OTRS-')) externalId = `OTRS-${ticketNumber}`;

  return {
    id: t.id || `tkt-${ticketNumber}`,
    external_id: externalId,
    ticket_number: ticketNumber,
    subject: t.subject || 'No Subject',
    description: t.description || '',
    main_category: t.mainCategory || 'Service Request',
    technical_category: t.technicalCategory || 'DNS',
    priority: t.priority || 'MEDIUM',
    status: t.status || 'NEW',
    kriteria: t.kriteria || null,
    sub_kriteria: t.subKriteria || null,
    sub_tipe: t.subTipe || null,
    queue_code: t.queueCode || 'OP0899',
    queue_name: t.queueName || 'OP0899 - BSI DNS & DHCP Infoblox',
    requester: t.requester || 'User',
    requester_email: t.requesterEmail || 'support@lt-integra.com',
    requester_name: t.requesterName || t.requester || null,
    department: t.department || 'Infoblox Operations',
    otrs_url: t.otrsUrl || null,
    assignee_id: t.assigneeId || 'usr-ismailak',
    assignee_name: t.assigneeName || 'Ismail Akbar',
    assignment_group: t.assignmentGroup || 'Infoblox Operations',
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: t.updatedAt || new Date().toISOString(),
    due_at: t.dueAt || new Date(Date.now() + 24 * 3600000).toISOString(),
    resolved_at: t.resolvedAt || null,
    closed_at: t.closedAt || null,
    resolution_note: t.resolutionNote || null,
    sla_hours: t.slaHours || 24,
    sla_status: t.slaStatus || 'SAFE',
    rule_engine_suggested: t.ruleEngineSuggested || null,
  };
}

async function runSyncOnce() {
  const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(`\n[${timestamp}] 🚀 Starting iCare OTRS -> Supabase Synchronization...`);

  // 1. Fetch active tickets from iCare (Queue 72 OP0899 & Queue 121 OP0968)
  console.log('📡 Fetching active tickets from iCare OTRS...');
  let activeData;
  try {
    activeData = await runFetcher(['--mode', 'active']);
    console.log(`   Fetched ${activeData.tickets?.length || 0} active tickets.`);
  } catch (err) {
    console.error('❌ Active fetch error:', err.message);
    activeData = { tickets: [] };
  }

  const allFetched = activeData.tickets || [];
  const ticketMap = new Map();
  for (const t of allFetched) {
    if (t.ticketNumber) {
      ticketMap.set(t.ticketNumber, t);
    }
  }

  const uniqueTickets = Array.from(ticketMap.values());
  console.log(`📊 Total unique tickets to sync: ${uniqueTickets.length}`);

  if (uniqueTickets.length === 0) {
    console.log('ℹ️  No active tickets found in queue.');
    return { newCount: 0, updatedCount: 0 };
  }

  // Convert to DB rows
  const rows = uniqueTickets.map(ticketToRow);

  // Check which ones are already in Supabase
  const numbers = rows.map(r => r.ticket_number);
  const { data: existing, error: fetchErr } = await supabase
    .from('tickets')
    .select('ticket_number, status, updated_at')
    .in('ticket_number', numbers);

  if (fetchErr) {
    console.error('❌ Error checking existing tickets in Supabase:', fetchErr.message);
  }

  const existingMap = new Map((existing || []).map(e => [e.ticket_number, e]));
  let newCount = 0;
  let updatedCount = 0;

  for (const r of rows) {
    if (existingMap.has(r.ticket_number)) {
      const ex = existingMap.get(r.ticket_number);
      // Preserve CLOSED status so incoming iCare active fetch doesn't revert user-closed tickets
      if (ex.status === 'CLOSED') {
        r.status = 'CLOSED';
        r.closed_at = ex.closed_at || new Date().toISOString();
        r.resolution_note = ex.resolution_note || r.resolution_note;
      }
      updatedCount++;
    } else {
      newCount++;
    }
  }

  console.log(`   -> ${newCount} new tickets to insert, ${updatedCount} existing tickets to update/verify.`);

  // Upsert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error: upsertErr } = await supabase
      .from('tickets')
      .upsert(batch, { onConflict: 'ticket_number' });

    if (upsertErr) {
      console.error(`❌ Batch ${i / batchSize + 1} upsert error:`, upsertErr.message);
    } else {
      console.log(`   ✅ Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} tickets)`);
    }
  }

  // Audit log entry
  if (newCount > 0 || updatedCount > 0) {
    try {
      await supabase.from('audit_logs').insert({
        id: `audit-sync-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_id: 'usr-ismailak',
        user_name: 'Ismail Akbar',
        action: 'PORTAL_SYNC',
        module: 'Integration',
        entity_id: 'iCare OTRS Bridge',
        new_value: `Synchronized ${rows.length} tickets: ${newCount} new tickets, ${updatedCount} updated`,
      });
    } catch (err) {
      console.warn('Audit log insert note:', err.message);
    }
  }

  // Notification entry
  if (newCount > 0) {
    try {
      await supabase.from('notifications').insert({
        id: `notif-sync-${Date.now()}`,
        title: 'Tiket Baru Terintegrasi iCare',
        message: `Sinkronisasi berhasil: ${newCount} tiket baru masuk ke dalam sistem dari antrean OP0899 & OP0968.`,
        type: 'NEW_TICKET',
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Notification insert note:', err.message);
    }
  }

  const { count: finalCount } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
  console.log(`🎉 Sync completed! Total tickets in Supabase: ${finalCount}`);
  return { newCount, updatedCount, totalCount: finalCount };
}

async function main() {
  const isDaemon = process.argv.includes('--daemon') || process.argv.includes('-d');
  const intervalIdx = process.argv.findIndex(a => a === '--interval' || a === '-i');
  let intervalSec = 300; // Default 5 minutes
  if (intervalIdx !== -1 && process.argv[intervalIdx + 1]) {
    const parsed = parseInt(process.argv[intervalIdx + 1], 10);
    if (!isNaN(parsed) && parsed >= 30) intervalSec = parsed;
  }

  if (!isDaemon) {
    await runSyncOnce();
    return;
  }

  console.log(`========================================================`);
  console.log(`🔄 iCare OTRS Background Sync Daemon Started`);
  console.log(`⏱️  Sync Interval: every ${intervalSec} seconds (${Math.round(intervalSec / 60)} minutes)`);
  console.log(`========================================================`);

  // Run immediately on start
  await runSyncOnce().catch(err => console.error('Initial sync error:', err.message));

  let isRunning = false;
  const timer = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await runSyncOnce();
    } catch (err) {
      console.error('Scheduled sync error:', err.message);
    } finally {
      isRunning = false;
    }
  }, intervalSec * 1000);

  const shutdown = () => {
    console.log('\n🛑 Shutting down iCare Sync Daemon...');
    clearInterval(timer);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});

