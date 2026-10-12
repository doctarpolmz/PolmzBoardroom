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
// delete, and lock/unlock for meetings — plus full CRUD for the notice board.
// All gated by the ProtectedRoute wrapper and RLS.
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user, profile } = useAuth()

  // Meeting state
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [toast, setToast] = useState(null)

  // Notice state
  const [notices, setNotices] = useState([])
  const [newNotice, setNewNotice] = useState('')
  const [addingNotice, setAddingNotice] = useState(false)
  const [editingNoticeId, setEditingNoticeId] = useState(null)
  const [editingNoticeText, setEditingNoticeText] = useState('')
  const [savingNoticeId, setSavingNoticeId] = useState(null)
  const [deleteNoticeId, setDeleteNoticeId] = useState(null)

  // Audit log state
  const [auditLog, setAuditLog] = useState([])
  const [auditOpen, setAuditOpen] = useState(false)

  // -------------------------------------------------------------------------
  // Toast helper
  // -------------------------------------------------------------------------
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // -------------------------------------------------------------------------
  // Fetch meetings
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

  // -------------------------------------------------------------------------
  // Fetch notices
  // -------------------------------------------------------------------------
  const fetchNotices = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Dashboard] Error fetching notices:', error.message)
    } else {
      setNotices(data || [])
    }
  }, [user?.id])

  // -------------------------------------------------------------------------
  // Fetch audit log
  // -------------------------------------------------------------------------
  const fetchAuditLog = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setAuditLog(data || [])
  }, [user?.id])

  useEffect(() => {
    fetchMeetings()
    fetchNotices()
    fetchAuditLog()
  }, [fetchMeetings, fetchNotices, fetchAuditLog])

  // -------------------------------------------------------------------------
  // Notice: Add new
  // -------------------------------------------------------------------------
  const handleAddNotice = async () => {
    const content = newNotice.trim()
    if (!content) return
    setAddingNotice(true)
    const { error } = await supabase
      .from('notices')
      .insert({ user_id: user.id, content })

    if (error) {
      showToast(`Failed to add notice: ${error.message}`, 'error')
    } else {
      showToast('Notice posted.')
      logAudit('created', 'notice', null, `Notice posted`)
      setNewNotice('')
      fetchNotices()
    }
    setAddingNotice(false)
  }

  // -------------------------------------------------------------------------
  // Notice: Start editing
  // -------------------------------------------------------------------------
  const handleStartEditNotice = (notice) => {
    setEditingNoticeId(notice.id)
    setEditingNoticeText(notice.content)
  }

  const handleCancelEditNotice = () => {
    setEditingNoticeId(null)
    setEditingNoticeText('')
  }

  // -------------------------------------------------------------------------
  // Notice: Save edited
  // -------------------------------------------------------------------------
  const handleSaveEditNotice = async (noticeId) => {
    const content = editingNoticeText.trim()
    if (!content) return
    setSavingNoticeId(noticeId)
    const { error } = await supabase
      .from('notices')
      .update({ content })
      .eq('id', noticeId)

    if (error) {
      showToast(`Failed to update notice: ${error.message}`, 'error')
    } else {
      showToast('Notice updated.')
      setEditingNoticeId(null)
      setEditingNoticeText('')
      fetchNotices()
    }
    setSavingNoticeId(null)
  }

  // -------------------------------------------------------------------------
  // Notice: Delete
  // -------------------------------------------------------------------------
  const handleConfirmDeleteNotice = async () => {
    if (!deleteNoticeId) return
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', deleteNoticeId)

    if (error) {
      showToast(`Failed to delete notice: ${error.message}`, 'error')
    } else {
      showToast('Notice deleted.')
      logAudit('deleted', 'notice', deleteNoticeId, 'Notice deleted')
      setNotices((prev) => prev.filter((n) => n.id !== deleteNoticeId))
    }
    setDeleteNoticeId(null)
  }

  // -------------------------------------------------------------------------
  // Meeting: Create / Edit
  // -------------------------------------------------------------------------
  const handleOpenCreate = () => {
    setEditingMeeting(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (meeting) => {
    setEditingMeeting(meeting)
    setFormOpen(true)
  }

  const logAudit = async (action, entity, entityId, detail) => {
    await supabase.from('audit_log').insert({
      user_id: user.id, action, entity, entity_id: entityId, detail,
    })
    fetchAuditLog()
  }

  const handleSaveMeeting = async (formData) => {
    if (editingMeeting) {
      const { error } = await supabase
        .from('meetings')
        .update({
          title: formData.title,
          description: formData.description,
          url: formData.url,
          passcode: formData.passcode,
          scheduled_at: formData.scheduled_at,
          ends_at: formData.ends_at,
          resources: formData.resources,
        })
        .eq('id', editingMeeting.id)

      if (error) {
        showToast('Failed to update meeting.', 'error')
      } else {
        showToast('Meeting updated successfully.')
        logAudit('updated', 'meeting', editingMeeting.id, `"${formData.title}" updated`)
        setFormOpen(false)
        setEditingMeeting(null)
        fetchMeetings()
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          url: formData.url,
          passcode: formData.passcode,
          scheduled_at: formData.scheduled_at,
          ends_at: formData.ends_at,
          resources: formData.resources,
        })
        .select()
        .single()

      if (error) {
        showToast('Failed to create meeting.', 'error')
      } else {
        showToast('Meeting created successfully.')
        logAudit('created', 'meeting', inserted?.id, `"${formData.title}" created`)
        setFormOpen(false)
        fetchMeetings()
      }
    }
  }

  // -------------------------------------------------------------------------
  // Meeting: Toggle lock
  // -------------------------------------------------------------------------
  const handleToggleLock = async (meetingId, currentValue) => {
    const { error } = await supabase
      .from('meetings')
      .update({ is_locked: !currentValue })
      .eq('id', meetingId)

    if (error) {
      showToast('Failed to toggle lock.', 'error')
    } else {
      const m = meetings.find(x => x.id === meetingId)
      logAudit(
        !currentValue ? 'locked' : 'unlocked',
        'meeting', meetingId,
        `"${m?.title}" ${!currentValue ? 'locked' : 'unlocked'}`
      )
      setMeetings((prev) =>
        prev.map((m) => m.id === meetingId ? { ...m, is_locked: !currentValue } : m)
      )
    }
  }

  // -------------------------------------------------------------------------
  // Meeting: Delete
  // -------------------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteId) return
    const m = meetings.find(x => x.id === deleteId)
    const { error } = await supabase.from('meetings').delete().eq('id', deleteId)
    if (error) {
      showToast('Failed to delete meeting.', 'error')
    } else {
      showToast('Meeting deleted.')
      logAudit('deleted', 'meeting', deleteId, `"${m?.title}" deleted`)
      setMeetings((prev) => prev.filter((m) => m.id !== deleteId))
    }
    setDeleteId(null)
  }

  // -------------------------------------------------------------------------
  // Format timestamp
  // -------------------------------------------------------------------------
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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

        {/* Notice board */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0 text-executive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.33a1.618 1.618 0 01-2.482 1.366L5.5 19.5l3.018-1.047A1.618 1.618 0 0111 19.33V5.882zM19 5.882V19.33a1.618 1.618 0 002.482 1.366L24.5 19.5l-3.018 1.047A1.618 1.618 0 0119 19.33V5.882z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 6l8-2v2l-8 2" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-200">Notice Board</p>
              <p className="text-xs text-slate-500">
                Post messages visitors see at the top of your workspace.
              </p>
            </div>
          </div>

          {/* Add new notice */}
          <div className="mb-4">
            <textarea
              value={newNotice}
              onChange={(e) => setNewNotice(e.target.value)}
              placeholder="Write a new notice..."
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
            />
            <button
              onClick={handleAddNotice}
              disabled={addingNotice || !newNotice.trim()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-executive-600 px-4 py-2 text-sm font-semibold text-white hover:bg-executive-700 disabled:opacity-50 disabled:cursor-wait transition"
            >
              {addingNotice ? 'Posting...' : 'Post Notice'}
            </button>
          </div>

          {/* Existing notices list */}
          {notices.length > 0 && (
            <div className="space-y-2">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-3"
                >
                  {editingNoticeId === notice.id ? (
                    // Editing mode
                    <div>
                      <textarea
                        value={editingNoticeText}
                        onChange={(e) => setEditingNoticeText(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleSaveEditNotice(notice.id)}
                          disabled={savingNoticeId === notice.id || !editingNoticeText.trim()}
                          className="rounded-lg bg-executive-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-executive-700 disabled:opacity-50 transition"
                        >
                          {savingNoticeId === notice.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEditNotice}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                          {notice.content}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(notice.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleStartEditNotice(notice)}
                          aria-label="Edit notice"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteNoticeId(notice.id)}
                          aria-label="Delete notice"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-900/50 hover:text-red-400 transition"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit log */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-800/50 p-5">
          <button
            onClick={() => { setAuditOpen(v => !v); if (!auditOpen) fetchAuditLog() }}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 shrink-0 text-executive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-200">Activity Log</p>
                <p className="text-xs text-slate-500">Recent actions in your workspace</p>
              </div>
            </div>
            <svg className={`h-4 w-4 text-slate-400 transition-transform ${auditOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {auditOpen && (
            <div className="mt-4">
              {auditLog.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No activity recorded yet.</p>
              ) : (
                <div className="space-y-1">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-800 transition">
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                        entry.action === 'locked'   ? 'bg-red-500' :
                        entry.action === 'unlocked' ? 'bg-emerald-500' :
                        entry.action === 'deleted'  ? 'bg-rose-400' :
                        entry.action === 'created'  ? 'bg-blue-400' : 'bg-slate-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-200">{entry.detail}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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

      <ConfirmDialog
        open={!!deleteNoticeId}
        title="Delete this notice?"
        message="This notice will be permanently removed from your workspace."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirmDeleteNotice}
        onCancel={() => setDeleteNoticeId(null)}
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
