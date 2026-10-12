import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------
// Collects username, email, and password. Before calling Supabase Auth we
// verify the chosen username is available so the user gets immediate feedback
// rather than a generic auth error.
// ---------------------------------------------------------------------------

// Mirrors the database CHECK constraint: ^[a-zA-Z0-9_-]{3,20}$
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/

export default function Signup() {
  const { signUp, user, loading } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  const validate = useCallback(() => {
    if (!USERNAME_PATTERN.test(username)) {
      return 'Username must be 3–20 characters and can only contain letters, numbers, hyphens, and underscores.'
    }
    if (!email.includes('@') || email.length < 5) {
      return 'Please enter a valid email address.'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.'
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.'
    }
    return null
  }, [username, email, password, confirmPassword])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setError(null)

      const validationError = validate()
      if (validationError) {
        setError(validationError)
        return
      }

      setSubmitting(true)

      try {
        // Check username availability before creating the auth account
        const { data: existing, error: lookupError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle()

        if (lookupError && lookupError.code !== 'PGRST116') {
          setError('Could not verify username availability. Please try again.')
          return
        }
        if (existing) {
          setError('That username is already taken. Please choose another.')
          return
        }

        // Create the auth account; username goes into raw_user_meta_data
        // so the DB trigger inserts it into public.profiles.
        const { error: signUpError } = await signUp({
          email,
          password,
          username,
        })

        if (signUpError) {
          setError(signUpError.message || 'Failed to create account.')
          return
        }

        // If email confirmation is disabled in Supabase, the session is
        // active immediately. Otherwise, tell the user to check their inbox.
        const { data: { session: activeSession } } = await supabase.auth.getSession()
        if (activeSession) {
          navigate('/dashboard', { replace: true })
        } else {
          setSuccess(true)
        }
      } catch (err) {
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [validate, username, email, password, signUp, navigate]
  )

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 ring-1 ring-emerald-600/30">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            We sent a confirmation link to <span className="font-medium text-slate-200">{email}</span>.
            Click the link to activate your account, then log in to start building your boardroom.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-executive-600 px-6 py-3 text-sm font-semibold text-white hover:bg-executive-700 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Create your <span className="text-executive-400">Boardroom</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign up to get your own dedicated workspace.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="signup-username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div className="mt-1.5 flex items-center rounded-lg border border-slate-700 bg-slate-900 focus-within:border-executive-500 focus-within:ring-1 focus-within:ring-executive-500">
                <span className="pl-4 pr-1 text-slate-500">@</span>
                <input
                  id="signup-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="yourname"
                  className="w-full rounded-r-lg bg-transparent px-2 py-2.5 text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                3–20 characters. Letters, numbers, hyphens, and underscores.
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                required
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-executive-600 px-4 py-3 text-sm font-semibold text-white hover:bg-executive-700 disabled:opacity-50 disabled:cursor-wait transition"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Switch to login */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-executive-400 hover:text-executive-300 transition">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
