export function rupees(paise: number): string {
  const r = paise / 100
  return `₹${r.toLocaleString('en-IN', {
    minimumFractionDigits: r % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

export function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

/** "3 months ago". Staleness is information — a meter last touched in 2019
 *  is telling you something the status field is not. */
export function since(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years > 1 ? 's' : ''} ago`
}
