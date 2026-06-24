# Database Migration Guide

ProductIQ uses Supabase (PostgreSQL) with Row Level Security (RLS). Migrations are plain SQL files run in order via the Supabase Dashboard SQL Editor.

## Migration Files

| # | File | Description |
|---|---|---|
| 1 | `001_initial_schema.sql` | Core tables: profiles, agent_runs, agent_outputs, products, transactions, referral tracking. RLS policies for user-owned data. **Note:** This migration was applied directly via Supabase Dashboard during initial project setup. The schema is documented in `productiq_vibe_coding_guide.md`. |
| 2 | `002_v2_features.sql` | V2 tables: notifications, intelligence_events, brand_profiles, brand_tracked_competitors, chat_sessions, chat_messages, validation_runs, price_tracking, sentiment_tracking. RLS policies. |
| 3 | `003_realtime_publication.sql` | Enables Supabase Realtime publication on `notifications` and `intelligence_events` tables for live frontend updates. |
| 4 | `004_admin_panel.sql` | Adds `role` column to `profiles` (default `'user'`). Creates `admin_audit_log` table. RLS policies for admin access to all profiles + audit log. Creates `is_admin()` helper function. |

## Running Migrations

### Option 1: Supabase Dashboard (recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com) → your project
2. Navigate to **SQL Editor**
3. Copy-paste each migration file contents in order (001 → 002 → 003 → 004)
4. Click **Run** for each

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: psql (direct connection)

```bash
psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  -f 001_initial_schema.sql
psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  -f 002_v2_features.sql
psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  -f 003_realtime_publication.sql
psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  -f 004_admin_panel.sql
```

## Post-Migration Steps

### After 001_initial_schema.sql

- Create your first user via the frontend signup page
- Verify the profile was created: `SELECT * FROM profiles;`

### After 002_v2_features.sql

- V2 features (notifications, intelligence, brands, chat, validate, compare) are now available
- No additional setup needed — tables are empty by default

### After 003_realtime_publication.sql

- Realtime notifications work (INSERT/UPDATE events trigger frontend updates)
- Verify: Go to Supabase Dashboard → Database → Replication → check `notifications` and `intelligence_events` are in the `supabase_realtime` publication

### After 004_admin_panel.sql

- The `role` column is added to `profiles` with default `'user'`
- To make a user an admin:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
  ```
- Verify: `SELECT id, email, role FROM profiles WHERE role = 'admin';`
- The user can now access `/admin` in the frontend

## Making a User Admin

```sql
-- Promote to admin
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';

-- Demote to regular user
UPDATE profiles SET role = 'user' WHERE email = 'user@example.com';

-- List all admins
SELECT id, email, full_name, role FROM profiles WHERE role = 'admin';
```

## Rollback Notes

These migrations are forward-only. To rollback:

1. **004_admin_panel.sql** — `ALTER TABLE profiles DROP COLUMN role; DROP TABLE admin_audit_log;`
2. **003_realtime_publication.sql** — `ALTER PUBLICATION supabase_realtime DROP TABLE notifications, intelligence_events;`
3. **002_v2_features.sql** — Drop all V2 tables (see file for table names)
4. **001_initial_schema.sql** — Drop all core tables (will lose all data)

**Always backup your database before rolling back.**

## RLS Policy Summary

### User-owned data (001 + 002)

Users can only access their own data:
- `profiles` — users can SELECT/UPDATE their own profile
- `agent_runs` — users can SELECT/INSERT their own runs
- `agent_outputs` — users can SELECT outputs for their own runs
- `notifications` — users can SELECT/UPDATE their own notifications
- `intelligence_events` — users can SELECT events for their tracked brands
- `chat_sessions` / `chat_messages` — users can SELECT/INSERT their own chats

### Admin access (004)

Admins (role='admin') have elevated access:
- `profiles` — admins can SELECT/UPDATE any user's profile
- `admin_audit_log` — admins can SELECT/INSERT audit entries
- All admin actions (plan change, role change) are logged to `admin_audit_log`
