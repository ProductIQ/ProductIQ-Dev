-- 003_realtime_publication.sql
-- Enable Supabase Realtime for notifications + intelligence_events tables.
--
-- This adds the tables to the Supabase Realtime Publication so that
-- the frontend can subscribe to INSERT/UPDATE/DELETE events via
-- supabase.channel().on('postgres_changes', ...).
--
-- Run this migration after 002_v2_features.sql.

-- ── Add tables to the realtime publication ────────────────────────────────────
-- Supabase manages a publication called 'supabase_realtime' that controls
-- which tables broadcast change events. We add our two tables here.

-- Notifications: broadcast INSERT + UPDATE (for mark-as-read sync)
alter publication supabase_realtime add table public.notifications;

-- Intelligence events: broadcast INSERT only (events are append-only)
alter publication supabase_realtime add table public.intelligence_events;

-- Brand profiles: broadcast INSERT + UPDATE + DELETE (for brand tracking sync)
alter publication supabase_realtime add table public.brand_profiles;

-- ── Optional: Reduce noise by only broadcasting relevant columns ──────────────
-- By default, all columns are broadcast. If you want to exclude sensitive
-- columns (e.g. user_id), you can use:
--
-- alter publication supabase_realtime set table public.notifications (id, type, category, title, body, link, read, created_at);
-- alter publication supabase_realtime set table public.intelligence_events (id, brand_name, event_type, severity, title, body, source, created_at);

-- ── Verify ────────────────────────────────────────────────────────────────────
-- Check that the tables are in the publication:
-- select * from pg_publication_tables where pubname = 'supabase_realtime';

-- ── Helper function: insert a notification from the backend ──────────────────
-- This function can be called by Celery tasks or webhook handlers to
-- push a notification to a user. It's SECURITY DEFINER so the service
-- role key can call it without RLS issues.
create or replace function public.notify_user(
  p_user_id uuid,
  p_type    text default 'info',
  p_category text default 'system',
  p_title   text,
  p_body    text default null,
  p_link    text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, category, title, body, link)
  values (p_user_id, p_type, p_category, p_title, p_body, p_link)
  returning id into v_id;
  return v_id;
end;
$$;

-- Grant execute to authenticated users (backend uses service role which bypasses)
grant execute on function public.notify_user to authenticated;

-- ── Helper function: insert an intelligence event ────────────────────────────
create or replace function public.create_intel_event(
  p_user_id    uuid,
  p_brand_name text default null,
  p_event_type text,
  p_severity   text default 'info',
  p_title      text,
  p_body       text default null,
  p_source     text default null,
  p_metadata   jsonb default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.intelligence_events (user_id, brand_name, event_type, severity, title, body, source, metadata)
  values (p_user_id, p_brand_name, p_event_type, p_severity, p_title, p_body, p_source, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_intel_event to authenticated;
