# ProductIQ — Deployment Guide

This guide covers three deployment options, from simplest to most production-ready:

1. **Docker Compose** (single server, all services on one machine)
2. **Railway** (managed PaaS, auto-scaling, built-in Redis)
3. **Fly.io** (edge-deployed, per-region, process groups)

---

## Prerequisites (all options)

Before deploying, you need:

1. **Supabase project** — [supabase.com](https://supabase.com)
   - Get the Project URL, anon key, and service_role key
   - Run the SQL migrations in `productiq-backend/supabase/` (schema + RLS policies)

2. **Gemini API key(s)** — [aistudio.google.com](https://aistudio.google.com)
   - Free tier: 15 RPM / 1,500 req/day per key
   - You can add up to 6 keys for rotation: `GEMINI_API_KEY_1` through `GEMINI_API_KEY_6`

3. **Apify API token** — [apify.com](https://apify.com)
   - Used by Agent 1 (scraper) and Agent 2 (review miner)
   - Free tier: $5/month credit

4. **Razorpay account** — [razorpay.com](https://razorpay.com)
   - Get Key ID and Key Secret
   - Set up webhook URL: `https://yourdomain.com/api/webhooks/razorpay`

5. **Redis** — provided by Railway/Fly add-ons, or run via docker-compose

6. **Sentry** (optional) — [sentry.io](https://sentry.io)
   - Create a project for the backend (Python/FastAPI) and frontend (React)
   - Get the DSN for each
   - For source maps: create an auth token with `org:read` + `project:releases` scopes

---

## Option 1: Docker Compose (single server)

Best for: staging, testing, small-scale production on a VPS (DigitalOcean, Hetzner, AWS EC2).

### Requirements
- Docker 24+ and Docker Compose v2+
- 4GB+ RAM (CrewAI + spaCy + BERTopic need headroom)
- 20GB+ disk

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url> ProductIQ-Dev
cd ProductIQ-Dev

# 2. Configure backend env
cp productiq-backend/.env.example productiq-backend/.env
# Edit productiq-backend/.env — fill in all real values
# Set: APP_ENV=production, SECRET_KEY=<random 32+ chars>, USE_CELERY=true
# Set: REDIS_URL=redis://redis:6379/0 (docker-compose service name)

# 3. Configure frontend env
cp productiq-frontend/.env.example productiq-frontend/.env
# Edit productiq-frontend/.env — fill in Supabase URL + anon key

# 4. Configure root env (for docker-compose build args)
cp .env.example .env
# Edit .env — fill in VITE_ vars (same as frontend .env)

# 5. Build and start all services
docker compose up -d

# 6. Check health
docker compose ps
curl http://localhost/health

# 7. View logs
docker compose logs -f api
docker compose logs -f worker
```

### With Flower monitoring (optional)
```bash
docker compose --profile monitoring up -d
# Visit http://localhost:5555 for Celery dashboard
```

### Updating
```bash
git pull
docker compose build --no-cache api web
docker compose up -d
```

---

## Option 2: Railway (managed PaaS)

Best for: production with auto-scaling, zero DevOps.

### Steps

1. **Create Railway project**
   - Go to [railway.app](https://railway.app) → New Project
   - Connect your GitHub repo

2. **Add Redis add-on**
   - Railway Dashboard → Add → Redis
   - Railway auto-injects `REDIS_URL` into all services

3. **Deploy services**
   Railway reads `railway.toml` and creates 4 services:
   - `api` — FastAPI backend
   - `worker` — Celery worker
   - `beat` — Celery scheduler
   - `web` — Frontend (nginx)

4. **Set environment variables**
   For each service, set these in Railway Dashboard → Variables:
   ```
   APP_ENV=production
   SECRET_KEY=<32+ char random string>
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=<service_role_key>
   GEMINI_API_KEY=<your_key>
   APIFY_API_TOKEN=<your_token>
   RAZORPAY_KEY_ID=<your_key>
   RAZORPAY_KEY_SECRET=<your_secret>
   USE_CELERY=true
   FRONTEND_URL=https://your-app.up.railway.app
   ```

   For the `web` service, also set:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon_key>
   VITE_API_URL=/api
   VITE_RAZORPAY_KEY_ID=<your_key>
   ```

5. **Configure custom domain** (optional)
   Railway Dashboard → web service → Settings → Domains

6. **Set Razorpay webhook URL**
   Razorpay Dashboard → Webhooks → Add
   URL: `https://your-domain.com/api/webhooks/razorpay`

---

## Option 3: Fly.io (edge deployment)

Best for: low-latency deployment to specific regions (Singapore/Mumbai for India).

### Steps

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch the app (creates fly.toml if not present)
cd ProductIQ-Dev
fly launch --config fly.toml

# 4. Create a Redis instance
fly redis create --name productiq-redis

# 5. Set secrets (never in env files)
fly secrets set \
  APP_ENV=production \
  SECRET_KEY=$(openssl rand -hex 32) \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_KEY=<service_role_key> \
  GEMINI_API_KEY=<your_key> \
  APIFY_API_TOKEN=<your_token> \
  RAZORPAY_KEY_ID=<your_key> \
  RAZORPAY_KEY_SECRET=<your_secret> \
  USE_CELERY=true

# 6. Deploy
fly deploy

# 7. Scale (optional)
fly scale count 2  # 2 API instances
fly machine --process worker scale count 1
fly machine --process beat scale count 1
```

---

## Post-Deployment Checklist

- [ ] `curl https://your-domain.com/health` returns `{"status": "ok"}`
- [ ] `curl https://your-domain.com/api/health` returns 200
- [ ] Frontend loads at `https://your-domain.com`
- [ ] User can sign up / log in (Supabase Auth)
- [ ] User can create a report (POST /api/reports/run)
- [ ] SSE stream works (agent progress updates in real-time)
- [ ] Report PDF/PPTX downloads work
- [ ] Razorpay payment flow works (test mode first)
- [ ] Razorpay webhook signature verification passes
- [ ] Celery worker picks up tasks (check Flower or `docker compose logs worker`)
- [ ] Celery beat runs scheduled tasks (check at 7 AM IST)
- [ ] Rate limiting works (hit an endpoint 61 times in a minute → 429)
- [ ] LLM observability endpoint: `curl https://your-domain.com/health/llm-usage`
- [ ] Realtime notifications work (create a notification in DB → toast appears in UI)
- [ ] Intelligence feed updates live (toggle "Live" on intelligence page)
- [ ] Unread badge in topbar reflects actual unread count
- [ ] Admin panel accessible at `/admin` (for admin users only)
- [ ] Admin can change user plans and roles
- [ ] Admin system health shows all services as "healthy"
- [ ] Sentry receiving errors (if SENTRY_DSN configured — trigger a test error)
- [ ] Database migrations applied (001 through 004)
- [ ] Supabase Realtime publication enabled for notifications + intelligence_events

---

## Environment Variables Reference

### Backend (productiq-backend/.env)

| Variable | Required | Description |
|---|---|---|
| `APP_ENV` | Yes | `production` or `development` |
| `SECRET_KEY` | Yes | 32+ char random string (validated in production) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service_role key (server only) |
| `GEMINI_API_KEY` | Yes | Primary Gemini API key |
| `GEMINI_API_KEY_2`...`_6` | Optional | Additional keys for rotation |
| `APIFY_API_TOKEN` | Yes | Apify token for web scraping |
| `RAZORPAY_KEY_ID` | Yes | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay Key Secret |
| `REDIS_URL` | Yes | Redis connection string |
| `USE_CELERY` | Yes | `true` in production, `false` in dev |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `DATABASE_URL` | Optional | Supabase direct connection (for pgvector) |
| `SERPAPI_KEY` | Optional | SerpAPI key for trend data |
| `REDDIT_CLIENT_ID` | Optional | Reddit API for trend data |
| `REDDIT_CLIENT_SECRET` | Optional | Reddit API |
| `SLACK_WEBHOOK_URL` | Optional | Slack notifications |
| `POSTHOG_API_KEY` | Optional | PostHog analytics |
| `POSTHOG_HOST` | Optional | PostHog host (default: app.posthog.com) |
| `SENTRY_DSN` | Optional | Sentry DSN for error tracking (empty = disabled) |
| `SENTRY_ENVIRONMENT` | Optional | Sentry environment tag (default: development) |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional | Performance trace sampling rate (default: 0.1) |

### Frontend (productiq-frontend/.env)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for browser) |
| `VITE_API_URL` | Yes | `/api` (proxied via nginx) or full backend URL |
| `VITE_RAZORPAY_KEY_ID` | Yes | Razorpay Key ID (publishable, safe for browser) |
| `VITE_SENTRY_DSN` | Optional | Sentry DSN for frontend error tracking |
| `VITE_SENTRY_ENVIRONMENT` | Optional | Sentry environment (default: Vite mode) |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Optional | Trace sampling rate (default: 0.1) |
| `VITE_SENTRY_RELEASE` | Optional | Release version (auto-set to git SHA in CI) |

### CI/CD (GitHub Actions secrets)

| Secret | Required | Description |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | Optional | Sentry auth token for source map upload |
| `SENTRY_ORG` | Optional | Sentry organization slug |
| `SENTRY_PROJECT` | Optional | Sentry project slug |
| `VITE_SENTRY_DSN` | Optional | Sentry DSN (injected into frontend build) |

---

## Sentry Error Tracking (Optional)

Sentry captures unhandled errors, performance traces, and session replays from both frontend and backend.

### Backend Setup

1. Add to `productiq-backend/.env`:
   ```
   SENTRY_DSN=https://your-dsn@sentry.io/123
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

2. Sentry auto-initializes on app startup. Verify with:
   ```bash
   curl https://your-domain.com/health | jq .sentry_enabled
   # Should return: true
   ```

### Frontend Setup

1. Add to `productiq-frontend/.env`:
   ```
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/456
   VITE_SENTRY_ENVIRONMENT=production
   VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

2. Rebuild the frontend: `npm run build`

### Source Maps (CI/CD)

For readable stack traces in production, upload source maps to Sentry during CI:

1. In Sentry Dashboard → Settings → Auth Tokens → Create New Token
   - Scopes: `org:read`, `project:releases`

2. Add GitHub Actions secrets:
   - `SENTRY_AUTH_TOKEN` — the auth token
   - `SENTRY_ORG` — your org slug
   - `SENTRY_PROJECT` — your project slug (e.g., `productiq-frontend`)
   - `VITE_SENTRY_DSN` — the frontend DSN

3. The CI workflow automatically uploads source maps on builds from `main` branch.

### Making a User Admin

To access the admin dashboard at `/admin`, a user needs `role='admin'` in the profiles table:

```sql
-- In Supabase Dashboard → SQL Editor:
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## Troubleshooting

### Backend won't start
- Check `SECRET_KEY` is 32+ chars and not the default
- Check `APP_ENV=production` is set
- Check Supabase URL and service key are correct
- View logs: `docker compose logs api`

### Celery worker not picking up tasks
- Check `REDIS_URL` is correct and Redis is healthy
- Check `USE_CELERY=true`
- View logs: `docker compose logs worker`
- Check Flower dashboard: `http://localhost:5555`

### Frontend can't reach API
- Check nginx is proxying `/api` to the backend service
- Check `VITE_API_URL=/api` (not a full URL when using nginx proxy)
- Check CORS: `FRONTEND_URL` in backend .env must match the frontend URL

### SSE stream disconnects
- Check nginx `proxy_read_timeout` is set to 300s (in nginx.conf)
- Check `proxy_buffering off` is set (in nginx.conf)
- Check Redis is healthy (SSE uses Redis pub/sub in production)

### Razorpay webhooks fail
- Verify webhook URL is accessible: `https://your-domain.com/api/webhooks/razorpay`
- Verify `RAZORPAY_KEY_SECRET` matches the webhook secret in Razorpay dashboard
- Test with Razorpay's webhook simulator

### Rate limiting too aggressive
- Adjust limits in `routers/reports.py` (currently 5/hour for reports)
- Or disable: remove the `Depends(rate_limit(...))` from the endpoint
