import type { AnalysisResponse, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { DocumentViewer } from './DocumentViewer'
import { PageNav } from './ui'

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
    <section aria-label="Before and after" className="card p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Before / after</h3>
        <PageNav page={page} count={Math.min(analysis.pages.length, result.pages.length)} onChange={onPageChange} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <figure>
          <figcaption className="mb-2 flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-slate-200">Original</span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-sm border border-emerald-400" /> removed regions
            </span>
          </figcaption>
          <DocumentViewer
            page={before}
            imageUrl={api.url(before.preview_url)}
            alt={`Original page ${before.page}`}
            findings={removed}
            toneFor={() => 'redacted'}
            reservedHeight={300}
          />
        </figure>
        <figure>
          <figcaption className="mb-2 text-xs font-medium text-slate-200">Redacted output</figcaption>
          <DocumentViewer page={after} imageUrl={api.url(after.preview_url)} alt={`Redacted page ${after.page}`} reservedHeight={300} />
        </figure>
      </div>
    </section>
  )
}
