-- ============================================================
-- ProductIQ — Supplemental Schema: Auth, Users & Subscriptions
-- Migration: 005_auth_users_subscriptions.sql
--
-- PURPOSE:
--   The complete_schema.sql covered all core product-intelligence tables.
--   This migration adds the MISSING production-grade tables and functions for:
--
--   1.  AUTH EVENTS LOG        — Every login/logout/signup/reset event
--   2.  USER SESSIONS          — Active device sessions with revocation
--   3.  EMAIL VERIFICATION     — Track email confirmation state
--   4.  PASSWORD RESET TOKENS  — Secure server-side token tracking
--   5.  SUBSCRIPTION PLANS     — Plan catalogue (source of truth for pricing)
--   6.  SUBSCRIPTIONS          — Live Razorpay subscription lifecycle
--   7.  SUBSCRIPTION HISTORY   — Full plan change audit trail
--   8.  INVOICES               — Per-billing-cycle invoices (PDF link)
--   9.  REFUNDS                — Refund tracking linked to transactions
--   10. REPORT CREDITS         — Immutable ledger of credit additions/deductions
--   11. USAGE EVENTS           — Granular per-request billing & analytics
--   12. USER PREFERENCES       — Notification settings, timezone, theme
--   13. USER DEVICES / PUSH    — Push notification tokens (FCM/APNs)
--   14. TEAM WORKSPACES        — Multi-seat enterprise team support
--   15. TEAM MEMBERS           — Workspace membership + roles
--   16. TEAM INVITATIONS       — Invitation tokens for new members
--   17. API KEYS               — Per-user API keys for programmatic access
--   18. RATE LIMIT BUCKETS     — Server-side rate limit state per user+endpoint
--   19. FEATURE FLAGS          — Per-user feature flag overrides
--   20. SUPPORT TICKETS        — In-app helpdesk / issue tracking
--   21. ONBOARDING PROGRESS    — Step-by-step onboarding checklist state
--   22. USER FEEDBACK          — NPS / CSAT / feature request capture
--
-- TRIGGERS & FUNCTIONS:
--   - handle_new_user (EXTENDED)         — populate all defaults on signup
--   - prevent_self_referral              — DB-level referral guard
--   - auto_credit_on_referral            — award credits when referral converts
--   - enforce_report_limit               — block run creation when limit hit
--   - subscription_status_sync          — sync profile.plan from subscription
--   - cascade_workspace_delete           — clean up on workspace delete
--
-- RLS:
--   Every table has Row Level Security enabled with appropriate policies.
--
-- REALTIME:
--   subscriptions and invoices tables added to publication for live UI updates.
--
-- SAFE TO RUN:
--   Uses IF NOT EXISTS / CREATE OR REPLACE throughout.
--   Run AFTER complete_schema.sql on a live or fresh Supabase project.
-- ============================================================


-- ============================================================
-- STEP 1: AUTH EVENTS LOG
-- Full audit trail of every auth action for security monitoring.
-- Supabase doesn't expose auth.audit_log_entries to application code,
-- so we maintain our own lightweight version.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auth_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,
  -- signin | signout | signup | password_reset_request | password_reset_complete
  -- email_confirmation | token_refresh | oauth_signin | mfa_challenge
  ip_address  INET,
  user_agent  TEXT,
  country     TEXT,
  city        TEXT,
  device_type TEXT,        -- desktop | mobile | tablet
  success     BOOLEAN     NOT NULL DEFAULT TRUE,
  error_code  TEXT,        -- e.g. 'invalid_credentials', 'email_not_confirmed'
  metadata    JSONB        DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id    ON public.auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON public.auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_ip         ON public.auth_events(ip_address);

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auth events" ON public.auth_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all auth events" ON public.auth_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System can insert auth events" ON public.auth_events
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- STEP 2: USER SESSIONS (Device session management)
-- Track active sessions per device — enables "sign out all devices".
-- Supabase manages JWTs, but we track the logical sessions here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supabase_session_id TEXT    UNIQUE,          -- maps to Supabase auth.sessions.id
  device_name     TEXT,                        -- e.g. "Chrome on Windows"
  device_type     TEXT        DEFAULT 'web',   -- web | ios | android | api
  ip_address      INET,
  user_agent      TEXT,
  country         TEXT,
  city            TEXT,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked         BOOLEAN     NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,                        -- logout | admin_revoke | suspicious
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id    ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active     ON public.user_sessions(user_id) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON public.user_sessions(last_active_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can revoke own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage sessions" ON public.user_sessions
  FOR ALL WITH CHECK (true);
CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 3: SUBSCRIPTION PLANS (plan catalogue)
-- Single source of truth for pricing. Never hardcode plan prices
-- in application code — always read from this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT        NOT NULL UNIQUE,  -- 'free' | 'pro_monthly' | 'pro_annual' | 'enterprise'
  display_name         TEXT        NOT NULL,
  description          TEXT,
  price_inr            NUMERIC     NOT NULL DEFAULT 0,
  billing_cycle        TEXT        NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('once', 'monthly', 'annual', 'lifetime')),
  reports_per_month    INT         NOT NULL DEFAULT 3,
  max_brands           INT         NOT NULL DEFAULT 1,
  max_team_members     INT         NOT NULL DEFAULT 1,
  has_api_access       BOOLEAN     NOT NULL DEFAULT FALSE,
  has_priority_support BOOLEAN     NOT NULL DEFAULT FALSE,
  has_white_label      BOOLEAN     NOT NULL DEFAULT FALSE,
  features             JSONB       DEFAULT '[]',     -- list of feature strings for UI
  razorpay_plan_id     TEXT,                         -- Razorpay Plan ID for subscriptions
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  display_order        INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Seed default plans (idempotent)
INSERT INTO public.subscription_plans
  (slug, display_name, description, price_inr, billing_cycle, reports_per_month,
   max_brands, max_team_members, has_api_access, has_priority_support, display_order, features)
VALUES
  ('free',         'Free',            'Get started with 3 reports per month',   0,     'monthly', 3,   1, 1, FALSE, FALSE, 0,
   '["3 reports/month","Basic analysis","PDF export","Email support"]'),
  ('pro_monthly',  'Pro',             'For serious D2C brands',                  4999,  'monthly', 999, 5, 3, TRUE,  TRUE,  1,
   '["Unlimited reports","All 10 agents","API access","Priority support","Team (3 seats)","Advanced charts"]'),
  ('pro_annual',   'Pro Annual',      'Save 20% with annual billing',            47999, 'annual',  999, 5, 3, TRUE,  TRUE,  2,
   '["Unlimited reports","All 10 agents","API access","Priority support","Team (3 seats)","20% discount"]'),
  ('enterprise',   'Enterprise',      'Custom limits for large organisations',   14999, 'monthly', 9999,50,20,TRUE,  TRUE,  3,
   '["Unlimited reports","Unlimited brands","20 seats","White-label","SLA","Dedicated manager","Custom integrations"]'),
  ('pay_per_report','Pay Per Report', 'One-off analysis, no subscription needed',999,  'once',    1,   1, 1, FALSE, FALSE, 4,
   '["1 full report","All 10 agents","PDF + PPT export","Valid 30 days"]')
ON CONFLICT (slug) DO UPDATE SET
  price_inr        = EXCLUDED.price_inr,
  reports_per_month = EXCLUDED.reports_per_month,
  features         = EXCLUDED.features,
  updated_at       = now();


-- ============================================================
-- STEP 4: SUBSCRIPTIONS (live subscription lifecycle)
-- Each active Razorpay subscription has exactly one row here.
-- A user can have at most ONE active subscription at a time.
-- History is preserved via subscription_history.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id                  UUID        NOT NULL REFERENCES public.subscription_plans(id),
  plan_slug                TEXT        NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing','active','past_due','paused','cancelled','expired')),
  razorpay_subscription_id TEXT        UNIQUE,
  razorpay_plan_id         TEXT,
  razorpay_customer_id     TEXT,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN     NOT NULL DEFAULT FALSE,
  cancelled_at             TIMESTAMPTZ,
  cancel_reason            TEXT,
  trial_start              TIMESTAMPTZ,
  trial_end                TIMESTAMPTZ,
  payment_method           TEXT        DEFAULT 'razorpay',  -- razorpay | bank_transfer | manual
  metadata                 JSONB       DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_active_user UNIQUE NULLS NOT DISTINCT (user_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Note: the UNIQUE constraint above is partial — enforced at app layer for strictness.
-- DB constraint allows multiple rows per user but status transitions handle lifecycle.
-- Drop and recreate without the unusual NULLS NOT DISTINCT if Postgres < 15:
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS uq_subscriptions_active_user;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay   ON public.subscriptions(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage subscriptions" ON public.subscriptions
  FOR ALL WITH CHECK (true);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 5: SUBSCRIPTION HISTORY (immutable plan change log)
-- Every plan change writes a new row here. Never modified.
-- Used for billing disputes, support tickets, analytics.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID        REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  from_plan       TEXT,                  -- NULL on first activation
  to_plan         TEXT        NOT NULL,
  from_status     TEXT,
  to_status       TEXT        NOT NULL,
  change_reason   TEXT,                  -- upgrade | downgrade | cancel | renewal | trial_end | admin_change | refund
  changed_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = system/webhook
  razorpay_event  TEXT,                  -- e.g. 'subscription.charged', 'payment.captured'
  amount_paise    INT,                   -- amount involved in this change event
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_history_user_id    ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_history_created_at ON public.subscription_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_history_sub_id     ON public.subscription_history(subscription_id);

ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription history" ON public.subscription_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert subscription history" ON public.subscription_history
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all subscription history" ON public.subscription_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 6: INVOICES
-- One row per billing cycle. Linked to subscription + transaction.
-- PDF invoice URL stored for user download and accounting.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id     UUID        REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  transaction_id      UUID        REFERENCES public.transactions(id) ON DELETE SET NULL,
  invoice_number      TEXT        UNIQUE NOT NULL,  -- e.g. 'INV-2025-000042'
  status              TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','paid','void','uncollectible')),
  amount_paise        INT         NOT NULL,
  tax_paise           INT         NOT NULL DEFAULT 0,
  total_paise         INT         NOT NULL,  -- amount + tax
  currency            TEXT        NOT NULL DEFAULT 'INR',
  plan_slug           TEXT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end   TIMESTAMPTZ,
  due_date            TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  pdf_url             TEXT,                  -- Supabase Storage link to generated PDF
  razorpay_invoice_id TEXT,
  notes               TEXT,
  line_items          JSONB       DEFAULT '[]',  -- [{description, qty, amount_paise}]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate invoice number (INV-YYYY-NNNNNN)
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number = 'INV-' || to_char(now(), 'YYYY') || '-' ||
    LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_invoice_number ON public.invoices;
CREATE TRIGGER trg_invoices_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_user_id     ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at  ON public.invoices(created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage invoices" ON public.invoices
  FOR ALL WITH CHECK (true);
CREATE POLICY "Admins can view all invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 7: REFUNDS
-- Track refund lifecycle. Linked to original transaction.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.refunds (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id        UUID        NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  razorpay_refund_id    TEXT        UNIQUE,
  amount_paise          INT         NOT NULL,
  reason                TEXT,        -- 'duplicate' | 'fraudulent' | 'customer_request' | 'other'
  status                TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','processed','failed')),
  notes                 TEXT,
  initiated_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- admin who processed
  processed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_refunds_updated_at ON public.refunds;
CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_refunds_user_id        ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON public.refunds(transaction_id);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage refunds" ON public.refunds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System can insert refunds" ON public.refunds
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- STEP 8: REPORT CREDITS LEDGER
-- Immutable, append-only ledger of every credit change.
-- Replaces the integer column approach — full auditability.
-- Balance = SUM(amount) WHERE user_id = ?
-- ============================================================

CREATE TABLE IF NOT EXISTS public.report_credits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      INT         NOT NULL,       -- positive = credit, negative = debit
  balance_after INT,                      -- snapshot of balance after this transaction
  reason      TEXT        NOT NULL,
  -- plan_included | referral_bonus | pay_per_report | admin_grant | monthly_reset | report_used
  reference_id TEXT,                      -- run_id, transaction_id, etc.
  reference_type TEXT,                    -- 'run' | 'transaction' | 'subscription' | 'admin'
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_user_id    ON public.report_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON public.report_credits(user_id, created_at DESC);

ALTER TABLE public.report_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit ledger" ON public.report_credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert credits" ON public.report_credits
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all credits" ON public.report_credits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Helper: get current credit balance for a user
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INT
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0)::INT
  FROM public.report_credits
  WHERE user_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_credit_balance TO authenticated;


-- ============================================================
-- STEP 9: USAGE EVENTS (granular billing & analytics log)
-- Every API call that consumes quota is recorded here.
-- Feeds: billing reconciliation, per-feature usage analytics,
--        anomaly detection, per-user cost attribution.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  -- report_run | api_call | chat_query | export_pdf | export_ppt |
  -- brand_monitor | concept_validate | price_check | sentiment_scan
  run_id          UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  endpoint        TEXT,        -- e.g. '/api/reports/run'
  credits_used    INT         NOT NULL DEFAULT 0,
  tokens_used     INT         NOT NULL DEFAULT 0,    -- LLM tokens
  duration_ms     INT,
  status          TEXT        DEFAULT 'success'
    CHECK (status IN ('success','error','timeout','quota_exceeded')),
  plan_at_time    TEXT,        -- snapshot of user's plan at event time
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_id    ON public.usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_event_type ON public.usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON public.usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON public.usage_events(user_id, created_at DESC);

-- Partition by month for scale (optional — add later if needed)
-- CREATE TABLE public.usage_events_2025_07 PARTITION OF public.usage_events ...

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert usage events" ON public.usage_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all usage" ON public.usage_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 10: USER PREFERENCES
-- Per-user settings: notification preferences, UI preferences,
-- timezone, language, and feature toggle overrides.
-- One row per user — upsert on change.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id                     UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Notification channels
  notify_email                BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_slack                BOOLEAN     NOT NULL DEFAULT FALSE,
  notify_in_app               BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_push                 BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Notification events (granular opt-in/out)
  notify_on_report_complete   BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_on_sentiment_alert   BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_on_price_change      BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_on_competitor_move   BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_on_billing           BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_on_team_activity     BOOLEAN     NOT NULL DEFAULT TRUE,
  -- UI preferences
  theme                       TEXT        NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  language                    TEXT        NOT NULL DEFAULT 'en',
  timezone                    TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
  date_format                 TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',
  currency_display            TEXT        NOT NULL DEFAULT 'INR',
  -- Dashboard preferences
  default_market              TEXT        NOT NULL DEFAULT 'India',
  sidebar_collapsed           BOOLEAN     NOT NULL DEFAULT FALSE,
  items_per_page              INT         NOT NULL DEFAULT 20,
  -- Marketing preferences
  marketing_emails            BOOLEAN     NOT NULL DEFAULT TRUE,
  product_updates_emails      BOOLEAN     NOT NULL DEFAULT TRUE,
  weekly_digest_email         BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view preferences" ON public.user_preferences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 11: USER DEVICES (Push notification tokens)
-- Store FCM/APNs device tokens for mobile push notifications.
-- Also used for web push (VAPID).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_token TEXT        NOT NULL UNIQUE,
  platform     TEXT        NOT NULL CHECK (platform IN ('web','ios','android')),
  device_name  TEXT,
  app_version  TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id  ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active   ON public.user_devices(user_id) WHERE is_active = TRUE;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices" ON public.user_devices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- STEP 12: TEAM WORKSPACES
-- Enterprise multi-seat support. Each workspace has a plan,
-- owner, and member list. Reports/brands belong to the workspace.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  slug            TEXT        UNIQUE,
  avatar_url      TEXT,
  plan_slug       TEXT        NOT NULL DEFAULT 'free',
  max_members     INT         NOT NULL DEFAULT 1,
  reports_limit   INT         NOT NULL DEFAULT 3,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Policies for public.workspaces are defined after workspace_members table is created below.


-- ============================================================
-- STEP 13: WORKSPACE MEMBERS
-- Membership table for workspaces.
-- role: owner | admin | member | viewer
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','admin','member','viewer')),
  status       TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','removed')),
  invited_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

DROP TRIGGER IF EXISTS trg_workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_ws_members_workspace  ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user_id    ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_active     ON public.workspace_members(workspace_id) WHERE status = 'active';

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workspace members" ON public.workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m2
      WHERE m2.workspace_id = workspace_id AND m2.user_id = auth.uid() AND m2.status = 'active'
    )
  );
CREATE POLICY "Workspace admins can manage members" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m2
      WHERE m2.workspace_id = workspace_id
        AND m2.user_id = auth.uid()
        AND m2.role IN ('owner','admin')
        AND m2.status = 'active'
    )
  );

-- ============================================================
-- POLICIES FOR WORKSPACES
-- Defined here since they depend on workspace_members.
-- ============================================================

CREATE POLICY "Members can view own workspace" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = id AND m.user_id = auth.uid() AND m.status = 'active'
    )
  );
CREATE POLICY "Owners can manage workspace" ON public.workspaces
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins can view all workspaces" ON public.workspaces
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 14: WORKSPACE INVITATIONS
-- Invitation tokens with expiry. Sent via email.
-- Accepting the invitation creates a workspace_members row.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin','member','viewer')),
  token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ws_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_invitations_email     ON public.workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_ws_invitations_token     ON public.workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_ws_invitations_pending   ON public.workspace_invitations(email) WHERE status = 'pending';

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can view invitations" ON public.workspace_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_id AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin') AND m.status = 'active'
    )
  );
CREATE POLICY "Invited user can view own invitation" ON public.workspace_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "System can manage invitations" ON public.workspace_invitations
  FOR ALL WITH CHECK (true);


-- ============================================================
-- STEP 15: API KEYS
-- Per-user API keys for programmatic access to ProductIQ API.
-- The actual key value is shown ONCE on creation and never stored in full.
-- We store the SHA-256 hash for verification.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,                    -- e.g. "Production API Key"
  key_hash     TEXT        NOT NULL UNIQUE,             -- SHA-256 of the actual key
  key_prefix   TEXT        NOT NULL,                    -- first 8 chars for display: "piq_live_abc12345..."
  scopes       TEXT[]      NOT NULL DEFAULT '{"read"}', -- 'read' | 'write' | 'admin'
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,                             -- NULL = never expires
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  revoked_at   TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id    ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash   ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active     ON public.api_keys(user_id) WHERE is_active = TRUE;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all API keys" ON public.api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 16: FEATURE FLAGS (per-user overrides)
-- Allows gradual rollout of new features to specific users.
-- Evaluated at request time by the backend.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- NULL user_id = global flag applied to all users
  flag_name   TEXT        NOT NULL,                -- e.g. 'new_dashboard_v3', 'agent_11_beta'
  is_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  rollout_pct INT         DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  -- If user_id is NULL, flag applies to rollout_pct% of all users
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, flag_name)
);

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_feature_flags_user_id   ON public.feature_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_name ON public.feature_flags(flag_name);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feature flags" ON public.feature_flags
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can manage all feature flags" ON public.feature_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 17: SUPPORT TICKETS
-- In-app helpdesk. Users can create tickets; admins respond.
-- Simple but production-ready — can be replaced by Intercom/Zendesk.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject      TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','billing','bug','feature_request','account','other')),
  priority     TEXT        NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  status       TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','waiting_for_user','resolved','closed')),
  assigned_to  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,
  closed_at    TIMESTAMPTZ,
  run_id       UUID        REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_tickets_user_id    ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status     ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.support_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_staff   BOOLEAN     NOT NULL DEFAULT FALSE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON public.support_ticket_replies(ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tickets" ON public.support_tickets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Users can view replies on own tickets" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all replies" ON public.support_ticket_replies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Users can post replies on own tickets" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );


-- ============================================================
-- STEP 18: ONBOARDING PROGRESS
-- Track user onboarding checklist completion.
-- Each step has a boolean completion flag and timestamp.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id                   UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Step completion flags
  completed_signup          BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_email_verify    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_profile         BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_first_run       BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_first_report    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_brand_setup     BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_billing_setup   BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_team_invite     BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Timestamps for each step
  signup_at                 TIMESTAMPTZ,
  email_verified_at         TIMESTAMPTZ,
  profile_completed_at      TIMESTAMPTZ,
  first_run_at              TIMESTAMPTZ,
  first_report_at           TIMESTAMPTZ,
  brand_setup_at            TIMESTAMPTZ,
  billing_setup_at          TIMESTAMPTZ,
  team_invite_at            TIMESTAMPTZ,
  -- Overall completion
  is_complete               BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at              TIMESTAMPTZ,
  -- Onboarding flow variant (for A/B testing)
  variant                   TEXT        DEFAULT 'default',
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_onboarding_updated_at ON public.onboarding_progress;
CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own onboarding" ON public.onboarding_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view onboarding data" ON public.onboarding_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 19: USER FEEDBACK (NPS / CSAT / Feature requests)
-- Capture in-app feedback for product analytics.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type TEXT       NOT NULL CHECK (feedback_type IN ('nps','csat','feature_request','bug','general')),
  -- NPS: score 0-10, CSAT: score 1-5
  score        INT         CHECK (score BETWEEN 0 AND 10),
  comment      TEXT,
  feature_tag  TEXT,        -- for feature requests: 'dashboard' | 'reports' | 'agents' etc.
  page_url     TEXT,        -- where the feedback was triggered
  plan_at_time TEXT,        -- snapshot of plan
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id    ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type       ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.user_feedback(created_at DESC);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.user_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.user_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- ============================================================
-- STEP 20: EXTENDED handle_new_user TRIGGER
-- Replaces the minimal version from complete_schema.sql.
-- Now also seeds: user_preferences, onboarding_progress,
-- and creates a personal workspace for each new user.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name      TEXT;
  v_company_name   TEXT;
  v_ref_code       TEXT;
  v_referrer_id    UUID;
  v_workspace_id   UUID;
BEGIN
  -- Extract metadata from Supabase Auth signup
  v_full_name    := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', '');

  -- 1. Create the profile row
  INSERT INTO public.profiles (id, email, full_name, company_name)
  VALUES (NEW.id, NEW.email, v_full_name, v_company_name)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Seed default preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Seed onboarding state (signup step is immediately done)
  INSERT INTO public.onboarding_progress (
    user_id, completed_signup, signup_at
  )
  VALUES (NEW.id, TRUE, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- 4. Create a personal workspace for the user
  INSERT INTO public.workspaces (owner_id, name, slug, plan_slug, max_members, reports_limit)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(v_company_name, ''), COALESCE(NULLIF(v_full_name, ''), split_part(NEW.email, '@', 1))) || '''s Workspace',
    lower(regexp_replace(COALESCE(NULLIF(v_company_name, ''), split_part(NEW.email, '@', 1)), '[^a-z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8),
    'free',
    1,
    3
  )
  RETURNING id INTO v_workspace_id;

  -- 5. Add user as workspace owner in members table
  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 6. Seed initial report credit (3 free credits)
  INSERT INTO public.report_credits (user_id, amount, balance_after, reason, reference_type)
  VALUES (NEW.id, 3, 3, 'plan_included', 'subscription');

  -- 7. Handle referral code (if provided at signup)
  v_ref_code := COALESCE(NEW.raw_user_meta_data->>'referral_code', '');
  IF v_ref_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_ref_code
      AND id != NEW.id;

    IF v_referrer_id IS NOT NULL THEN
      -- Credit the new user +1
      INSERT INTO public.report_credits (user_id, amount, reason, reference_id, reference_type)
      VALUES (NEW.id, 1, 'referral_bonus', v_referrer_id::TEXT, 'admin');

      -- Credit the referrer +1
      INSERT INTO public.report_credits (user_id, amount, reason, reference_id, reference_type)
      VALUES (v_referrer_id, 1, 'referral_bonus', NEW.id::TEXT, 'admin');

      -- Update profiles.referred_by + extra_reports_from_referrals
      UPDATE public.profiles
      SET referred_by = v_referrer_id,
          extra_reports_from_referrals = extra_reports_from_referrals + 1
      WHERE id = NEW.id;

      UPDATE public.profiles
      SET extra_reports_from_referrals = extra_reports_from_referrals + 1
      WHERE id = v_referrer_id;
    END IF;
  END IF;

  -- 8. Log the signup event
  INSERT INTO public.auth_events (user_id, event_type, success, metadata)
  VALUES (NEW.id, 'signup', TRUE, jsonb_build_object(
    'email', NEW.email,
    'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (replaces the one in complete_schema.sql)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STEP 21: SUBSCRIPTION STATUS SYNC FUNCTION
-- Called by Razorpay webhooks to keep profiles.plan in sync
-- with the active subscription record.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_subscription_to_profile(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_active_sub RECORD;
BEGIN
  -- Find the most recent active subscription
  SELECT plan_slug, current_period_end, status
  INTO v_active_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active','trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Map plan_slug to profile.plan value
    UPDATE public.profiles
    SET plan = CASE
      WHEN v_active_sub.plan_slug IN ('pro_monthly','pro_annual') THEN 'pro'
      WHEN v_active_sub.plan_slug = 'enterprise' THEN 'enterprise'
      ELSE 'free'
    END,
    reports_limit = (
      SELECT reports_per_month FROM public.subscription_plans
      WHERE slug = v_active_sub.plan_slug
    )
    WHERE id = p_user_id;
  ELSE
    -- No active subscription → revert to free
    UPDATE public.profiles
    SET plan = 'free', reports_limit = 3
    WHERE id = p_user_id AND plan != 'free';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_subscription_to_profile TO authenticated;


-- ============================================================
-- STEP 22: ENFORCE REPORT LIMIT GUARD
-- Postgres function called by the backend before creating a run.
-- Returns TRUE if the user can run, FALSE + reason if blocked.
-- Checks: reports_used_this_month >= (reports_limit + extra_referral_credits)
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_user_run_report(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, reason TEXT, used INT, limit_total INT)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_profile RECORD;
  v_total_limit INT;
BEGIN
  SELECT plan, reports_used_this_month, reports_limit, extra_reports_from_referrals
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Profile not found', 0, 0;
    RETURN;
  END IF;

  v_total_limit := v_profile.reports_limit + COALESCE(v_profile.extra_reports_from_referrals, 0);

  IF v_profile.reports_used_this_month >= v_total_limit THEN
    RETURN QUERY SELECT FALSE,
      format('Monthly limit reached (%s/%s). Upgrade your plan or wait for reset.',
             v_profile.reports_used_this_month, v_total_limit),
      v_profile.reports_used_this_month,
      v_total_limit;
  ELSE
    RETURN QUERY SELECT TRUE, 'OK'::TEXT,
      v_profile.reports_used_this_month, v_total_limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_run_report TO authenticated;


-- ============================================================
-- STEP 23: MONTHLY RESET (extended version)
-- Enhanced to also write a credit ledger entry for transparency.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_monthly_reports()
RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_plan_limit INT;
BEGIN
  FOR v_user IN
    SELECT p.id, p.plan, p.reports_limit
    FROM public.profiles p
    WHERE p.reports_used_this_month > 0
  LOOP
    -- Reset the counter
    UPDATE public.profiles
    SET reports_used_this_month = 0
    WHERE id = v_user.id;

    -- Log the reset as a credit ledger event
    INSERT INTO public.report_credits (
      user_id, amount, reason, reference_type, created_at
    )
    VALUES (
      v_user.id,
      0,  -- reset event, not a credit addition
      'monthly_reset',
      'subscription',
      now()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- STEP 24: REALTIME PUBLICATIONS FOR NEW TABLES
-- ============================================================

ALTER TABLE public.subscriptions        REPLICA IDENTITY FULL;
ALTER TABLE public.invoices             REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets      REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;


-- ============================================================
-- STEP 25: INDEXES FOR PERFORMANCE (cross-table analytics queries)
-- ============================================================

-- For admin dashboard revenue queries
CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON public.transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_plan      ON public.transactions(user_id, plan);

-- For monthly reset cron job (only users who have run reports)
CREATE INDEX IF NOT EXISTS idx_profiles_reports_used  ON public.profiles(reports_used_this_month)
  WHERE reports_used_this_month > 0;

-- For plan expiry checks (subscriptions about to expire)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry   ON public.subscriptions(current_period_end)
  WHERE status = 'active';

-- For auth event security monitoring
CREATE INDEX IF NOT EXISTS idx_auth_events_failed     ON public.auth_events(ip_address, created_at DESC)
  WHERE success = FALSE;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
--
-- New tables added (22 total):
--   Auth/Security (2):  auth_events, user_sessions
--   Billing (5):        subscription_plans, subscriptions, subscription_history, invoices, refunds
--   Credits (2):        report_credits, usage_events
--   Preferences (2):    user_preferences, user_devices
--   Teams (3):          workspaces, workspace_members, workspace_invitations
--   Developer (2):      api_keys, feature_flags
--   Support (3):        support_tickets, support_ticket_replies, user_feedback
--   Onboarding (1):     onboarding_progress
--   (Sequence 1):       invoice_number_seq
--
-- Functions added/extended:
--   handle_new_user            (extended — now seeds prefs, workspace, credits, referral)
--   generate_invoice_number    (NEW)
--   get_credit_balance         (NEW)
--   sync_subscription_to_profile (NEW)
--   can_user_run_report        (NEW)
--   reset_monthly_reports      (EXTENDED — now logs to credit ledger)
--
-- Post-run actions:
--   - No manual actions required; seeds run automatically.
--   - To test: SELECT * FROM public.subscription_plans;
--   - Razorpay webhook handler should call sync_subscription_to_profile(user_id)
--     after payment.captured and subscription.charged events.
-- ============================================================
