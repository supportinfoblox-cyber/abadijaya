/**
 * Script to check Supabase ticket data and diagnose sync issues
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://swetbrajtwfworcvgssh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZXRicmFqdHdmd29yY3Znc3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4Njc3MjksImV4cCI6MjEwNDQ0MzcyOX0.LpW33pYy1RMJKLdZHCvz-a-4_1MqnOIZez-92E3gKTA';

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
