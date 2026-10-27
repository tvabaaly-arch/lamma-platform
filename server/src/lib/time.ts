/** Saudi Arabia is UTC+3 all year (no daylight saving). */
const RIYADH_OFFSET_H = 3

/** Timestamp (ms) of a wall-clock hour on a YYYY-MM-DD date in Riyadh. */
export function riyadhTime(dateIso: string, hour: number) {
  const [y, m, d] = dateIso.split('-').map(Number)
  return Date.UTC(y, m - 1, d, hour - RIYADH_OFFSET_H)
}

/** Today's date in Riyadh as YYYY-MM-DD. */
export function riyadhToday(now = Date.now()) {
  return new Date(now + RIYADH_OFFSET_H * 3600e3).toISOString().slice(0, 10)
}

export function addDays(dateIso: string, n: number) {
  const t = Date.parse(dateIso + 'T00:00:00Z') + n * 86400e3
  return new Date(t).toISOString().slice(0, 10)
}
