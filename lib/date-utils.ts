/**
 * Formats a date string (YYYY-MM-DD) to display in local timezone
 */
export function formatLocalDate(dateString: string): string {
  // Parse date as local time, not UTC
  const [year, month, day] = dateString.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("es-AR")
}

/**
 * Gets today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Compares two date strings chronologically
 */
export function compareDates(dateA: string, dateB: string): number {
  const [yearA, monthA, dayA] = dateA.split("-").map(Number)
  const [yearB, monthB, dayB] = dateB.split("-").map(Number)

  const dateObjA = new Date(yearA, monthA - 1, dayA)
  const dateObjB = new Date(yearB, monthB - 1, dayB)

  return dateObjB.getTime() - dateObjA.getTime()
}
