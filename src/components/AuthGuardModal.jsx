import { Link } from 'react-router-dom'

// ---------------------------------------------------------------------------
// AuthGuardModal
// ---------------------------------------------------------------------------
// Pops up when an unauthenticated visitor or a non-owner tries to create a
// meeting, edit an entry, or flip a lock switch. The exact intercept modal
// specified in the requirements.
// ---------------------------------------------------------------------------

export default function AuthGuardModal({ open, onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-guard-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl animate-slide-up">
        {/* Lock icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
          <svg
            className="h-8 w-8 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 11c-1.1 0-2 .9-2 2v3h4v-3c0-1.1-.9-2-2-2zM6 11V8a6 6 0 1112 0v3"
            />
            <rect x="4" y="11" width="16" height="10" rx="2" />
          </svg>
        </div>

        <h2
          id="auth-guard-title"
          className="text-center text-xl font-bold text-white"
        >
          Creator Authentication Required
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-400">
          Only the workspace owner can modify access. Please log in to the
          creator account for this workspace to manage meetings and toggle
          locks.
        </p>

        {/* Actions */}
        <div className="mt-7 flex flex-col gap-3">
          <Link
            to="/login"
            className="w-full rounded-lg bg-executive-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-executive-700 transition"
          >
            Log In as Creator
          </Link>
 <Link
            to="/signup"
            className="w-full rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            Create an Account
          </Link>
          <button
            onClick={onClose}
            className="w-full rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-500 hover:text-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
