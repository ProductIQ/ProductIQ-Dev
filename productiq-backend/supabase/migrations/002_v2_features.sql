-- ProductIQ V2 Feature Tables Migration
-- Creates tables for notifications, intelligence events, brand profiles,
-- chat sessions/messages, concept validations, and pgvector embeddings.
--
-- Run this in the Supabase SQL Editor after the base schema migration.

-- Enable pgvector extension (required for RAG embeddings)
create extension if not exists vector with schema extensions;

-- ══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'info',  -- info | success | warning | error
  category    text not null default 'system', -- system | report | intelligence | billing | brand
  title       text not null,
  body        text,
  link        text,                           -- optional URL to navigate to
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_unread on public.notifications(user_id) where read = false;
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- RLS
alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications
  for insert with check (true);  -- Backend service role bypasses RLS

-- ══════════════════════════════════════════════════════════════════════════════
-- INTELLIGENCE EVENTS
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.intelligence_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  brand_name  text,
  event_type  text not null,                   -- competitor_move | trend_shift | sentiment_alert | price_change | market_gap
  severity    text not null default 'info',    -- info | warning | critical
  title       text not null,
  body        text,
  source      text,                             -- google_trends | reddit | amazon | news | internal
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_intel_events_user_id on public.intelligence_events(user_id);
create index if not exists idx_intel_events_brand on public.intelligence_events(brand_name);
create index if not exists idx_intel_events_severity on public.intelligence_events(severity);
create index if not exists idx_intel_events_created_at on public.intelligence_events(created_at desc);

alter table public.intelligence_events enable row level security;
create policy "Users can view own intel events" on public.intelligence_events
  for select using (auth.uid() = user_id);
create policy "System can insert intel events" on public.intelligence_events
  for insert with check (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- BRAND PROFILES
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.brand_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_name    text not null,
  category      text,
  target_market text default 'India',
  health_score  integer,                        -- 0-100, computed by Agent 9
  is_active     boolean not null default true,
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_brand_profiles_user_id on public.brand_profiles(user_id);
create index if not exists idx_brand_profiles_active on public.brand_profiles(user_id) where is_active = true;
create unique index if not exists idx_brand_profiles_user_brand on public.brand_profiles(user_id, brand_name);

alter table public.brand_profiles enable row level security;
create policy "Users can CRUD own brands" on public.brand_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- CHAT SESSIONS & MESSAGES
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'New conversation',
  run_id      uuid,                             -- optional: link to a specific report run
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index if not exists idx_chat_sessions_updated_at on public.chat_sessions(updated_at desc);

alter table public.chat_sessions enable row level security;
create policy "Users can CRUD own chat sessions" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  role        text not null,                     -- user | assistant | system
  content     text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at asc);

alter table public.chat_messages enable row level security;
create policy "Users can view messages in own sessions" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy "Users can insert messages in own sessions" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy "Users can delete messages in own sessions" on public.chat_messages
  for delete using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- CONCEPT VALIDATIONS
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.concept_validations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  concept_name    text not null,
  description     text not null,
  target_market   text default 'India',
  run_id          uuid,                           -- optional: validate against a specific run
  status          text not null default 'pending', -- pending | completed | failed
  market_fit      integer,
  differentiation integer,
  feasibility     integer,
  overall_score   integer,
  summary         text,
  strengths       text[],
  risks           text[],
  recommendations text[],
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_validations_user_id on public.concept_validations(user_id);
create index if not exists idx_validations_created_at on public.concept_validations(created_at desc);

alter table public.concept_validations enable row level security;
create policy "Users can CRUD own validations" on public.concept_validations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- RAG EMBEDDINGS (pgvector)
-- ══════════════════════════════════════════════════════════════════════════════
create table if not exists public.embeddings (
  id          uuid primary key default gen_random_uuid(),
  content     text not null,
  embedding   vector(768),                       -- Gemini embedding-001 dimension
  metadata    jsonb default '{}',
  run_id      uuid,                               -- link to the report run
  user_id     uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists idx_embeddings_run_id on public.embeddings(run_id);
create index if not exists idx_embeddings_user_id on public.embeddings(user_id);

-- HNSW index for fast similarity search
create index if not exists idx_embeddings_hnsw
  on public.embeddings using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.embeddings enable row level security;
create policy "Users can view own embeddings" on public.embeddings
  for select using (auth.uid() = user_id);
create policy "System can insert embeddings" on public.embeddings
  for insert with check (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER (for chat_sessions)
-- ══════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chat_sessions_updated_at on public.chat_sessions;
create trigger trg_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_brand_profiles_updated_at on public.brand_profiles;
create trigger trg_brand_profiles_updated_at
  before update on public.brand_profiles
  for each row execute function public.handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- REALTIME PUBLICATION (for live notifications + sentiment)
-- ══════════════════════════════════════════════════════════════════════════════
alter table public.notifications replica identity full;
alter table public.intelligence_events replica identity full;
alter table public.brand_profiles replica identity full;

-- Done. Verify with:
-- select tablename from pg_tables where schemaname = 'public' and tablename in
--   ('notifications','intelligence_events','brand_profiles','chat_sessions',
--    'chat_messages','concept_validations','embeddings');
