import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
  } catch (e) {
    return dateString
  }
}

export function formatINR(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

/** Returns a hex color matching the sentiment score (-1 to +1) */
export function sentimentColor(score: number): string {
  if (score >= 0.3) return '#22C55E'
  if (score >= 0)   return '#84CC16'
  if (score >= -0.3) return '#F59E0B'
  return '#EF4444'
}

/** Returns a human-readable label for a sentiment score */
export function sentimentLabel(score: number): string {
  if (score >= 0.5)  return 'Very positive'
  if (score >= 0.2)  return 'Positive'
  if (score >= -0.1) return 'Neutral'
  if (score >= -0.4) return 'Negative'
  return 'Very negative'
}

/** Returns velocity badge class strings */
export function velocityBadgeVariant(velocity: string | null): {
  bg: string; text: string; label: string
} {
  switch (velocity) {
    case 'rising':
      return { bg: '#dcfce7', text: '#16A34A', label: 'Rising' }
    case 'declining':
      return { bg: '#fee2e2', text: '#EF4444', label: 'Declining' }
    default:
      return { bg: 'rgba(0,0,0,0.07)', text: '#A3A3A3', label: 'Stable' }
  }
}

/** Deterministic avatar background color from a name string */
export function generateAvatarColor(name: string): string {
  const colors = [
    '#0A0A0A', '#C8F04A', '#22C55E', '#F59E0B',
    '#0EA5E9', '#8B5CF6', '#EF4444', '#14B8A6',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
