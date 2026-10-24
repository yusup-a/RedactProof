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
      ? 'border-danger border-dashed bg-danger/10'
      : tone === 'redacted'
        ? 'border-success bg-success/8'
        : selected
          ? RISK_BOX[finding.risk]
          : 'border-dashed border-subtle bg-transparent'

  const label = `${TYPE_LABELS[finding.type]}, ${finding.risk} risk${location.visually_hidden ? ', hidden under a black box' : ''}`
  const className = cx(
    'absolute rounded-[3px] border-[1.5px] transition-[box-shadow,background-color] duration-150',
    toneClass,
    active && 'z-10 animate-highlight ring-2 ring-accent ring-offset-1 ring-offset-white',
    onClick && 'cursor-pointer hover:bg-accent/15',
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
