-- 004_admin_panel.sql
-- Admin panel infrastructure: admin role on profiles, audit log table.
--
-- Run this migration after 003_realtime_publication.sql.

-- ── Add role column to profiles ───────────────────────────────────────────────
-- 'user' is the default. 'admin' grants access to /api/admin/* endpoints.
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- ── Audit log table ───────────────────────────────────────────────────────────
-- Tracks admin actions (ban/unban users, change plans, etc.) for accountability.
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id) on delete cascade,
  action      text not null,           -- user.ban | user.unban | user.plan_change | user.delete | config.update
  target_id   uuid references auth.users(id) on delete set null,  -- user affected by the action
  target_type text default 'user',     -- user | config | system
  details     jsonb,                   -- arbitrary metadata about the action
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_admin_id on public.admin_audit_log(admin_id);
create index if not exists idx_audit_log_created_at on public.admin_audit_log(created_at desc);
create index if not exists idx_audit_log_target_id on public.admin_audit_log(target_id);

-- RLS: only admins can read the audit log
alter table public.admin_audit_log enable row level security;
create policy "Admins can read audit log" on public.admin_audit_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
create policy "Admins can insert audit log" on public.admin_audit_log
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Grant admins access to all profiles (for user management) ────────────────
-- Normally RLS only lets users see their own profile. Admins need to see all.
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update any user's profile (change plan, ban, etc.)
create policy "Admins can update any profile" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── Helper: check if a user is an admin ──────────────────────────────────────
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  );
$$;

grant execute on function public.is_admin to authenticated;
