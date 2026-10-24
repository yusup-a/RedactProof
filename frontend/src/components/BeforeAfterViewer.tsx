import type { AnalysisResponse, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { DocumentViewer } from './DocumentViewer'
import { PageNav, Swatch } from './ui'

interface BeforeAfterViewerProps {
  analysis: AnalysisResponse
  result: RedactionResult
  page: number
  onPageChange: (page: number) => void
}

export function BeforeAfterViewer({ analysis, result, page, onPageChange }: BeforeAfterViewerProps) {
  const before = analysis.pages.find((p) => p.page === page) ?? analysis.pages[0]
  const after = result.pages.find((p) => p.page === page) ?? result.pages[0]
  const redacted = new Set(result.redacted_finding_ids)
  const removed = analysis.findings.filter((f) => redacted.has(f.id))

  return (
    <section aria-label="Before and after" className="card overflow-hidden">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-5">
        <h3 className="text-sm font-semibold text-ink">Before / after</h3>
        <PageNav page={page} count={Math.min(analysis.pages.length, result.pages.length)} onChange={onPageChange} />
      </div>
      <div className="grid gap-6 bg-surface-2 p-6 md:grid-cols-2">
        <figure>
          <figcaption className="mb-3 flex items-center gap-3 text-[13px] text-muted">
            <span className="font-semibold text-ink">Original</span>
            <span className="inline-flex items-center gap-1.5">
              <Swatch className="border-success bg-success/10" /> removed regions
            </span>
          </figcaption>
          <DocumentViewer
            page={before}
            imageUrl={api.url(before.preview_url)}
            alt={`Original page ${before.page}`}
            findings={removed}
            toneFor={() => 'redacted'}
            reservedHeight={320}
          />
        </figure>
        <figure>
          <figcaption className="mb-3 text-[13px] font-semibold text-ink">Redacted output</figcaption>
          <DocumentViewer page={after} imageUrl={api.url(after.preview_url)} alt={`Redacted page ${after.page}`} reservedHeight={320} />
        </figure>
      </div>
    </section>
  )
}
