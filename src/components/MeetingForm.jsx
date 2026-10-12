import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// MeetingForm
// ---------------------------------------------------------------------------
// Modal form for creating a new meeting or editing an existing one.
// Used by the owner inside their Dashboard or their own Workspace view.
// ---------------------------------------------------------------------------

const EMPTY_FORM = { title: '', description: '', url: '' }

export default function MeetingForm({ open, meeting, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens or the meeting being edited changes
  useEffect(() => {
    if (open) {
      if (meeting) {
        setForm({
          title: meeting.title || '',
          description: meeting.description || '',
          url: meeting.url || '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [open, meeting])

  const validate = useCallback(() => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.url.trim()) {
      errs.url = 'Meeting URL is required'
    } else {
      try {
        const parsed = new URL(form.url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errs.url = 'URL must start with http:// or https://'
        }
      } catch {
        errs.url = 'Enter a valid URL (e.g. https://meet.google.com/abc-xyz)'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        url: form.url.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const isEditing = !!meeting

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-form-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-slide-up">
        <h2 id="meeting-form-title" className="text-xl font-bold text-white">
          {isEditing ? 'Edit Meeting' : 'Create New Meeting'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {isEditing
            ? 'Update the details for this meeting link.'
            : 'Add a new meeting URL to your boardroom.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="meeting-title" className="block text-sm font-medium text-slate-300">
              Meeting Title
            </label>
            <input
              id="meeting-title"
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              placeholder="Weekly Team Standup"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="meeting-description" className="block text-sm font-medium text-slate-300">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="meeting-description"
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Quick sync to discuss project milestones"
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500 resize-none"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="meeting-url" className="block text-sm font-medium text-slate-300">
              Meeting URL
            </label>
            <input
              id="meeting-url"
              type="url"
              value={form.url}
              onChange={handleChange('url')}
              placeholder="https://meet.google.com/abc-xyz-123"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
            />
            {errors.url && <p className="mt-1 text-xs text-red-400">{errors.url}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-executive-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-executive-700 disabled:opacity-50 disabled:cursor-wait transition"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Meeting' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
