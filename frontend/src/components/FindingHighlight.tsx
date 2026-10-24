import { useEffect, useRef } from 'react'
import type { Finding, FindingLocation } from '../api/types'
import { TYPE_LABELS, bboxToPercent } from '../utils/findings'
import { RISK_BOX, cx } from './ui'

export type HighlightTone = 'risk' | 'hidden' | 'redacted'

interface FindingHighlightProps {
  finding: Finding
  location: FindingLocation
  pageWidth: number
  pageHeight: number
  selected: boolean
  active: boolean
  tone?: HighlightTone
  onClick?: () => void
}

/** One outlined region over the page preview, positioned in PDF points scaled to the displayed image. */
export function FindingHighlight({ finding, location, pageWidth, pageHeight, selected, active, tone = 'risk', onClick }: FindingHighlightProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])

  const style = bboxToPercent(location.bbox, pageWidth, pageHeight, 2)
  const toneClass =
    tone === 'hidden'
      ? 'border-danger border-dashed bg-danger/15'
      : tone === 'redacted'
        ? 'border-success bg-success/10'
        : active
          ? 'border-ink bg-marker/55'
          : selected
            ? RISK_BOX[finding.risk]
            : 'border-dashed border-subtle bg-transparent'

  const label = `${TYPE_LABELS[finding.type]}, ${finding.risk} risk${location.visually_hidden ? ', hidden under a black box' : ''}`
  const className = cx(
    'absolute border-2 transition-colors duration-100',
    toneClass,
    active && 'z-10 animate-highlight',
    onClick && 'cursor-pointer hover:bg-marker/45',
  )

  if (!onClick) return <span className={className} style={style} title={label} aria-hidden />
  return (
    <button
      ref={ref}
      type="button"
      // Re-mount on activation so the pulse animation replays.
      key={active ? 'active' : 'idle'}
      className={className}
      style={style}
      onClick={onClick}
      title={label}
      aria-label={`Show finding: ${label}`}
      aria-pressed={active}
    />
  )
}
