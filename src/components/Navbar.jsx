import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
// Executive top navigation bar. Shows the Polmz Boardroom brand + logo on the
// left and contextual auth actions on the right (Login / Sign Up when logged
// out, profile link + Sign Out when logged in).
// ---------------------------------------------------------------------------

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand + logo (top-left) */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-slate-800 p-1.5 ring-1 ring-slate-700 group-hover:ring-executive-500 transition-all">
            <img
              src="/logo.png"
              alt="Polmz Boardroom logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                // Graceful fallback if logo asset is missing
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement.classList.add(
                  'bg-executive-600'
                )
                e.currentTarget.parentElement.innerHTML = '<span class="text-white font-bold text-lg">P</span>'
              }}
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Polmz <span className="text-executive-400">Boardroom</span>
          </span>
        </Link>

        {/* Right-side actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden text-sm font-medium text-slate-300 hover:text-white transition sm:block"
              >
                Dashboard
              </Link>
              {profile?.username && (
                <Link
                  to={`/workspace/${profile.username}`}
                  className="hidden text-sm font-medium text-slate-300 hover:text-white transition sm:block"
                >
                  My Workspace
                </Link>
              )}
              <div className="hidden text-sm text-slate-400 sm:block">
                {profile?.username ? `@${profile.username}` : user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white transition"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-executive-600 px-4 py-2 text-sm font-semibold text-white hover:bg-executive-700 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
