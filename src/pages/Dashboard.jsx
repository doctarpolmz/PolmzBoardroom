import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import MeetingCard from '../components/MeetingCard'
import MeetingForm from '../components/MeetingForm'
import ConfirmDialog from '../components/ConfirmDialog'
import Spinner from '../components/Spinner'

// ---------------------------------------------------------------------------
// Dashboard (owner-only)
// ---------------------------------------------------------------------------
// The authenticated owner's meeting management hub. Supports create, edit,
// delete, and lock/unlock — all gated by the ProtectedRoute wrapper and RLS.
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user, profile } = useAuth()

  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [toast, setToast] = useState(null)

  // -------------------------------------------------------------------------
  // Fetch meetings belonging to the current user
  // -------------------------------------------------------------------------
  const fetchMeetings = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Dashboard] Error fetching meetings:', error.message)
      showToast('Failed to load meetings.', 'error')
    } else {
      setMeetings(data || [])
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // -------------------------------------------------------------------------
  // Toast helper
  // -------------------------------------------------------------------------
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // -------------------------------------------------------------------------
  // Create / Edit meeting
  // -------------------------------------------------------------------------
  const handleOpenCreate = () => {
    setEditingMeeting(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (meeting) => {
    setEditingMeeting(meeting)
    setFormOpen(true)
  }

  const handleSaveMeeting = async (formData) => {
    if (editingMeeting) {
      // Update existing
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
        fetchMeetings()
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          url: formData.url,
        })

      if (error) {
        showToast('Failed to create meeting.', 'error')
      } else {
        showToast('Meeting created successfully.')
        setFormOpen(false)
        fetchMeetings()
      }
    }
  }

  // -------------------------------------------------------------------------
  // Toggle lock (owner is always allowed here, so no guard needed)
  // -------------------------------------------------------------------------
  const handleToggleLock = async (meetingId, currentValue) => {
    const { error } = await supabase
      .from('meetings')
      .update({ is_locked: !currentValue })
      .eq('id', meetingId)

    if (error) {
      showToast('Failed to toggle lock.', 'error')
    } else {
      // Optimistic local update
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId ? { ...m, is_locked: !currentValue } : m
        )
      )
    }
  }

  // -------------------------------------------------------------------------
  // Delete meeting
  // -------------------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteId) return
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

  const workspaceUrl = profile?.username
    ? `/workspace/${profile.username}`
    : null

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Meeting Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Welcome back{profile?.username ? `, @${profile.username}` : ''}.
              Manage your meeting links below.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-executive-600 px-5 py-3 text-sm font-semibold text-white hover:bg-executive-700 transition shadow-lg"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Meeting
          </button>
        </div>

        {/* Workspace link banner */}
        {workspaceUrl && (
          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-800/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 shrink-0 text-executive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656m5.656-3l3-3a4 4 0 015.656 5.656" />
              </svg>
              <div>
                <p className="text-sm font-medium text-slate-200">Your public workspace</p>
                <p className="text-xs text-slate-500">
                  Share this link so visitors can join your meetings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={workspaceUrl}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
              >
                View Workspace
              </Link>
              <button
                onClick={() => {
                  const fullUrl = window.location.origin + workspaceUrl
                  navigator.clipboard.writeText(fullUrl)
                  showToast('Workspace link copied!')
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* Meetings grid */}
        <div className="mt-8">
          {loading ? (
            <Spinner label="Loading your meetings..." />
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-200">No meetings yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Click &ldquo;New Meeting&rdquo; to add your first meeting link.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  isOwner={true}
                  onToggleLock={handleToggleLock}
                  onEdit={handleOpenEdit}
                  onDelete={(id) => setDeleteId(id)}
                  onUnauthorized={() => {}}
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
