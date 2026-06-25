import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// Vendor chunk splitting configuration
// Groups heavy dependencies into separate chunks for better browser caching
const vendorChunks: Record<string, string[]> = {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'motion': ['motion'],
  'charts': ['recharts'],
  'query': ['@tanstack/react-query'],
  'supabase': ['@supabase/supabase-js'],
  'axios': ['axios'],
  'ui-primitives': ['radix-ui', 'bits-ui', 'lucide-react'],
  'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
  'date-fns': ['date-fns'],
  'ogl': ['ogl'],
  'confetti': ['canvas-confetti'],
  'zustand': ['zustand'],
  'sonner': ['sonner'],
  'sentry': ['@sentry/react'],
}

// Sentry Vite plugin is only enabled when SENTRY_AUTH_TOKEN is set
// (i.e., in CI/production builds). Local dev doesn't need source map uploads.
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN

export default defineConfig({
  plugins: [
    react(),
    // Sentry Vite plugin — uploads source maps to Sentry during build
    ...(hasSentryToken
      ? [sentryVitePlugin({
          org: process.env.SENTRY_ORG || 'productiq',
          project: process.env.SENTRY_PROJECT || 'productiq-frontend',
          // Only upload source maps in production builds
          sourcemaps: {
            filesToDeleteAfterUpload: ['**/*.js.map'],
          },
          // Disable in development
          disable: process.env.NODE_ENV !== 'production',
        })]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Generate source maps for Sentry (hidden in production — not downloadable by users)
    sourcemap: hasSentryToken ? 'hidden' : false,
    rollupOptions: {
      output: {
        // Rolldown/Vite 8 requires manualChunks as a function
        manualChunks(id: string) {
          // Only process node_modules (not our own source code)
          if (!id.includes('node_modules')) return undefined

          // Check each vendor group — return the chunk name if matched
          for (const [chunkName, packages] of Object.entries(vendorChunks)) {
            for (const pkg of packages) {
              // Match the package path in node_modules
              // e.g. /node_modules/react/ or /node_modules/react-dom/
              if (id.includes(`node_modules/${pkg}/`) || id.includes(`node_modules/${pkg}/`)) {
                return chunkName
              }
            }
          }

          // Remaining node_modules go into a generic 'vendor' chunk
          return 'vendor'
        },
      },
    },
    // Individual route chunks will be small; vendor chunks (react + charts) may exceed 500KB
    chunkSizeWarningLimit: 600,
  },
})
