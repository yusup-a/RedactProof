import { useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { Finding } from '../api/types'
import { TYPE_LABELS, pagesOf } from '../utils/findings'
import { Checkbox, RiskBadge, Tag, cx } from './ui'

interface FindingCardProps {
  finding: Finding
  selected: boolean
  active: boolean
  revealed: boolean
  disabled: boolean
  onSelect: (checked: boolean) => void
  onActivate: (page?: number) => void
  onReveal: () => void
}

/** One finding as a ruled row in the findings list. */
export function FindingCard({ finding, selected, active, revealed, disabled, onSelect, onActivate, onReveal }: FindingCardProps) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])

  const pages = pagesOf(finding)
  const count = finding.locations.length

  return (
    <li
      ref={ref}
      className={cx(
        'flex gap-3 border-b border-line py-3 pr-4 pl-3 transition-colors last:border-b-0',
        active ? 'border-l-4 border-l-ink bg-marker/35 pl-2' : 'border-l-4 border-l-transparent hover:bg-surface-2',
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        label={`Redact ${TYPE_LABELS[finding.type]} ending ${finding.display.slice(-4)}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onActivate()}
            className="min-w-0 text-left hover:underline hover:decoration-2 hover:underline-offset-4"
            aria-label={`Show ${TYPE_LABELS[finding.type]} in the document`}
          >
            <span className={cx('block truncate font-mono text-[14px] font-medium', revealed ? 'text-ink' : 'text-body')} title={revealed ? finding.text : undefined}>
              {revealed ? finding.text : finding.display}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReveal}
              className="p-0.5 text-muted hover:bg-marker hover:text-ink"
              aria-label={revealed ? 'Mask value' : 'Reveal value'}
              aria-pressed={revealed}
              title={revealed ? 'Mask value' : 'Reveal value'}
            >
              {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
            <RiskBadge risk={finding.risk} />
          </div>
        </div>

        <p className="mt-1 text-[13px] leading-snug text-body">{finding.reason}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {finding.visually_hidden && (
            <Tag className="border-danger bg-danger-soft text-danger-ink" title="Covered by a dark shape, but the text is still extractable">
              Hidden · extractable
            </Tag>
          )}
          <span className="ml-auto flex items-center gap-1 font-mono text-[11px] text-muted">
            {count > 1 && <span className="mr-0.5">×{count}</span>}
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onActivate(p)}
                className="border border-line px-1 py-px text-ink hover:border-ink hover:bg-marker"
                aria-label={`Show on page ${p}`}
              >
                p.{p}
              </button>
            ))}
          </span>
        </div>
      </div>
    </li>
  )
}
