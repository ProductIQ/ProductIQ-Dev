// src/lib/supabase.ts
// ════════════════════════════════════════════════════════════════
// MOCK SUPABASE CLIENT — swap for real client when Supabase is ready
// ════════════════════════════════════════════════════════════════

export const MOCK_MODE = true

// Stub for Supabase type compatibility when real client is added
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_callback: (event: string, session: unknown) => void) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async (_opts: { email: string; password: string }) => ({
      data: { user: null, session: null },
      error: null,
    }),
    signUp: async (_opts: { email: string; password: string; options?: unknown }) => ({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: async () => ({ error: null }),
  },
  from: (_table: string) => ({
    select: (_cols: string) => ({
      eq: (_col: string, _val: unknown) => ({
        data: [] as never[],
        error: null,
        then: (cb: (v: { data: never[]; error: null }) => unknown) =>
          Promise.resolve({ data: [] as never[], error: null }).then(cb),
        single: async () => ({ data: null, error: null }),
        limit: (_n: number) => Promise.resolve({ data: [] as never[], error: null }),
        order: (_col: string, _opts?: unknown) => Promise.resolve({ data: [] as never[], error: null }),
      }),
      order: (_col: string, _opts?: unknown) => ({
        data: [] as never[],
        error: null,
        then: (cb: (v: { data: never[]; error: null }) => unknown) =>
          Promise.resolve({ data: [] as never[], error: null }).then(cb),
      }),
    }),
    insert: (_rows: unknown) => Promise.resolve({ data: null, error: null }),
    update: (_rows: unknown) => ({
      eq: (_col: string, _val: unknown) => Promise.resolve({ data: null, error: null }),
    }),
  }),
  channel: (_name: string) => ({
    on: (_event: string, _opts: unknown, _callback: unknown) => ({
      subscribe: (_cb?: unknown) => ({ unsubscribe: () => {} }),
    }),
  }),
} as const
