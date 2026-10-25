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
  /** Scroll this box into view when it becomes active (or when scrollKey changes while active). */
  scrollOnActive?: boolean
  scrollKey?: number
  onClick?: () => void
}

/** One outlined region over the page preview, positioned in PDF points scaled to the displayed image. */
export function FindingHighlight({ finding, location, pageWidth, pageHeight, selected, active, tone = 'risk', scrollOnActive = false, scrollKey, onClick }: FindingHighlightProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!active || !scrollOnActive || !el) return
    // Scroll only the reader, not the whole page.
    const scroller = el.closest<HTMLElement>('[data-scroll-container]')
    if (!scroller) return el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const box = el.getBoundingClientRect()
    const view = scroller.getBoundingClientRect()
    scroller.scrollBy({
      top: box.top - view.top - view.height / 2 + box.height / 2,
      left: box.left < view.left || box.right > view.right ? box.left - view.left - view.width / 2 + box.width / 2 : 0,
      behavior: 'smooth',
    })
  }, [active, scrollOnActive, scrollKey])

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
