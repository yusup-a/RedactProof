import type { AnalysisResponse, RedactionResult } from '../api/types'
import { PdfReader } from './PdfReader'
import { Swatch } from './ui'

interface BeforeAfterViewerProps {
  analysis: AnalysisResponse
  result: RedactionResult
}

export function BeforeAfterViewer({ analysis, result }: BeforeAfterViewerProps) {
  const redacted = new Set(result.redacted_finding_ids)
  const removed = analysis.findings.filter((f) => redacted.has(f.id))
  const redactedName = `${analysis.filename.replace(/\.pdf$/i, '')}-redacted.pdf`

  return (
    <section aria-label="Unredacted and redacted" className="panel">
      <div className="flex h-12 items-center">
        <h3 className="font-display text-[20px] font-bold text-ink">Unredacted / Redacted</h3>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <figure className="min-w-0">
          <figcaption className="flex h-10 items-center gap-4">
            <span className="text-[14px] font-semibold text-ink">Unredacted</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
              <Swatch className="border-success" /> redacted info
            </span>
          </figcaption>
          <PdfReader filename={analysis.filename} pages={analysis.pages} findings={removed} toneFor={() => 'redacted'} />
        </figure>
        <figure className="min-w-0">
          <figcaption className="flex h-10 items-center">
            <span className="text-[14px] font-semibold text-ink">Redacted</span>
          </figcaption>
          <PdfReader filename={redactedName} pages={result.pages} />
        </figure>
      </div>
    </section>
  )
}
