// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
// Lightweight loading indicator with an optional message.
// ---------------------------------------------------------------------------

export default function Spinner({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-executive-500" />
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </div>
  )
}
