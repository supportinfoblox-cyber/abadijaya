-- ========================================================
-- TicketOps - Migration Khusus: Tabel Devices (Manage Services)
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ========================================================

-- 1. Buat tabel devices (jika belum ada)
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

-- 2. Aktifkan Row Level Security (RLS)
alter table public.devices enable row level security;

-- 3. Policy Akses (Aman & Idempotent)
drop policy if exists "allow_authenticated_devices" on public.devices;
create policy "allow_authenticated_devices" on public.devices for all using (true) with check (true);

-- 4. Index Pencarian Cepat
create index if not exists idx_devices_hostname on public.devices(hostname);
create index if not exists idx_devices_serial_number on public.devices(serial_number);
create index if not exists idx_devices_site_location on public.devices(site_location);

-- 5. Aktifkan Realtime Sync (Aman jika sudah pernah terdaftar)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;
