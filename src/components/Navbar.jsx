import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
// Navbar — responsive with mobile hamburger drawer
// ---------------------------------------------------------------------------

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)
  const drawerRef = useRef(null)

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const workspaceHref = profile?.username ? `/workspace/${profile.username}` : null

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Brand + logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 overflow-hidden rounded-lg">
            <img
              src="/logo.png"
              alt="Polmz Boardroom logo"
              className="block h-full w-full object-cover object-center"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement.classList.add(
                  'flex', 'items-center', 'justify-center', 'bg-executive-600'
                )
                e.currentTarget.parentElement.innerHTML =
                  '<span class="text-white font-bold text-lg">P</span>'
              }}
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Polmz <span className="text-executive-400">Boardroom</span>
          </span>
        </Link>

        {/* Desktop right-side */}
        <div className="hidden sm:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard"
                className="text-sm font-medium text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
              {workspaceHref && (
                <Link to={workspaceHref}
                  className="text-sm font-medium text-slate-300 hover:text-white transition">
                  My Workspace
                </Link>
              )}
              <Link to="/settings"
                className="text-sm font-medium text-slate-300 hover:text-white transition">
                Settings
              </Link>
              <div className="text-sm text-slate-400">
                {profile?.username ? `@${profile.username}` : user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white transition">
                Login
              </Link>
              <Link to="/signup"
                className="rounded-lg bg-executive-600 px-4 py-2 text-sm font-semibold text-white hover:bg-executive-700 transition">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="sm:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          ref={drawerRef}
          className="sm:hidden border-t border-slate-800 bg-slate-900 px-4 pb-4 pt-3 animate-slide-up"
        >
          {user ? (
            <div className="space-y-1">
              {/* User info */}
              <div className="mb-3 rounded-lg bg-slate-800 px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  {profile?.username ? `@${profile.username}` : user.email}
                </p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>

              <Link to="/dashboard"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </Link>

              {workspaceHref && (
                <Link to={workspaceHref}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656m5.656-3l3-3a4 4 0 015.656 5.656" />
                  </svg>
                  My Workspace
                </Link>
              )}

              <Link to="/settings"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 hover:bg-slate-800 transition">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login"
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition">
                Login
              </Link>
              <Link to="/signup"
                className="block rounded-lg bg-executive-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-executive-700 transition">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
