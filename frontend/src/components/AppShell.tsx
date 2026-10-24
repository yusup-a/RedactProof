import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import type { Health } from '../api/types'
import { USE_MOCK } from '../api/client'
import { Dot, Logo } from './ui'

export type HealthState = { status: 'loading' } | { status: 'ok'; health: Health } | { status: 'down' }

function HealthPill({ state }: { state: HealthState }) {
  if (state.status === 'loading') return null
  const pill = 'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium whitespace-nowrap text-body shadow-xs'
  if (state.status === 'down') {
    return (
      <span className={pill}>
        <Dot className="bg-danger" />
        Backend offline
      </span>
    )
  }
  const { gemini_configured, gemini_model } = state.health
  return (
    <span className={pill}>
      <Dot className={gemini_configured ? 'bg-success' : 'bg-warning'} />
      <span className="sm:hidden">{gemini_configured ? 'Gemini ready' : 'Regex-only'}</span>
      <span className="hidden sm:inline">
        {gemini_configured ? (
          <>
            Gemini ready <span className="text-muted">· {gemini_model}</span>
          </>
        ) : (
          'Regex-only mode (Gemini not configured)'
        )}
      </span>
    </span>
  )
}

export function AppShell({ health, onHome, children }: { health: HealthState; onHome?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {USE_MOCK && (
        <div role="status" className="flex items-center justify-center gap-2 border-b border-warning-line bg-warning-soft px-4 py-2 text-[13px] font-medium text-warning-ink">
          <FlaskConical className="size-4" aria-hidden />
          MOCK MODE — showing built-in sample data. Nothing is sent to the backend or Gemini.
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <button type="button" onClick={onHome} className="flex items-center gap-4 rounded-lg" aria-label="RedactProof AI home">
            <Logo />
            <span className="hidden h-5 border-l border-line lg:block" aria-hidden />
            <span className="hidden text-sm text-muted lg:inline">Because covering data isn't the same as removing it.</span>
          </button>
          <HealthPill state={health} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      <footer className="border-t border-line py-6 text-center text-[13px] text-muted">
        Documents are held in server memory for 30 minutes and never written to disk. Use synthetic documents for demos.
      </footer>
    </div>
  )
}
