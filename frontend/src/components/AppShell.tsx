import type { ReactNode } from 'react'
import { FlaskConical, ServerCrash, Sparkles, ScanText } from 'lucide-react'
import type { Health } from '../api/types'
import { USE_MOCK } from '../api/client'
import { Logo, cx } from './ui'

export type HealthState = { status: 'loading' } | { status: 'ok'; health: Health } | { status: 'down' }

function HealthPill({ state }: { state: HealthState }) {
  if (state.status === 'loading') return null
  if (state.status === 'down') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
        <ServerCrash className="size-3.5" aria-hidden />
        Backend offline
      </span>
    )
  }
  const { gemini_configured, gemini_model } = state.health
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap',
        gemini_configured ? 'border-violet-400/30 bg-violet-500/10 text-violet-100' : 'border-amber-400/30 bg-amber-500/10 text-amber-200',
      )}
    >
      {gemini_configured ? <Sparkles className="size-3.5" aria-hidden /> : <ScanText className="size-3.5" aria-hidden />}
      <span className="sm:hidden">{gemini_configured ? 'Gemini ready' : 'Regex-only'}</span>
      <span className="hidden sm:inline">
        {gemini_configured ? `Gemini ready · ${gemini_model}` : 'Regex-only mode (Gemini not configured)'}
      </span>
    </span>
  )
}

export function AppShell({ health, onHome, children }: { health: HealthState; onHome?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {USE_MOCK && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-semibold text-slate-950">
          <FlaskConical className="size-3.5" aria-hidden />
          MOCK MODE — showing built-in sample data. Nothing is sent to the backend or Gemini.
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={onHome} className="flex items-center gap-4 rounded-lg" aria-label="RedactProof AI home">
            <Logo />
            <span className="hidden border-l border-line pl-4 text-xs text-muted lg:inline">
              Because covering data isn't the same as removing it.
            </span>
          </button>
          <HealthPill state={health} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-line/60 py-5 text-center text-xs text-subtle">
        Documents are held in server memory for 30 minutes and never written to disk. Use synthetic documents for demos.
      </footer>
    </div>
  )
}
