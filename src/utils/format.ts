/**
 * Shared formatting utilities to avoid duplicated logic across components.
 */

// Currency formatter for VND
const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

const vndCompactFormatter = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatVND(amount: number): string {
  return vndFormatter.format(amount)
}

export function formatVNDCompact(amount: number): string {
  return vndCompactFormatter.format(amount)
}

/**
 * Parse a date string 'YYYY-MM-DD' without timezone shift.
 * Using `new Date(str)` interprets as UTC, which can shift the day.
 */
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Format a Date to 'YYYY-MM-DD' string.
 */
export function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Format duration in minutes to a human-readable string.
 */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs > 0 && mins === 0) return `${hrs}h`
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}
