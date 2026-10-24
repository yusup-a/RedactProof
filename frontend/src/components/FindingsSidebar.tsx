import { useMemo, useState, type ReactNode } from 'react'
import { Eye, EyeOff, SearchCheck } from 'lucide-react'
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
  status: ReactNode
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
    <section aria-label="Findings" className="card flex max-h-[calc(100vh-15rem)] min-h-[460px] flex-col lg:sticky lg:top-24">
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">
            Findings <span className="ml-1 text-muted">{findings.length}</span>
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
        <div className="mt-3">{status}</div>
        {findings.length > 0 && (
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-200">
            <Checkbox
              checked={selectedCount === findings.length}
              indeterminate={selectedCount > 0 && selectedCount < findings.length}
              onChange={(checked) => onSelect(allIds, checked)}
              disabled={disabled}
              label="Select all findings"
            />
            Select all
            <span className="text-muted">
              ({selectedCount} of {findings.length} selected)
            </span>
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {findings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <SearchCheck className="size-8 text-emerald-300/80" aria-hidden />
            <p className="mt-3 text-sm font-medium text-white">No sensitive values detected</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Neither detector flagged anything in this PDF's text. That isn't proof the document is clean — check the
              Attacker View to see everything a machine can extract.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const ids = group.findings.map((f) => f.id)
            const n = ids.filter((id) => selectedIds.has(id)).length
            return (
              <div key={group.type} className="mb-4 last:mb-0">
                <div className="mb-2 flex items-center gap-2.5 px-1">
                  <Checkbox
                    checked={n === ids.length}
                    indeterminate={n > 0 && n < ids.length}
                    onChange={(checked) => onSelect(ids, checked)}
                    disabled={disabled}
                    label={`Select all ${group.label} findings`}
                  />
                  <h3 className="eyebrow flex-1">
                    {group.label} <span className="text-muted">· {ids.length}</span>
                  </h3>
                </div>
                <ul className="space-y-2">
                  {group.findings.map((f) => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      selected={selectedIds.has(f.id)}
                      active={activeId === f.id}
                      revealed={revealed.has(f.id)}
                      disabled={disabled}
                      onSelect={(checked) => onSelect([f.id], checked)}
                      onActivate={(page) => onActivate(f.id, page)}
                      onReveal={() => toggleReveal(f.id)}
                    />
                  ))}
                </ul>
              </div>
            )
          })
        )}
      </div>

      {footer}
    </section>
  )
}
