import { useState, type ReactNode } from 'react'
import { ImageOff } from 'lucide-react'
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
  overlay,
}: DocumentViewerProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const loaded = loadedUrl === imageUrl
  const failed = failedUrl === imageUrl
  const ratio = page.width / page.height

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-page ring-1 ring-line"
      style={{
        aspectRatio: `${page.width} / ${page.height}`,
        width: `min(100%, max(320px, calc((100vh - ${reservedHeight}px) * ${ratio})))`,
      }}
    >
      {!failed && (
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          onLoad={() => setLoadedUrl(imageUrl)}
          onError={() => setFailedUrl(imageUrl)}
          className={cx('absolute inset-0 h-full w-full select-none transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
      {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-surface-3" aria-hidden />}
      {failed && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-2 p-6 text-center text-sm text-muted">
          <ImageOff className="size-6 text-subtle" aria-hidden />
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
                tone={toneFor?.(finding, loc.visually_hidden)}
                onClick={onFindingClick && (() => onFindingClick(finding.id))}
              />
            )),
        )}
      {overlay}
    </div>
  )
}
