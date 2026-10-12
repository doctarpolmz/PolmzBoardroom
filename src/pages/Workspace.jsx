import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import MeetingCard from '../components/MeetingCard'
import MeetingForm from '../components/MeetingForm'
import ConfirmDialog from '../components/ConfirmDialog'
import AuthGuardModal from '../components/AuthGuardModal'
import Spinner from '../components/Spinner'

// ---------------------------------------------------------------------------
// Workspace — public/owner view at /workspace/:username
// ---------------------------------------------------------------------------
// This is the core of the security mandate. The component:
//   1. Parses the username from the URL.
//   2. Fetches that profile to resolve the user_id.
//   3. Queries meetings strictly filtered by that user_id — so shared links
//      render ONLY that creator's board items, no cross-contamination.
//   4. Determines whether the current viewer is the owner. If yes, full edit
//      controls are enabled. If not, lock toggles / edit / delete trigger the
//      AuthGuardModal.
// ---------------------------------------------------------------------------

export default function Workspace() {
  const { username } = useParams()
  const { user, loading: authLoading } = useAuth()

  const [workspaceProfile, setWorkspaceProfile] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [guardOpen, setGuardOpen] = useState(false)
  const [toast, setToast] = useState(null)

  // -------------------------------------------------------------------------
  // Determine ownership: the logged-in user's profile id must match the
  // workspace profile's id.
  // -------------------------------------------------------------------------
  const isOwner = !!(user && workspaceProfile && user.id === workspaceProfile.id)

  // -------------------------------------------------------------------------
  // Fetch workspace profile by username
  // -------------------------------------------------------------------------
  const fetchWorkspaceProfile = useCallback(async (uname) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', uname)
      .single()

    if (error || !data) {
      setNotFound(true)
      setWorkspaceProfile(null)
      return null
    }

    setNotFound(false)
    setWorkspaceProfile(data)
    return data
  }, [])

  // -------------------------------------------------------------------------
  // Fetch meetings strictly filtered by the workspace owner's user_id
  // -------------------------------------------------------------------------
  const fetchMeetings = useCallback(async (ownerId) => {
    if (!ownerId) {
      setMeetings([])
      return
    }
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Workspace] Error fetching meetings:', error.message)
      showToast('Failed to load meetings.', 'error')
    } else {
      setMeetings(data || [])
    }
  }, [])

  // -------------------------------------------------------------------------
  // Fetch notices for the workspace
  // -------------------------------------------------------------------------
  const fetchNotices = useCallback(async (ownerId) => {
    if (!ownerId) {
      setNotices([])
      return
    }
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Workspace] Error fetching notices:', error.message)
    } else {
      setNotices(data || [])
    }
  }, [])

  // -------------------------------------------------------------------------
  // Initial load: fetch profile + meetings + notices
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!username) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const profileData = await fetchWorkspaceProfile(username)
      if (cancelled) return
      if (profileData) {
        await Promise.all([
          fetchMeetings(profileData.id),
          fetchNotices(profileData.id),
        ])
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [username, fetchWorkspaceProfile, fetchMeetings, fetchNotices])

  // -------------------------------------------------------------------------
  // Toast helper
  // -------------------------------------------------------------------------
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // -------------------------------------------------------------------------
  // Unauthorized action → open the AuthGuardModal
  // -------------------------------------------------------------------------
  const handleUnauthorized = () => {
    setGuardOpen(true)
  }

  // -------------------------------------------------------------------------
  // Lock toggle (only fires for owner; non-owners are intercepted by the card)
  // -------------------------------------------------------------------------
  const handleToggleLock = async (meetingId, currentValue) => {
    const { error } = await supabase
      .from('meetings')
      .update({ is_locked: !currentValue })
      .eq('id', meetingId)

    if (error) {
      showToast('Failed to toggle lock.', 'error')
    } else {
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, is_locked: !currentValue } : m
        )
      )
    }
  }

  // -------------------------------------------------------------------------
  // Create / Edit / Delete (owner only)
  // -------------------------------------------------------------------------
  const handleOpenCreate = () => {
    if (!isOwner) {
      handleUnauthorized()
      return
    }
    setEditingMeeting(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (meeting) => {
    if (!isOwner) {
      handleUnauthorized()
      return
    }
    setEditingMeeting(meeting)
    setFormOpen(true)
  }

  const handleSaveMeeting = async (formData) => {
    if (!isOwner) {
      handleUnauthorized()
      return
    }
    if (editingMeeting) {
      const { error } = await supabase
        .from('meetings')
        .update({
          title: formData.title,
          description: formData.description,
          url: formData.url,
        })
        .eq('id', editingMeeting.id)

      if (error) {
        showToast('Failed to update meeting.', 'error')
      } else {
        showToast('Meeting updated successfully.')
        setFormOpen(false)
        setEditingMeeting(null)
        fetchMeetings(workspaceProfile.id)
      }
    } else {
      const { error } = await supabase
        .from('meetings')
        .insert({
          user_id: workspaceProfile.id,
          title: formData.title,
          description: formData.description,
          url: formData.url,
        })

      if (error) {
        showToast('Failed to create meeting.', 'error')
      } else {
        showToast('Meeting created successfully.')
        setFormOpen(false)
        fetchMeetings(workspaceProfile.id)
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    if (!isOwner) {
      handleUnauthorized()
      setDeleteId(null)
      return
    }
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', deleteId)

    if (error) {
      showToast('Failed to delete meeting.', 'error')
    } else {
      showToast('Meeting deleted.')
      setMeetings((prev) => prev.filter((m) => m.id !== deleteId))
    }
    setDeleteId(null)
  }

  // -------------------------------------------------------------------------
  // Render: not found
  // -------------------------------------------------------------------------
  if (!loading && notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Workspace not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            The workspace <span className="font-mono text-slate-300">@{username}</span> doesn&rsquo;t exist.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-executive-600 px-6 py-3 text-sm font-semibold text-white hover:bg-executive-700 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Spinner label="Loading workspace..." />
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: workspace
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Workspace header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-executive-600/20 ring-1 ring-executive-600/30 text-xl font-bold text-executive-400">
              {workspaceProfile?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                @{workspaceProfile?.username}&rsquo;s Boardroom
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">
                {isOwner
                  ? 'This is your workspace — full edit access.'
                  : 'Click a meeting to join. Locked sessions are closed.'}
              </p>
            </div>
          </div>

          {/* New Meeting button (owner only) */}
          {isOwner && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-executive-600 px-5 py-3 text-sm font-semibold text-white hover:bg-executive-700 transition shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Meeting
            </button>
          )}
        </div>

        {/* Owner banner for own workspace */}
        {isOwner && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-executive-800 bg-executive-900/20 px-4 py-2.5 text-sm text-executive-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            You are viewing your own workspace. Edit, lock, and delete freely.
          </div>
        )}

        {/* Notice board — visible to everyone, shows all notices */}
        {notices.length > 0 && (
          <div className="mt-4 space-y-2">
            {notices.map((notice) => (
              <div key={notice.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-executive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.33a1.618 1.618 0 01-2.482 1.366L5.5 19.5l3.018-1.047A1.618 1.618 0 0111 19.33V5.882zM19 5.882V19.33a1.618 1.618 0 002.482 1.366L24.5 19.5l-3.018 1.047A1.618 1.618 0 0119 19.33V5.882z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 6l8-2v2l-8 2" />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Notice
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                  {notice.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Meetings grid */}
        <div className="mt-8">
          {meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-200">
                {isOwner ? 'No meetings yet' : 'No active meetings'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {isOwner
                  ? 'Click "New Meeting" to add your first meeting link.'
                  : 'This workspace has no published meetings at the moment.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  isOwner={isOwner}
                  onToggleLock={handleToggleLock}
                  onEdit={handleOpenEdit}
                  onDelete={(id) => {
                    if (!isOwner) {
                      handleUnauthorized()
                      return
                    }
                    setDeleteId(id)
                  }}
                  onUnauthorized={handleUnauthorized}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MeetingForm
        open={formOpen}
        meeting={editingMeeting}
        onSave={handleSaveMeeting}
        onClose={() => {
          setFormOpen(false)
          setEditingMeeting(null)
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this meeting?"
        message="This action cannot be undone. The meeting link will be permanently removed from your workspace."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <AuthGuardModal open={guardOpen} onClose={() => setGuardOpen(false)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
          <div
            className={`rounded-lg px-5 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
