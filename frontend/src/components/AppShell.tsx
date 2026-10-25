import type { ReactNode } from 'react'
import type { Health } from '../api/types'
import { USE_MOCK } from '../api/client'
import { Logo } from './ui'

export type HealthState = { status: 'loading' } | { status: 'ok'; health: Health } | { status: 'down' }

/** Shown only when the backend can't be reached. */
function OfflineBadge({ state }: { state: HealthState }) {
  if (state.status !== 'down') return null
  return (
    <span className="inline-flex h-8 items-center gap-2 border-[1.5px] border-ink bg-surface px-2.5 font-mono text-[12px] font-medium whitespace-nowrap text-ink">
      <span className="size-2.5 shrink-0 bg-danger" aria-hidden />
      Backend offline
    </span>
  )
}

export function AppShell({ health, onHome, children }: { health: HealthState; onHome?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {USE_MOCK && (
        <div role="status" className="border-b-[1.5px] border-ink bg-marker px-4 py-1.5 text-center font-mono text-[12px] font-semibold text-ink">
          MOCK MODE — showing built-in sample data. Nothing is sent to the backend.
        </div>
      )}
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <button type="button" onClick={onHome} className="flex items-center" aria-label="RedactProof AI home">
            <Logo />
          </button>
          <OfflineBadge state={health} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      <footer className="border-t-[1.5px] border-ink">
        <div className="mx-auto flex max-w-[1440px] px-4 py-5 font-mono text-[12px] sm:px-8">
          <span className="text-ink">RedactProof AI</span>
        </div>
      </footer>
    </div>
  )
}
