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
    <section aria-label="Before and after" className="panel">
      <div className="flex h-14 items-center justify-between gap-2 border-b-[1.5px] border-ink px-5">
        <h3 className="font-display text-[20px] font-bold text-ink uppercase">Before / after</h3>
        <PageNav page={page} count={Math.min(analysis.pages.length, result.pages.length)} onChange={onPageChange} />
      </div>
      <div className="grid bg-surface md:grid-cols-2">
        <figure className="p-6">
          <figcaption className="mb-4 flex items-center gap-4">
            <span className="tag text-ink">Original</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
              <Swatch className="border-success" /> removed regions
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
        <figure className="border-ink p-6 max-md:border-t-[1.5px] md:border-l-[1.5px]">
          <figcaption className="tag mb-4 text-ink">Redacted output</figcaption>
          <DocumentViewer page={after} imageUrl={api.url(after.preview_url)} alt={`Redacted page ${after.page}`} reservedHeight={320} />
        </figure>
      </div>
    </section>
  )
}
