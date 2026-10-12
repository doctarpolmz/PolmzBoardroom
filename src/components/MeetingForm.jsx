import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// MeetingForm
// ---------------------------------------------------------------------------
// Modal form for creating or editing a meeting.
// Fields: title, description, url, passcode, scheduled_at, ends_at,
//         resources (list of {label, url} agenda/attachment links).
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  title: '',
  description: '',
  url: '',
  passcode: '',
  scheduled_at: '',
  ends_at: '',
  resources: [],
}

const EMPTY_RESOURCE = { label: '', url: '' }

// Convert a UTC ISO string to a local datetime-local string for <input>
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert local datetime-local string back to ISO UTC
const toISO = (local) => {
  if (!local) return null
  return new Date(local).toISOString()
}

export default function MeetingForm({ open, meeting, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (meeting) {
        setForm({
          title: meeting.title || '',
          description: meeting.description || '',
          url: meeting.url || '',
          passcode: meeting.passcode || '',
          scheduled_at: toLocalInput(meeting.scheduled_at),
          ends_at: toLocalInput(meeting.ends_at),
          resources: Array.isArray(meeting.resources) ? meeting.resources : [],
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [open, meeting])

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const validate = useCallback(() => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.url.trim()) {
      errs.url = 'Meeting URL is required'
    } else {
      try {
        const p = new URL(form.url)
        if (!['http:', 'https:'].includes(p.protocol)) {
          errs.url = 'URL must start with http:// or https://'
        }
      } catch {
        errs.url = 'Enter a valid URL (e.g. https://meet.google.com/abc-xyz)'
      }
    }
    if (form.scheduled_at && form.ends_at) {
      if (new Date(form.ends_at) <= new Date(form.scheduled_at)) {
        errs.ends_at = 'End time must be after start time'
      }
    }
    // Validate each resource
    form.resources.forEach((r, i) => {
      if (r.url.trim()) {
        try {
          const p = new URL(r.url)
          if (!['http:', 'https:'].includes(p.protocol)) {
            errs[`resource_${i}`] = 'Resource URL must start with http:// or https://'
          }
        } catch {
          errs[`resource_${i}`] = 'Enter a valid URL'
        }
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  // -------------------------------------------------------------------------
  // Field helpers
  // -------------------------------------------------------------------------
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // Resource list helpers
  const addResource = () =>
    setForm((prev) => ({ ...prev, resources: [...prev.resources, { ...EMPTY_RESOURCE }] }))

  const updateResource = (i, field, value) => {
    const updated = prev => {
      const list = [...prev.resources]
      list[i] = { ...list[i], [field]: value }
      return { ...prev, resources: list }
    }
    setForm(updated)
    if (errors[`resource_${i}`]) setErrors((prev) => ({ ...prev, [`resource_${i}`]: undefined }))
  }

  const removeResource = (i) =>
    setForm((prev) => ({ ...prev, resources: prev.resources.filter((_, idx) => idx !== i) }))

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      // Strip empty resources
      const cleanResources = form.resources.filter(
        (r) => r.label.trim() || r.url.trim()
      )
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        url: form.url.trim(),
        passcode: form.passcode.trim() || null,
        scheduled_at: toISO(form.scheduled_at),
        ends_at: toISO(form.ends_at),
        resources: cleanResources,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  const isEditing = !!meeting

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-form-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-slide-up mb-8">
        <h2 id="meeting-form-title" className="text-xl font-bold text-white">
          {isEditing ? 'Edit Meeting' : 'Create New Meeting'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {isEditing ? 'Update the details for this meeting.' : 'Add a new meeting to your boardroom.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300">Meeting Title</label>
            <input
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
            <label className="block text-sm font-medium text-slate-300">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Brief agenda or context for this meeting"
              rows={2}
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
            />
          </div>

          {/* Meeting URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300">Meeting URL</label>
            <input
              type="url"
              value={form.url}
              onChange={handleChange('url')}
              placeholder="https://meet.google.com/abc-xyz-123"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
            />
            {errors.url && <p className="mt-1 text-xs text-red-400">{errors.url}</p>}
          </div>

          {/* Passcode */}
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Passcode <span className="text-slate-500">(optional, owner-only)</span>
            </label>
            <input
              type="text"
              value={form.passcode}
              onChange={handleChange('passcode')}
              placeholder="e.g. 123456"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Start Time <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={handleChange('scheduled_at')}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                End Time <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={handleChange('ends_at')}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500 [color-scheme:dark]"
              />
              {errors.ends_at && <p className="mt-1 text-xs text-red-400">{errors.ends_at}</p>}
            </div>
          </div>

          {/* Resources / Agenda links */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">
                Agenda / Resources <span className="text-slate-500">(optional)</span>
              </label>
              <button
                type="button"
                onClick={addResource}
                className="text-xs font-semibold text-executive-400 hover:text-executive-300 transition"
              >
                + Add link
              </button>
            </div>
            {form.resources.length > 0 && (
              <div className="mt-2 space-y-2">
                {form.resources.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={r.label}
                        onChange={(e) => updateResource(i, 'label', e.target.value)}
                        placeholder="Label (e.g. Agenda, Slides)"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                      />
                      <input
                        type="url"
                        value={r.url}
                        onChange={(e) => updateResource(i, 'url', e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                      />
                      {errors[`resource_${i}`] && (
                        <p className="text-xs text-red-400">{errors[`resource_${i}`]}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeResource(i)}
                      className="mt-1 rounded-lg p-1.5 text-slate-500 hover:bg-red-900/40 hover:text-red-400 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
