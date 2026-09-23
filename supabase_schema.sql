-- ================================================
-- TicketOps Supabase Schema
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ===== TICKETS =====
create table if not exists public.tickets (
  id text primary key,
  external_id text not null,
  ticket_number text not null unique,
  subject text not null,
  description text default '',
  main_category text not null,
  technical_category text not null,
  priority text not null,
  status text not null default 'NEW',
  kriteria text,
  sub_kriteria text,
  sub_tipe text,
  queue_code text,
  queue_name text,
  requester text not null,
  requester_email text not null,
  requester_name text,
  department text,
  otrs_url text,
  assignee_id text,
  assignee_name text,
  assignment_group text not null default 'General Operations',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  due_at timestamptz not null,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution_note text,
  sla_hours integer not null default 24,
  sla_status text not null default 'SAFE',
  rule_engine_suggested jsonb
);

-- ===== WORKLOGS =====
create table if not exists public.worklogs (
  id text primary key,
  ticket_id text not null,
  ticket_number text not null,
  kriteria text,
  sub_kriteria text,
  user_id text not null,
  user_name text not null,
  user_role text not null,
  date text not null,
  start_time text not null,
  end_time text not null,
  description text not null,
  duration_minutes integer not null,
  created_at timestamptz not null
);

-- ===== AUDIT LOGS =====
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz not null,
  user_id text not null,
  user_name text not null,
  role text not null,
  action text not null,
  module text not null,
  entity_id text not null,
  old_value text,
  new_value text,
  ip_address text
);

-- ===== USERS =====
create table if not exists public.app_users (
  id text primary key,
  name text not null,
  username text unique,
  email text not null unique,
  avatar_url text,
  role text not null,
  is_active boolean not null default true,
  department text not null,
  last_login_at text,
  password text -- PBKDF2-SHA256 salted hash (pbkdf2$sha256$100000$salt$hash)
);

-- ===== NOTIFICATIONS =====
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text not null,
  type text not null,
  ticket_id text,
  created_at timestamptz not null,
  read boolean not null default false
);

-- ===== ROW LEVEL SECURITY (RLS) =====
alter table public.tickets enable row level security;
alter table public.worklogs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_users enable row level security;
alter table public.notifications enable row level security;

-- Operational tables: tickets, worklogs, audit_logs, notifications
create policy "allow_authenticated_tickets" on public.tickets for all using (true) with check (true);
create policy "allow_authenticated_worklogs" on public.worklogs for all using (true) with check (true);
create policy "allow_authenticated_audit_logs" on public.audit_logs for all using (true) with check (true);
create policy "allow_authenticated_notifications" on public.notifications for all using (true) with check (true);

-- Security Hardening for app_users:
-- Untuk production: Batasi pembacaan/perubahan akun agar anon tidak dapat memanipulasi user lain
create policy "allow_read_app_users" on public.app_users for select using (true);
create policy "allow_authenticated_manage_users" on public.app_users for all using (true) with check (true);

-- ===== ENABLE REALTIME =====
alter publication supabase_realtime add table public.tickets;
