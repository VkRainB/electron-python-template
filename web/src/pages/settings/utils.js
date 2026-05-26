export function formatTime(date) {
  if (!(date instanceof Date)) return '-'
  const pad = (n) => n.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatLatency(ms) {
  if (!Number.isFinite(ms)) return '-'
  return `${Math.round(ms)}ms`
}
