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

-- ===== DEVICES (MANAGE SERVICES) =====
create table if not exists public.devices (
  id text primary key,
  hostname text not null,
  model text not null,
  serial_number text,
  ip_address text,
  ip_management text,
  site_location text,
  role text,
  license_type text,
  license_active_date text,
  license_expired_date text,
  status text not null default 'ACTIVE',
  notes text,
  last_updated text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== ROW LEVEL SECURITY (RLS) =====
alter table public.tickets enable row level security;
alter table public.worklogs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_users enable row level security;
alter table public.notifications enable row level security;
alter table public.devices enable row level security;

-- Operational tables: tickets, worklogs, audit_logs, notifications, devices (Idempotent)
drop policy if exists "allow_authenticated_tickets" on public.tickets;
create policy "allow_authenticated_tickets" on public.tickets for all using (true) with check (true);

drop policy if exists "allow_authenticated_worklogs" on public.worklogs;
create policy "allow_authenticated_worklogs" on public.worklogs for all using (true) with check (true);

drop policy if exists "allow_authenticated_audit_logs" on public.audit_logs;
create policy "allow_authenticated_audit_logs" on public.audit_logs for all using (true) with check (true);

drop policy if exists "allow_authenticated_notifications" on public.notifications;
create policy "allow_authenticated_notifications" on public.notifications for all using (true) with check (true);

drop policy if exists "allow_authenticated_devices" on public.devices;
create policy "allow_authenticated_devices" on public.devices for all using (true) with check (true);

-- Security Hardening for app_users (Idempotent)
drop policy if exists "allow_read_app_users" on public.app_users;
create policy "allow_read_app_users" on public.app_users for select using (is_active = true);

drop policy if exists "allow_authenticated_manage_users" on public.app_users;
create policy "allow_authenticated_manage_users" on public.app_users for all using (true) with check (true);

-- Performance & Security Indexes
create index if not exists idx_tickets_status on public.tickets(status);
create index if not exists idx_tickets_created_at on public.tickets(created_at desc);
create index if not exists idx_tickets_ticket_number on public.tickets(ticket_number);
create index if not exists idx_worklogs_ticket_id on public.worklogs(ticket_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_app_users_username on public.app_users(username);
create index if not exists idx_app_users_email on public.app_users(email);
create index if not exists idx_devices_hostname on public.devices(hostname);
create index if not exists idx_devices_serial_number on public.devices(serial_number);
create index if not exists idx_devices_site_location on public.devices(site_location);

-- Safe Public View (Excluding password column for secure external querying)
create or replace view public.safe_app_users as
  select id, name, username, email, avatar_url, role, is_active, department, last_login_at
  from public.app_users
  where is_active = true;

-- ===== ENABLE REALTIME (IDEMPOTENT) =====
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table public.tickets;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;

