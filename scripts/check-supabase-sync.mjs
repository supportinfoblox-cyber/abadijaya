/**
 * Script to check Supabase ticket data and diagnose sync issues
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocalPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[FATAL] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided via environment or .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== Checking Supabase tickets table ===\n');
  
  const { data, error, count } = await supabase
    .from('tickets')
    .select('id, ticket_number, external_id, subject, status, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ERROR fetching tickets:', error.message);
    console.error('Code:', error.code);
    console.error('Details:', error.details);
    return;
  }

  console.log(`Total tickets in Supabase: ${count}`);
  console.log('\nFirst 10 tickets:');
  (data || []).slice(0, 10).forEach((t, i) => {
    console.log(`  ${i+1}. [${t.ticket_number}] ${t.subject?.slice(0, 60)} (${t.status})`);
  });

  // Check for duplicate ticket_numbers
  const ticketNumbers = (data || []).map(t => t.ticket_number);
  const dupes = ticketNumbers.filter((n, i) => ticketNumbers.indexOf(n) !== i);
  if (dupes.length > 0) {
    console.log('\n⚠️  DUPLICATE ticket_numbers found:', dupes);
  } else {
    console.log('\n✅ No duplicate ticket_numbers found');
  }
  
  // Check for null/empty ticket_numbers
  const nullNumbers = (data || []).filter(t => !t.ticket_number);
  if (nullNumbers.length > 0) {
    console.log(`\n⚠️  ${nullNumbers.length} tickets with NULL/empty ticket_number:`, nullNumbers.map(t => t.id));
  }

  console.log('\n=== Checking users table ===\n');
  const { data: users, error: usersErr } = await supabase
    .from('app_users')
    .select('id, username, name, role');
  if (usersErr) {
    console.error('ERROR fetching users:', usersErr.message);
  } else {
    console.log(`Total users: ${users?.length ?? 0}`);
    users?.forEach(u => console.log(`  - ${u.username} (${u.role})`));
  }

  console.log('\n=== Checking worklogs table ===\n');
  const { count: wlCount, error: wlErr } = await supabase
    .from('worklogs')
    .select('*', { count: 'exact', head: true });
  if (wlErr) {
    console.error('ERROR fetching worklogs count:', wlErr.message);
  } else {
    console.log(`Total worklogs: ${wlCount}`);
  }
}

main().catch(console.error);
