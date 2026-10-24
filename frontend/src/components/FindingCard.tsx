import { useEffect, useRef } from 'react'
import { Eye, EyeOff, ScanEye } from 'lucide-react'
import type { Finding } from '../api/types'
import { TYPE_LABELS, pagesOf } from '../utils/findings'
import { Badge, Checkbox, RiskBadge, SourceBadges, cx } from './ui'

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
        'group flex gap-3 rounded-xl border p-3 transition-colors',
        active ? 'border-cyan-400/60 bg-cyan-400/[0.06]' : 'border-line bg-surface-2/60 hover:border-line-strong',
      )}
    >
      <Checkbox
        className="mt-1"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        label={`Redact ${TYPE_LABELS[finding.type]} ending ${finding.display.slice(-4)}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onActivate()}
            className="min-w-0 rounded text-left"
            aria-label={`Show ${TYPE_LABELS[finding.type]} in the document`}
          >
            <span
              className={cx('block truncate font-mono text-[13px]', revealed ? 'text-white' : 'tracking-wider text-slate-300')}
              title={revealed ? finding.text : undefined}
            >
              {revealed ? finding.text : finding.display}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onReveal}
              className="rounded p-1 text-subtle hover:bg-surface-3 hover:text-slate-200"
              aria-label={revealed ? 'Mask value' : 'Reveal value'}
              aria-pressed={revealed}
              title={revealed ? 'Mask value' : 'Reveal value'}
            >
              {revealed ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
            </button>
            <RiskBadge risk={finding.risk} />
          </div>
        </div>

        <p className="mt-1 text-[12.5px] leading-snug text-muted">{finding.reason}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SourceBadges finding={finding} />
          {finding.confidence && (
            <span className="text-[11px] text-subtle" title="Gemini's confidence in this finding">
              {finding.confidence} confidence
            </span>
          )}
          {finding.visually_hidden && (
            <Badge className="bg-red-500/12 text-red-200 ring-red-400/30" title="Covered by a dark shape, but the text is still extractable">
              <ScanEye className="size-3" aria-hidden />
              Hidden but extractable
            </Badge>
          )}
          <span className="ml-auto flex items-center gap-1 text-[11px] text-subtle">
            {count > 1 && <span>{count} places ·</span>}
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onActivate(p)}
                className="rounded px-1 py-0.5 font-medium text-muted hover:bg-surface-3 hover:text-cyan-200"
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
