import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Base ──────────────────────────────────────────────
        base:    '#F0F2F5',
        canvas:  '#E8EAED',
        // ── Ink ───────────────────────────────────────────────
        ink: {
          DEFAULT:   '#0A0A0A',
          secondary: '#6B6B6B',
          tertiary:  '#A3A3A3',
          inverse:   '#FFFFFF',
        },
        // ── Accent (Acid Lime) ─────────────────────────────────
        accent: {
          DEFAULT: '#C8F04A',
          dark:    '#A8D030',
          light:   '#DAFB72',
        },
        // ── Dark Surface ───────────────────────────────────────
        dark: {
          DEFAULT: '#0F0F0F',
          surface: '#1A1A1A',
          border:  '#2A2A2A',
          muted:   '#3A3A3A',
        },
        // ── Semantic ──────────────────────────────────────────
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
      },
      fontFamily: {
        sans:  ['"General Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        pill:  '9999px',
        card:  '24px',
        'card-lg': '32px',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'progress-bar': {
          '0%':   { width: '0%' },
          '100%': { width: '100%' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        marquee:          'marquee 28s linear infinite',
        'fade-up':        'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in':       'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer:          'shimmer 2s linear infinite',
        pulse:            'pulse 2s ease-in-out infinite',
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        'inner-border': 'inset 0 0 0 1px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
