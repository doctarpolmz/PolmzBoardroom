import { useState } from 'react'

// ---------------------------------------------------------------------------
// MeetingCard
// ---------------------------------------------------------------------------
// Renders a single meeting entry inside the dashboard card grid.
//
// Key behaviours:
//   - JOIN MEETING: Opens url in a new tab when is_locked === false. When
//     is_locked === true the button becomes a greyed-out "LOCKED / Session
//     Closed" element that cancels navigation.
//   - LOCK / UNLOCK toggle: Bound to a database update mutation. Only the
//     authenticated owner can flip it. Non-owners who click are intercepted.
//   - Edit / Delete: Visible only to the owner; non-owners are intercepted.
// ---------------------------------------------------------------------------

export default function MeetingCard({
  meeting,
  isOwner,
  onToggleLock,
  onEdit,
  onDelete,
  onUnauthorized,
}) {
  const [updating, setUpdating] = useState(false)
  const [imgError, setImgError] = useState(false)

  const { id, title, description, url, is_locked } = meeting

  // -------------------------------------------------------------------------
  // Detect the meeting platform for a visual badge
  // -------------------------------------------------------------------------
  const getPlatformBadge = () => {
    const lower = (url || '').toLowerCase()
    if (lower.includes('meet.google.com')) return { label: 'Google Meet', color: 'bg-emerald-600' }
    if (lower.includes('zoom.us')) return { label: 'Zoom', color: 'bg-blue-600' }
    if (lower.includes('teams.microsoft.com')) return { label: 'MS Teams', color: 'bg-indigo-600' }
    if (lower.includes('webex.com')) return { label: 'Webex', color: 'bg-teal-600' }
    if (lower.includes('discord.com')) return { label: 'Discord', color: 'bg-violet-600' }
    return { label: 'Custom', color: 'bg-slate-600' }
  }

  const platform = getPlatformBadge()

  // -------------------------------------------------------------------------
  // JOIN MEETING action
  // -------------------------------------------------------------------------
  const handleJoin = () => {
    if (is_locked) return // cancel navigation for locked meetings
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // -------------------------------------------------------------------------
  // LOCK / UNLOCK toggle — ownership-checked
  // -------------------------------------------------------------------------
  const handleToggleLock = async () => {
    if (!isOwner) {
      onUnauthorized()
      return
    }
    setUpdating(true)
    try {
      await onToggleLock(id, is_locked)
    } finally {
      setUpdating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Edit / Delete — ownership-checked
  // -------------------------------------------------------------------------
  const handleEdit = () => {
    if (!isOwner) {
      onUnauthorized()
      return
    }
    onEdit(meeting)
  }

  const handleDelete = () => {
    if (!isOwner) {
      onUnauthorized()
      return
    }
    onDelete(id)
  }

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        is_locked ? 'border-slate-300' : 'border-slate-200'
      }`}
    >
      {/* Top row: platform badge + status indicator */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white ${platform.color}`}
        >
          {platform.label}
        </span>

        <div className="flex items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              is_locked ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          />
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${
              is_locked ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {is_locked ? 'Locked' : 'Active'}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">
          {description}
        </p>
      )}

      {/* Spacer to push controls to the bottom */}
      <div className="flex-1" />

      {/* Lock toggle + Owner actions */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        {/* Lock toggle switch */}
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
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                is_locked ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-xs font-medium text-slate-600">
            {updating ? 'Updating...' : is_locked ? 'Locked' : 'Unlocked'}
          </span>
        </div>

        {/* Owner-only edit / delete */}
        {isOwner && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleEdit}
              aria-label="Edit meeting"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              aria-label="Delete meeting"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            >
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
        disabled={is_locked}
        className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
          is_locked
            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
            : 'bg-executive-600 text-white hover:bg-executive-700 shadow-sm hover:shadow-md'
        }`}
      >
        {is_locked ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 018 0v3" />
            </svg>
            LOCKED / Session Closed
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            JOIN MEETING
          </span>
        )}
      </button>
    </div>
  )
}
