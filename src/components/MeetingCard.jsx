import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// ---------------------------------------------------------------------------
// MeetingCard
// ---------------------------------------------------------------------------
// Features:
//   - Scheduled status badge: Upcoming / Live / Closed (auto from timestamps)
//   - Lock toggle (owner only)
//   - Timezone-aware countdown (shows in visitor's local time)
//   - Passcode display (owner only)
//   - Resource/agenda attachment links
//   - JOIN MEETING click tracking (increments join_count via RPC)
// ---------------------------------------------------------------------------

// Determine computed status from timestamps + is_locked
function getStatus(meeting) {
  const { is_locked, scheduled_at, ends_at } = meeting
  const now = Date.now()

  if (is_locked) return 'locked'

  if (scheduled_at && ends_at) {
    const start = new Date(scheduled_at).getTime()
    const end = new Date(ends_at).getTime()
    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'live'
    if (now > end) return 'closed'
  }

  if (scheduled_at && !ends_at) {
    const start = new Date(scheduled_at).getTime()
    if (now < start) return 'upcoming'
  }

  return 'active' // no schedule set, not locked
}

const STATUS_CONFIG = {
  active:   { label: 'Active',    dot: 'bg-emerald-500', text: 'text-emerald-600',  badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200'  },
  live:     { label: 'Live Now',  dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  upcoming: { label: 'Upcoming',  dot: 'bg-blue-500',    text: 'text-blue-600',     badge: 'bg-blue-50 text-blue-700 ring-blue-200'           },
  closed:   { label: 'Closed',    dot: 'bg-slate-400',   text: 'text-slate-500',    badge: 'bg-slate-100 text-slate-600 ring-slate-200'       },
  locked:   { label: 'Locked',    dot: 'bg-red-500',     text: 'text-red-600',      badge: 'bg-red-50 text-red-700 ring-red-200'              },
}

// Format a UTC date string into the visitor's local timezone
function formatLocalTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
  })
}

// Return a human-readable countdown string
function getCountdown(iso) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return null

  const totalSecs = Math.floor(diff / 1000)
  const days    = Math.floor(totalSecs / 86400)
  const hours   = Math.floor((totalSecs % 86400) / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const secs    = totalSecs % 60

  if (days > 0)    return `Starts in ${days}d ${hours}h`
  if (hours > 0)   return `Starts in ${hours}h ${minutes}m`
  if (minutes > 0) return `Starts in ${minutes}m ${secs}s`
  return `Starts in ${secs}s`
}

// Detect platform from URL
function getPlatformBadge(url) {
  const lower = (url || '').toLowerCase()
  if (lower.includes('meet.google.com'))      return { label: 'Google Meet', color: 'bg-emerald-600' }
  if (lower.includes('zoom.us'))              return { label: 'Zoom',        color: 'bg-blue-600'    }
  if (lower.includes('teams.microsoft.com'))  return { label: 'MS Teams',    color: 'bg-indigo-600'  }
  if (lower.includes('webex.com'))            return { label: 'Webex',       color: 'bg-teal-600'    }
  if (lower.includes('discord.com'))          return { label: 'Discord',     color: 'bg-violet-600'  }
  return { label: 'Custom', color: 'bg-slate-600' }
}

export default function MeetingCard({
  meeting,
  isOwner,
  onToggleLock,
  onEdit,
  onDelete,
  onUnauthorized,
}) {
  const [updating, setUpdating] = useState(false)
  const [status, setStatus]     = useState(() => getStatus(meeting))
  const [countdown, setCountdown] = useState(() => getCountdown(meeting.scheduled_at))

  const { id, title, description, url, is_locked, passcode,
          scheduled_at, ends_at, resources, join_count } = meeting

  const platform     = getPlatformBadge(url)
  const statusConfig = STATUS_CONFIG[status]
  const canJoin      = status !== 'locked' && status !== 'closed'

  // -------------------------------------------------------------------------
  // Tick countdown + re-evaluate status every second
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!scheduled_at) return
    const timer = setInterval(() => {
      setStatus(getStatus(meeting))
      setCountdown(getCountdown(scheduled_at))
    }, 1000)
    return () => clearInterval(timer)
  }, [scheduled_at, ends_at, is_locked, meeting])

  // -------------------------------------------------------------------------
  // JOIN MEETING
  // -------------------------------------------------------------------------
  const handleJoin = async () => {
    if (!canJoin) return
    // Fire-and-forget click tracking via security-definer RPC
    supabase.rpc('increment_join_count', { meeting_id: id }).then(() => {})
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // -------------------------------------------------------------------------
  // Lock toggle
  // -------------------------------------------------------------------------
  const handleToggleLock = async () => {
    if (!isOwner) { onUnauthorized(); return }
    setUpdating(true)
    try {
      await onToggleLock(id, is_locked)
    } finally {
      setUpdating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Edit / Delete
  // -------------------------------------------------------------------------
  const handleEdit   = () => { if (!isOwner) { onUnauthorized(); return } onEdit(meeting) }
  const handleDelete = () => { if (!isOwner) { onUnauthorized(); return } onDelete(id) }

  return (
    <div className={`group relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
      status === 'locked' ? 'border-red-200' :
      status === 'live'   ? 'border-emerald-300' :
      status === 'closed' ? 'border-slate-200 opacity-75' : 'border-slate-200'
    }`}>

      {/* Top row: platform badge + status badge */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white ${platform.color}`}>
          {platform.label}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusConfig.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">{description}</p>
      )}

      {/* Schedule info + countdown */}
      {scheduled_at && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatLocalTime(scheduled_at)}</span>
          </div>
          {ends_at && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/>
              </svg>
              <span>Until {formatLocalTime(ends_at)}</span>
            </div>
          )}
          {countdown && status === 'upcoming' && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/>
              </svg>
              {countdown}
            </div>
          )}
        </div>
      )}

      {/* Resource / Agenda links */}
      {Array.isArray(resources) && resources.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Resources</p>
          <div className="flex flex-wrap gap-1.5">
            {resources.map((r, i) => (
              r.url ? (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition ring-1 ring-inset ring-slate-200"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {r.label || 'Resource'}
                </a>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Passcode (owner only) */}
      {isOwner && passcode && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-inset ring-amber-200">
          <svg className="h-3.5 w-3.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="text-xs text-amber-700">Passcode: <span className="font-mono font-bold">{passcode}</span></span>
        </div>
      )}

      {/* Join count (owner only) */}
      {isOwner && typeof join_count === 'number' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {join_count} {join_count === 1 ? 'join' : 'joins'}
        </div>
      )}

      <div className="flex-1" />

      {/* Lock toggle + owner actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleLock}
            disabled={updating}
            aria-label={is_locked ? 'Unlock meeting' : 'Lock meeting'}
            aria-pressed={is_locked}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-executive-500 focus:ring-offset-2 ${
              is_locked ? 'bg-red-500' : 'bg-emerald-500'
            } ${updating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
              is_locked ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`} />
          </button>
          <span className="text-xs font-medium text-slate-600">
            {updating ? 'Updating...' : is_locked ? 'Locked' : 'Unlocked'}
          </span>
        </div>

        {isOwner && (
          <div className="flex items-center gap-1.5">
            <button onClick={handleEdit} aria-label="Edit meeting"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={handleDelete} aria-label="Delete meeting"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* JOIN MEETING button */}
      <button
        onClick={handleJoin}
        disabled={!canJoin}
        className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          !canJoin
            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
            : status === 'live'
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            : 'bg-executive-600 text-white hover:bg-executive-700 shadow-sm hover:shadow-md'
        }`}
      >
        {status === 'locked' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="11" width="16" height="10" rx="2"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 018 0v3"/>
            </svg>
            LOCKED / Session Closed
          </span>
        ) : status === 'closed' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Session Ended
          </span>
        ) : status === 'upcoming' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/>
            </svg>
            Not Started Yet
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            {status === 'live' ? 'JOIN — Live Now' : 'JOIN MEETING'}
          </span>
        )}
      </button>
    </div>
  )
}
