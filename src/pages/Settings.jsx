import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
// Settings — /settings (owner only, behind ProtectedRoute)
// ---------------------------------------------------------------------------
// Lets the authenticated user update their username and view their email.
// Password changes are handled by Supabase Auth email flow.
// ---------------------------------------------------------------------------

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(null)

  // Password change state
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPwd, setSavingPwd]             = useState(false)
  const [pwdError, setPwdError]               = useState(null)
  const [pwdSuccess, setPwdSuccess]           = useState(null)

  // Sync form with current profile
  useEffect(() => {
    if (profile?.username) setUsername(profile.username)
  }, [profile?.username])

  // -------------------------------------------------------------------------
  // Save username
  // -------------------------------------------------------------------------
  const handleSaveUsername = useCallback(async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmed = username.trim().toLowerCase()

    if (trimmed === profile?.username) {
      setError('That is already your current username.')
      return
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError('Username must be 3–20 characters: letters, numbers, hyphens, underscores only.')
      return
    }

    setSaving(true)
    try {
      // Check availability
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .maybeSingle()

      if (existing) {
        setError('That username is already taken.')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message || 'Failed to update username.')
      } else {
        await refreshProfile()
        setSuccess(`Username updated to @${trimmed}. Your workspace URL has changed.`)
      }
    } finally {
      setSaving(false)
    }
  }, [username, profile?.username, user?.id, refreshProfile])

  // -------------------------------------------------------------------------
  // Change password
  // -------------------------------------------------------------------------
  const handleChangePassword = useCallback(async (e) => {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(null)

    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.')
      return
    }

    setSavingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPwdError(error.message || 'Failed to update password.')
      } else {
        setPwdSuccess('Password updated successfully.')
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setSavingPwd(false)
    }
  }, [newPassword, confirmPassword])

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your profile and credentials.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Profile section                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
          <h2 className="text-base font-semibold text-white">Profile</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Your username determines your workspace URL.
          </p>

          <form onSubmit={handleSaveUsername} className="mt-5 space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500">
                Email changes are not supported at this time.
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-300">Username</label>
              <div className="mt-1.5 flex items-center rounded-lg border border-slate-700 bg-slate-900 focus-within:border-executive-500 focus-within:ring-1 focus-within:ring-executive-500">
                <span className="pl-4 pr-1 text-slate-500">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="yourname"
                  maxLength={20}
                  className="w-full rounded-r-lg bg-transparent px-2 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Workspace URL: <span className="font-mono text-slate-400">
                  {window.location.origin}/workspace/{username || '...'}
                </span>
              </p>
            </div>

            {/* Errors / success */}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 px-4 py-3">
                <p className="text-sm text-emerald-300">{success}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm text-slate-400 hover:text-slate-200 transition"
              >
                ← Back to Dashboard
              </button>
              <button
                type="submit"
                disabled={saving || username.trim() === (profile?.username || '')}
                className="rounded-lg bg-executive-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-executive-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Saving...' : 'Save Username'}
              </button>
            </div>
          </form>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Password section                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-800/50 p-6">
          <h2 className="text-base font-semibold text-white">Change Password</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Choose a strong password of at least 6 characters.
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
              />
            </div>

            {pwdError && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3">
                <p className="text-sm text-red-300">{pwdError}</p>
              </div>
            )}
            {pwdSuccess && (
              <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 px-4 py-3">
                <p className="text-sm text-emerald-300">{pwdSuccess}</p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingPwd || !newPassword}
                className="rounded-lg bg-executive-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-executive-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {savingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Danger zone                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-6 rounded-2xl border border-red-900/40 bg-red-950/10 p-6">
          <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
          <p className="mt-1 text-sm text-slate-400">
            To delete your account and all associated data, contact support or
            remove your account directly from the Supabase Authentication dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
