import { AlertCircle, ShieldCheck } from 'lucide-react'
import type { Finding } from '../api/types'
import { Button } from './ui'

interface RedactionControlsProps {
  findings: Finding[]
  selectedIds: Set<string>
  redacting: boolean
  disabled?: boolean
  error: string | null
  onRedact: () => void
  onClear: () => void
}

export function RedactionControls({ findings, selectedIds, redacting, disabled, error, onRedact, onClear }: RedactionControlsProps) {
  const selected = findings.filter((f) => selectedIds.has(f.id))
  const locations = selected.reduce((n, f) => n + f.locations.length, 0)

  return (
    <div className="border-t border-line bg-surface p-4">
      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      <div className="mb-3 flex items-center justify-between text-[13px]">
        <span className="text-muted tabular-nums" aria-live="polite">
          {selected.length === 0 ? (
            'Select findings to remove'
          ) : (
            <>
              <span className="font-semibold text-ink">{selected.length}</span> value{selected.length === 1 ? '' : 's'} ·{' '}
              {locations} location{locations === 1 ? '' : 's'} will be removed
            </>
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={redacting || disabled}
            className="text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={disabled || selected.length === 0}
        loading={redacting}
        onClick={onRedact}
        icon={<ShieldCheck className="size-4" aria-hidden />}
      >
        {redacting ? 'Redacting and verifying…' : 'Securely Redact Selected'}
      </Button>
    </div>
  )
}
