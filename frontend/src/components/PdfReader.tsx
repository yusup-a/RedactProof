import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Minus, MoveHorizontal, Plus } from 'lucide-react'
import type { DocumentPage, Finding } from '../api/types'
import { api } from '../api/client'
import { DocumentViewer } from './DocumentViewer'
import { cx } from './ui'

/** CSS pixels per PDF point at 100% zoom (96 dpi / 72 pt per inch), like a browser's PDF viewer. */
const PX_PER_PT = 96 / 72
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const PAGE_GAP = 12
const PADDING = 20

interface PdfReaderProps {
  filename: string
  pages: DocumentPage[]
  findings: Finding[]
  selectedIds: Set<string>
  activeId: string | null
  /** Page whose box for the active finding should be scrolled to, and a key that re-triggers the scroll. */
  focusPage: number | null
  focusKey: number
  onFindingClick: (id: string, page: number) => void
}

/** Continuous-scroll page view modelled on a browser's built-in PDF viewer, with finding overlays. */
export function PdfReader({ filename, pages, findings, selectedIds, activeId, focusPage, focusKey, onFindingClick }: PdfReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [available, setAvailable] = useState(0)
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [current, setCurrent] = useState(1)

  // Track the width available for "fit to width".
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setAvailable(el.clientWidth - PADDING * 2)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const widest = Math.max(...pages.map((p) => p.width))
  const fitZoom = available > 0 ? available / (widest * PX_PER_PT) : 1
  const scale = zoom === 'fit' ? fitZoom : zoom
  const percent = Math.round(scale * 100)

  function updateCurrent() {
    const el = scrollRef.current
    if (!el) return
    const probe = el.scrollTop + el.clientHeight * 0.3
    let page = 1
    pageRefs.current.forEach((node, i) => {
      if (node && node.offsetTop <= probe) page = i + 1
    })
    setCurrent(page)
  }

  // Keep the page indicator right after zooming or resizing.
  useEffect(updateCurrent, [scale])

  function goTo(page: number) {
    const el = scrollRef.current
    const node = pageRefs.current[page - 1]
    if (el && node) el.scrollTo({ top: node.offsetTop - PADDING, behavior: 'smooth' })
  }

  function stepZoom(direction: 1 | -1) {
    const next = direction > 0 ? ZOOM_STEPS.find((z) => z > scale + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < scale - 0.001)
    if (next !== undefined) setZoom(next)
  }

  const barButton = 'flex size-8 items-center justify-center text-white/85 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent'

  return (
    <div className="flex flex-col">
      <div className="flex h-12 items-center gap-4 bg-reader-bar px-3 text-[13px] text-white/90">
        <span className="min-w-0 flex-1 truncate" title={filename}>
          {filename}
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
          <button type="button" className={barButton} onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label="Previous page">
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <span className="min-w-14 text-center tabular-nums" aria-live="polite" aria-label={`Page ${current} of ${pages.length}`}>
            {current} / {pages.length}
          </span>
          <button type="button" className={barButton} onClick={() => goTo(current + 1)} disabled={current >= pages.length} aria-label="Next page">
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
        <span className="h-5 w-px bg-white/20" aria-hidden />
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <button type="button" className={barButton} onClick={() => stepZoom(-1)} disabled={scale <= ZOOM_STEPS[0] + 0.001} aria-label="Zoom out">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="min-w-12 text-center tabular-nums">{percent}%</span>
          <button type="button" className={barButton} onClick={() => stepZoom(1)} disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.001} aria-label="Zoom in">
            <Plus className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={cx(barButton, zoom === 'fit' && 'bg-white/15 text-white')}
            onClick={() => setZoom('fit')}
            aria-label="Fit to width"
            aria-pressed={zoom === 'fit'}
            title="Fit to width"
          >
            <MoveHorizontal className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        data-scroll-container
        onScroll={updateCurrent}
        className="relative h-[calc(100vh-25.5rem)] min-h-[420px] overflow-auto bg-reader-bg"
        style={{ padding: PADDING }}
      >
        <div className="mx-auto flex w-max min-w-full flex-col items-center" style={{ gap: PAGE_GAP }}>
          {available > 0 &&
            pages.map((page, i) => (
              <div
                key={page.page}
                ref={(node) => {
                  pageRefs.current[i] = node
                }}
                data-page={page.page}
              >
                <DocumentViewer
                  page={page}
                  imageUrl={api.url(page.preview_url)}
                  alt={`Page ${page.page} of ${filename}`}
                  findings={findings}
                  selectedIds={selectedIds}
                  activeId={activeId}
                  onFindingClick={(id) => onFindingClick(id, page.page)}
                  width={Math.round(page.width * PX_PER_PT * scale)}
                  framed={false}
                  scrollToActive={focusPage === page.page}
                  focusKey={focusKey}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
