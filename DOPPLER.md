# Doppler Setup Guide — ProductIQ

Doppler is the **secret manager** for ProductIQ. It replaces `.env` files in staging and production environments. Secrets are stored in Doppler, and the Doppler CLI/SDK injects them as environment variables at runtime.

## Why Doppler?

| Problem | Doppler Solution |
|---|---|
| Secrets scattered across `.env` files | Single source of truth in Doppler dashboard |
| Secrets committed to git by accident | No `.env` files needed in production |
| Sharing secrets with team | Grant access via Doppler dashboard, no Slack messages |
| Rotating keys without redeployment | Update in Doppler → auto-synced to all services |
| Different values per environment | Dev / Staging / Production configs in one place |

---

## Step 1: Install Doppler CLI

```bash
# Windows (via PowerShell — run as Administrator)
winget install Doppler.doppler

# macOS
brew install dopplerhq/cli/doppler

# Linux
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh
```

Verify: `doppler --version`

---

## Step 2: Login

```bash
doppler login
```

This opens a browser window. Log in with your Doppler account (create one free at [doppler.com](https://doppler.com)).

---

## Step 3: Create the Project in Doppler Dashboard

1. Go to [dashboard.doppler.com](https://dashboard.doppler.com)
2. Click **"Create Project"** → name it `productiq`
3. Doppler auto-creates three configs:
   - `dev` → development (your local machine)
   - `stg` → staging
   - `prd` → production

---

## Step 4: Add Secrets to Doppler

In the Doppler dashboard (`productiq` project → `dev` config), add all secrets from your `.env` file:

```bash
# Option A: Import from existing .env file (easiest)
doppler secrets upload .env

# Option B: Set individual secrets
doppler secrets set SUPABASE_URL=https://xxx.supabase.co
doppler secrets set SUPABASE_SERVICE_KEY=eyJh...
doppler secrets set GEMINI_API_KEY=AIza...
# ... (add all keys from .env.example)
```

---

## Step 5: Link This Repo to Doppler

```bash
# Run once at the monorepo root (ProductIQ/)
doppler setup
# Select project: productiq
# Select config: dev (for local dev)
```

This creates/updates `.doppler.yaml` at the root.

---

## Step 6: Run Services with Doppler

### Development (local)
```bash
# Backend
cd productiq-backend
doppler run -- uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd productiq-frontend
doppler run -- npm run dev

# Celery worker (new terminal)
cd productiq-backend
doppler run -- celery -A celery_app worker --loglevel=info -Q pipeline,monitoring,default
```

### Docker Compose
```bash
# At monorepo root
doppler run -- docker compose up -d
```

> **Note**: When using Doppler, you **do NOT need a `.env` file** — Doppler injects all secrets directly as environment variables. The `.env` file at the root is only for local development without Doppler.

---

## Environments (Configs)

| Doppler Config | Use Case | `APP_ENV` value |
|---|---|---|
| `dev` | Local development | `development` |
| `stg` | Staging / QA server | `staging` |
| `prd` | Production deployment | `production` |

Switch configs: `doppler setup` and select a different config.

---

## CI/CD Integration (GitHub Actions)

1. In Doppler Dashboard → `productiq` → `ci` config (create it)
2. Generate a **Service Token**: Settings → Service Tokens → Generate
3. Add to GitHub Secrets: `DOPPLER_TOKEN`
4. In your workflow:

```yaml
# .github/workflows/ci.yml
- name: Inject secrets from Doppler
  uses: dopplerhq/secrets-fetch-action@v1
  with:
    doppler-token: ${{ secrets.DOPPLER_TOKEN }}
    doppler-project: productiq
    doppler-config: ci
    inject-env-vars: true

- name: Build frontend
  run: npm run build
  working-directory: productiq-frontend
```

---

## Railway / Fly.io Deployment

Instead of setting env vars manually in Railway or Fly.io dashboards, use Doppler sync:

### Railway
1. Doppler Dashboard → `productiq` → `prd` → Integrations → **Railway**
2. Connect your Railway project
3. Secrets auto-sync on every change ✅

### Fly.io
```bash
# Export secrets from Doppler and set in Fly.io
doppler secrets download --config prd --no-file --format env | \
  fly secrets import --app productiq-api
```

---

## Rotating a Secret

1. Update the secret in Doppler Dashboard (or `doppler secrets set KEY=new_value --config prd`)
2. **Local**: restart your server (Doppler injects on startup)
3. **Railway/Fly.io**: with Doppler sync enabled, it redeploys automatically
4. **Docker**: `doppler run -- docker compose restart api worker beat`

---

## Variable Reference

All variables are documented in [`.env.example`](file:///d:/Projects/ProductIQ/.env.example) at the monorepo root. Each Doppler config (`dev`/`stg`/`prd`) should have all the same keys — only the **values** differ per environment.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `doppler: command not found` | Reinstall CLI, restart terminal |
| `Error: project not found` | Run `doppler setup` in the repo root |
| Frontend doesn't pick up VITE_ vars | Vite reads from process env; make sure `doppler run -- npm run dev` is used |
| Backend ignores Doppler secrets | Pydantic-settings reads `.env` file first, then env vars. Remove or rename `.env` when using Doppler |
| Docker secrets not injected | Use `doppler run -- docker compose up` not just `docker compose up` |
