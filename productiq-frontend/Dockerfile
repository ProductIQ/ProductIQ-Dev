# ──────────────────────────────────────────────────────────────────────────────
# ProductIQ Frontend — Production Dockerfile (multi-stage)
#
# Stage 1: builder — Node 20, installs deps, builds Vite static assets
# Stage 2: runtime — nginx serves static files, proxies /api to backend
#
# Image size: ~50 MB (nginx + static files only)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copy lockfile first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build-time env vars (VITE_ prefixed, embedded at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=/api
ARG VITE_RAZORPAY_KEY_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID

RUN npm run build

# ── Stage 2: Runtime (nginx) ──────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
