import { useState, type ReactNode } from 'react'
import type { DocumentPage, Finding } from '../api/types'
import { FindingHighlight, type HighlightTone } from './FindingHighlight'
import { cx } from './ui'

interface DocumentViewerProps {
  page: DocumentPage
  imageUrl: string
  alt: string
  findings?: Finding[]
  selectedIds?: Set<string>
  activeId?: string | null
  onFindingClick?: (id: string) => void
  /** Picks a tone per location; defaults to risk colors. */
  toneFor?: (finding: Finding, hidden: boolean) => HighlightTone
  /** Vertical space (px) reserved around the page, so it fits in the viewport without distortion. */
  reservedHeight?: number
  /** Exact display width in px; overrides the viewport-fit sizing. */
  width?: number
  /** Draw an ink outline around the page. */
  framed?: boolean
  /** When set, the active finding's first box on this page scrolls into view (re-run when focusKey changes). */
  scrollToActive?: boolean
  focusKey?: number
  overlay?: ReactNode
}

/**
 * Renders a page preview at its true aspect ratio, with finding regions positioned in
 * percentages of the page size — the same math as `scale = displayWidth / page.width`.
 */
export function DocumentViewer({
  page,
  imageUrl,
  alt,
  findings = [],
  selectedIds,
  activeId,
  onFindingClick,
  toneFor,
  reservedHeight = 260,
  width,
  framed = true,
  scrollToActive = false,
  focusKey,
  overlay,
}: DocumentViewerProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const loaded = loadedUrl === imageUrl
  const failed = failedUrl === imageUrl
  const ratio = page.width / page.height

  return (
    <div
      className={cx('relative mx-auto shrink-0 overflow-hidden bg-white', framed && 'border-[1.5px] border-ink')}
      style={{
        aspectRatio: `${page.width} / ${page.height}`,
        width: width !== undefined ? `${width}px` : `min(100%, max(320px, calc((100vh - ${reservedHeight}px) * ${ratio})))`,
      }}
    >
      {!failed && (
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          onLoad={() => setLoadedUrl(imageUrl)}
          onError={() => setFailedUrl(imageUrl)}
          className={cx('absolute inset-0 h-full w-full select-none transition-opacity duration-200', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
      {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-line/50" aria-hidden />}
      {failed && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-surface p-8 text-center font-mono text-[12px] leading-relaxed text-body">
          Preview unavailable. The session may have expired — upload the PDF again.
        </div>
      )}
      {loaded &&
        findings.flatMap((finding) =>
          finding.locations
            .filter((loc) => loc.page === page.page)
            .map((loc, i) => (
              <FindingHighlight
                key={`${finding.id}-${i}`}
                finding={finding}
                location={loc}
                pageWidth={page.width}
                pageHeight={page.height}
                selected={selectedIds?.has(finding.id) ?? true}
                active={activeId === finding.id}
                scrollOnActive={scrollToActive && i === 0}
                scrollKey={focusKey}
                tone={toneFor?.(finding, loc.visually_hidden)}
                onClick={onFindingClick && (() => onFindingClick(finding.id))}
              />
            )),
        )}
      {overlay}
    </div>
  )
}
