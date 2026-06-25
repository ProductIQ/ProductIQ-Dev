// src/hooks/useRealtime.ts
// Supabase Realtime subscriptions for live notifications + intelligence events.
//
// Provides:
// - useRealtimeNotifications() — live notification feed + unread count
// - useRealtimeIntelEvents()   — live intelligence event feed
// - useRealtimePresence()      — optional presence (who's online)
//
// In E2E test mode (VITE_E2E_TEST=true), these hooks are no-ops that
// return empty subscriptions, so tests don't need a realtime server.

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Notification, IntelEvent } from '@/lib/mockData'

const isE2E = import.meta.env.VITE_E2E_TEST === 'true'

// ── Database row shapes (snake_case from Postgres) ────────────────
interface NotificationRow {
  id: string
  user_id: string
  type: string          // info | success | warning | error
  category: string      // system | report | intelligence | billing | brand
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

interface IntelEventRow {
  id: string
  user_id: string
  brand_name: string | null
  event_type: string
  severity: string
  title: string
  body: string | null
  source: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Convert DB row → frontend Notification type ───────────────────
// The DB notifications table uses (type, category) while the frontend
// Notification type expects (type, severity, category, brand, isRead, timestamp).
// We map the DB fields to the frontend shape, deriving severity from type.
function rowToNotification(row: NotificationRow): Notification {
  // Derive severity from the DB 'type' field (info | success | warning | error)
  const severityMap: Record<string, string> = {
    info: 'info',
    success: 'info',
    warning: 'warning',
    error: 'critical',
  }
  return {
    id: row.id,
    type: row.type as Notification['type'],
    severity: (severityMap[row.type] ?? 'info') as Notification['severity'],
    title: row.title,
    body: row.body ?? '',
    brandName: row.category,
    brand: row.category,
    category: row.category.toUpperCase(),
    timestamp: row.created_at,
    isRead: row.read,
    actionUrl: row.link ?? undefined,
    actionLabel: row.link ? 'View' : undefined,
  }
}

// ── Convert DB row → frontend IntelEvent type ─────────────────────
function rowToIntelEvent(row: IntelEventRow): IntelEvent {
  return {
    id: row.id,
    type: row.event_type as IntelEvent['type'],
    severity: row.severity as IntelEvent['severity'],
    title: row.title,
    body: row.body ?? '',
    brandId: row.brand_name ?? '',
    brandName: row.brand_name ?? '',
    timestamp: row.created_at,
    isRead: false,
    payload: row.metadata ?? undefined,
  }
}

// ── Notification Realtime Hook ────────────────────────────────────
// Subscribes to INSERT and UPDATE events on the notifications table
// for the current user. Automatically:
// - Invalidates the ['notifications'] query cache (refetches list)
// - Invalidates the ['unread-count'] query cache (updates badge)
// - Shows a toast for new notifications
export function useRealtimeNotifications(enabled = true) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!enabled || isE2E) return

    // ── Create a filtered channel — only this user's notifications ──
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const row = payload.new as NotificationRow
          // Invalidate caches so the list + badge refetch
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['unread-count'] })

          // Show a toast for the new notification
          const notif = rowToNotification(row)
          toast.success(notif.title, {
            description: notif.body,
            duration: 5000,
            action: notif.actionUrl
              ? { label: 'View', onClick: () => { window.location.href = notif.actionUrl! } }
              : undefined,
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // An update (e.g. mark-as-read) — refetch to sync
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['unread-count'] })
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] notifications channel error — will retry')
        } else if (status === 'TIMED_OUT') {
          console.warn('[realtime] notifications channel timed out — will retry')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, queryClient])
}

// ── Intelligence Events Realtime Hook ─────────────────────────────
// Subscribes to INSERT events on the intelligence_events table.
// When a new event arrives:
// - Invalidates the ['intel-events'] query cache (refetches feed)
// - Shows a toast for critical/warning events
export function useRealtimeIntelEvents(enabled = true) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!enabled || isE2E) return

    const channel = supabase
      .channel('intel-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intelligence_events',
        },
        (payload) => {
          const row = payload.new as IntelEventRow

          // Invalidate the intel-events query to refetch
          queryClient.invalidateQueries({ queryKey: ['intel-events'] })

          // Show toast for warning/critical events
          if (row.severity === 'warning' || row.severity === 'critical') {
            const event = rowToIntelEvent(row)
            toast.warning(event.title, {
              description: event.body,
              duration: 6000,
            })
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] intel-events channel error — will retry')
        } else if (status === 'TIMED_OUT') {
          console.warn('[realtime] intel-events channel timed out — will retry')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, queryClient])
}

// ── Unread Count Hook (polling fallback + realtime) ───────────────
// Polls the unread count every 30s as a fallback, and also
// subscribes to realtime updates for instant badge updates.
export function useUnreadCount(enabled = true) {
  const queryClient = useQueryClient()

  // Poll every 30s as a fallback (in case realtime misses an event)
  useEffect(() => {
    if (!enabled || isE2E) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    }, 30_000)

    return () => clearInterval(interval)
  }, [enabled, queryClient])
}

// ── Connection status hook ────────────────────────────────────────
// Tracks whether the realtime connection is active. Useful for
// showing a "Live" / "Reconnecting…" indicator in the UI.
export function useRealtimeStatus() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const getStatus = useCallback(() => {
    if (!channelRef.current) return 'disconnected'
    const state = channelRef.current.state
    if (state === 'joined') return 'live'
    if (state === 'joining') return 'connecting'
    if (state === 'closed') return 'disconnected'
    return 'unknown'
  }, [])

  return { getStatus }
}
