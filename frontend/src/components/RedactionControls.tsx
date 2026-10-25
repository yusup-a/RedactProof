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

  return (
    <div className="border-t-[1.5px] border-ink bg-surface p-4">
      {error && (
        <div role="alert" className="mb-3 border-[1.5px] border-danger bg-danger px-3 py-2 text-[13px] font-medium text-white">
          {error}
        </div>
      )}
      <div className="mb-3 flex items-center justify-between font-mono text-[12px]">
        <span className="text-body tabular-nums" aria-live="polite">
          {selected.length === 0 ? (
            'Select findings to remove'
          ) : (
            <>
              <span className="font-semibold text-ink">{selected.length}</span> field{selected.length === 1 ? '' : 's'} will be removed
            </>
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={redacting || disabled}
            className="text-ink underline decoration-1 underline-offset-4 hover:decoration-2 disabled:opacity-40"
          >
            Clear
          </button>
        )}
      </div>
      <Button variant="primary" size="lg" className="w-full" disabled={disabled || selected.length === 0} loading={redacting} onClick={onRedact}>
        {redacting ? 'Redacting and verifying…' : 'Redact'}
      </Button>
    </div>
  )
}
