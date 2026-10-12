import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
// Accepts a username *or* email combined with a password. The AuthContext
// resolves usernames to emails before calling Supabase Auth.
// ---------------------------------------------------------------------------

export default function Login() {
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, location.state])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setError(null)
      setSubmitting(true)

      try {
        const { error: signInError } = await signIn({ identifier, password })

        if (signInError) {
          setError(signInError.message || 'Failed to log in.')
          return
        }

        // onAuthStateChange will handle session + redirect
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [identifier, password, signIn, navigate]
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Welcome to <span className="text-executive-400">Polmz Boardroom</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Log in to manage your meeting workspace.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier (username or email) */}
            <div>
              <label htmlFor="login-identifier" className="block text-sm font-medium text-slate-300">
                Username or Email
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="yourname or you@example.com"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 focus:border-executive-500 focus:outline-none focus:ring-1 focus:ring-executive-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
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
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          {/* Switch to signup */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Don&rsquo;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-executive-400 hover:text-executive-300 transition">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
