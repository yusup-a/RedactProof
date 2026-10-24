import type { ReactNode } from 'react'
import type { Health } from '../api/types'
import { USE_MOCK } from '../api/client'
import { Logo, cx } from './ui'

export type HealthState = { status: 'loading' } | { status: 'ok'; health: Health } | { status: 'down' }

function HealthPill({ state }: { state: HealthState }) {
  if (state.status === 'loading') return null
  const box = 'inline-flex h-8 items-center gap-2 border-[1.5px] border-ink bg-surface px-2.5 font-mono text-[12px] font-medium whitespace-nowrap text-ink'
  const light = (color: string) => <span className={cx('size-2.5 shrink-0', color)} aria-hidden />
  if (state.status === 'down') {
    return (
      <span className={box}>
        {light('bg-danger')}
        Backend offline
      </span>
    )
  }
  const { gemini_configured, gemini_model } = state.health
  return (
    <span className={box}>
      {light(gemini_configured ? 'bg-success' : 'bg-warning')}
      <span className="sm:hidden">{gemini_configured ? 'Gemini ready' : 'Regex-only'}</span>
      <span className="hidden sm:inline">
        {gemini_configured ? (
          <>
            Gemini ready <span className="text-muted">/ {gemini_model}</span>
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
        <div role="status" className="border-b-[1.5px] border-ink bg-marker px-4 py-1.5 text-center font-mono text-[12px] font-semibold text-ink">
          MOCK MODE — showing built-in sample data. Nothing is sent to the backend or Gemini.
        </div>
      )}
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <button type="button" onClick={onHome} className="flex items-center gap-5" aria-label="RedactProof AI home">
            <Logo />
            <span className="hidden font-mono text-[12px] text-muted lg:inline">Because covering data isn't the same as removing it.</span>
          </button>
          <HealthPill state={health} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      <footer className="border-t-[1.5px] border-ink">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-5 font-mono text-[12px] text-muted sm:flex-row sm:justify-between sm:px-8">
          <span>Documents are held in server memory for 30 minutes and never written to disk. Use synthetic documents for demos.</span>
          <span className="text-ink">RedactProof AI</span>
        </div>
      </footer>
    </div>
  )
}
