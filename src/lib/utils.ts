export function getDaysRemaining(tripEndDate: string | null, isLocal: boolean): string {
  if (isLocal) return 'Local'
  if (!tripEndDate) return ''
  const end = new Date(tripEndDate)
  const today = new Date()
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'Last day'
  if (diff === 1) return '1 more day'
  return `${diff} more days`
}

export function computeAffinity(profileInterests: string[], viewerInterests: string[]): number {
  if (!viewerInterests.length) return 0
  const matches = profileInterests.filter(i => viewerInterests.includes(i)).length
  return Math.round((matches / viewerInterests.length) * 100)
}

export function formatPlanTime(scheduledAt: string): string {
  const date = new Date(scheduledAt)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  if (date.toDateString() === today.toDateString()) {
    return `Today · ${timeStr}`
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow · ${timeStr}`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${timeStr}`
  }
}
