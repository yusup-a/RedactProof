import { useMemo, useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { Finding } from '../api/types'
import { groupFindings } from '../utils/findings'
import { FindingCard } from './FindingCard'
import { Button, Checkbox } from './ui'

interface FindingsSidebarProps {
  findings: Finding[]
  selectedIds: Set<string>
  activeId: string | null
  disabled: boolean
  onSelect: (ids: string[], checked: boolean) => void
  onActivate: (id: string, page?: number) => void
  status?: ReactNode
  footer: ReactNode
}

export function FindingsSidebar({ findings, selectedIds, activeId, disabled, onSelect, onActivate, status, footer }: FindingsSidebarProps) {
  const groups = useMemo(() => groupFindings(findings), [findings])
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const allRevealed = findings.length > 0 && findings.every((f) => revealed.has(f.id))

  const selectedCount = findings.filter((f) => selectedIds.has(f.id)).length
  const allIds = findings.map((f) => f.id)

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section aria-label="Findings" className="panel flex max-h-[calc(100vh-19.5rem)] min-h-[460px] flex-col lg:sticky lg:top-24">
      <div className="border-b-[1.5px] border-ink p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[24px] leading-none font-bold text-ink uppercase">
            Findings
          </h2>
          {findings.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealed(allRevealed ? new Set() : new Set(allIds))}
              icon={allRevealed ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
              aria-pressed={allRevealed}
            >
              {allRevealed ? 'Mask values' : 'Reveal values'}
            </Button>
          )}
        </div>
        {status && <div className="mt-3">{status}</div>}
        {findings.length > 0 && (
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-[14px] font-semibold text-ink">
            <Checkbox
              checked={selectedCount === findings.length}
              indeterminate={selectedCount > 0 && selectedCount < findings.length}
              onChange={(checked) => onSelect(allIds, checked)}
              disabled={disabled}
              label="Select all findings"
            />
            Select all
            <span className="ml-auto font-mono text-[12px] font-normal text-muted tabular-nums">
              {selectedCount} of {findings.length} selected
            </span>
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {findings.length === 0 ? (
          <div className="p-6">
            <p className="font-display text-[20px] font-bold text-ink uppercase">No sensitive values detected</p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              Nothing in this PDF's text was flagged. That isn't proof the document is clean — review it before you share
              it.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.type}>
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-4 py-2">
                <h3 className="tag flex-1 text-ink">{group.label}</h3>
              </div>
              <ul>
                {group.findings.map((f) => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    selected={selectedIds.has(f.id)}
                    active={activeId === f.id}
                    revealed={revealed.has(f.id)}
                    disabled={disabled}
                    onSelect={(checked) => onSelect([f.id], checked)}
                    onActivate={() => onActivate(f.id)}
                    onReveal={() => toggleReveal(f.id)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {footer}
    </section>
  )
}
