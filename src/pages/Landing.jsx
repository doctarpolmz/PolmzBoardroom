import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------
// Marketing / intro page for Polmz Boardroom. Explains the core concept and
// routes visitors to sign up or log in.
// ---------------------------------------------------------------------------

export default function Landing() {
  const { user } = useAuth()

  const features = [
    {
      title: 'Centralized Workspace',
      desc: 'Get your own dedicated workspace URL. Organize all your meeting links in one professional dashboard.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5a4 4 0 11-8 0 4 4 0 018 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Real-Time Lock Control',
      desc: 'Flip a toggle to lock any meeting instantly. Locked sessions block uninvited participants from joining.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 018 0v3" />
        </svg>
      ),
    },
    {
      title: 'Secure & Isolated',
      desc: 'Row-level security ensures every workspace shows only its creator\u2019s meetings. No cross-contamination.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      title: 'Shareable Links',
      desc: 'Send your workspace URL to anyone. They see exactly your board — no setup required on their end.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656m5.656-3l3-3a4 4 0 015.656 5.656" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-executive-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-20 right-0 h-72 w-72 rounded-full bg-executive-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 p-2 ring-1 ring-slate-700">
            <img
              src="/logo.png"
              alt="Polmz Boardroom"
              className="h-full w-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Polmz <span className="text-executive-400">Boardroom</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Your centralized virtual meeting dashboard. Create, organize, and
            launch custom meeting links — with real-time lock controls that
            keep uninvited guests out.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-executive-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-executive-700 transition shadow-lg"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="rounded-xl bg-executive-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-executive-700 transition shadow-lg"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-700 px-7 py-3.5 text-base font-semibold text-slate-200 hover:bg-slate-800 transition"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 bg-slate-800/50 p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-executive-600/20 text-executive-400">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <p className="text-center text-sm text-slate-500">
          Polmz Boardroom &copy; 2026 — Secure meeting management.
        </p>
      </footer>
    </div>
  )
}
