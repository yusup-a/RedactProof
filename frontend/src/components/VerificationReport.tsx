import { AlertCircle, ArrowLeft, Download, RotateCcw, ShieldCheck } from 'lucide-react'
import type { AnalysisResponse, RedactionResult } from '../api/types'
import { USE_MOCK, api } from '../api/client'
import { TYPE_LABELS, sourceKind } from '../utils/findings'
import { BeforeAfterViewer } from './BeforeAfterViewer'
import { Button, cx } from './ui'

interface VerificationReportProps {
  analysis: AnalysisResponse
  result: RedactionResult
  page: number
  onPageChange: (page: number) => void
  onBack: () => void
  onStartOver: () => void
}

export function VerificationReport({ analysis, result, page, onPageChange, onBack, onStartOver }: VerificationReportProps) {
  const v = result.verification
  const passed = v.status === 'passed'
  const byId = new Map(analysis.findings.map((f) => [f.id, f]))
  const redacted = result.redacted_finding_ids.map((id) => byId.get(id)).filter((f) => f !== undefined)
  const viaGemini = redacted.filter((f) => f.source.includes('gemini')).length
  const geminiOnly = redacted.filter((f) => sourceKind(f) === 'gemini').length
  const canDownload = !USE_MOCK && result.download_url !== ''

  const stats: [string, number, string?][] = [
    ['Selected findings', v.selected_findings],
    ['Values tested', v.values_tested],
    ['Locations redacted', v.locations_redacted],
    ['Values still detected', v.values_still_detected, v.values_still_detected > 0 ? 'text-danger-ink' : 'text-success-ink'],
    ['Pages checked', v.pages_checked],
  ]

  return (
    <div className="space-y-6">
      <section aria-label="Verification status" className="card overflow-hidden">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4" role={passed ? 'status' : 'alert'}>
            <div
              className={cx(
                'flex size-12 shrink-0 items-center justify-center rounded-full border-[6px]',
                passed ? 'border-success-soft bg-success-line/60' : 'border-danger-soft bg-danger-line/60',
              )}
            >
              {passed ? <ShieldCheck className="size-5 text-success-ink" aria-hidden /> : <AlertCircle className="size-5 text-danger-ink" aria-hidden />}
            </div>
            <div>
              <h2 className={cx('text-[20px] font-semibold tracking-tight', passed ? 'text-ink' : 'text-danger-ink')}>
                {passed ? 'Targeted text verification passed' : 'Verification failed'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                {passed
                  ? `The redacted PDF was reopened and searched for all ${v.values_tested} selected value${v.values_tested === 1 ? '' : 's'}. None of them can be extracted anymore.`
                  : `${v.values_still_detected} of the ${v.values_tested} selected values can still be extracted from the output. Do not share this file.`}
              </p>
              {USE_MOCK && <p className="mt-1 text-[13px] font-semibold text-warning-ink">Mock mode — no real redaction or verification happened.</p>}
            </div>
          </div>
          <div className="flex shrink-0">
            {canDownload ? (
              <a
                href={api.url(result.download_url)}
                download
                className={cx(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold shadow-xs transition-colors',
                  passed ? 'bg-accent text-white hover:bg-accent-hover' : 'border border-danger-line bg-surface text-danger-ink hover:bg-danger-soft',
                )}
              >
                <Download className="size-4" aria-hidden />
                {passed ? 'Download Redacted PDF' : 'Download anyway (unverified)'}
              </a>
            ) : (
              <Button size="lg" disabled icon={<Download className="size-4" aria-hidden />}>
                Download unavailable in mock mode
              </Button>
            )}
          </div>
        </div>

        {!passed && v.remaining.length > 0 && (
          <ul className="border-t border-danger-line bg-danger-soft px-6 py-3 text-[13px] text-danger-ink">
            {v.remaining.map((r) => {
              const f = byId.get(r.finding_id)
              return (
                <li key={r.finding_id} className="flex items-center gap-2 py-0.5">
                  <AlertCircle className="size-3.5" aria-hidden />
                  <span className="font-medium">{f ? TYPE_LABELS[f.type] : r.finding_id}</span>
                  {f && <span className="font-mono">{f.display}</span>}
                  <span>still on page {r.pages.join(', ')}</span>
                </li>
              )
            })}
          </ul>
        )}

        <dl className="grid grid-cols-2 border-t border-line bg-surface-2 sm:grid-cols-5">
          {stats.map(([label, value, tone], i) => (
            <div key={label} className={cx('flex flex-col-reverse px-6 py-4', i > 0 && 'sm:border-l sm:border-line')}>
              <dt className="mt-0.5 text-[13px] text-muted">{label}</dt>
              <dd className={cx('text-[24px] leading-8 font-semibold tabular-nums', tone ?? 'text-ink')}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <BeforeAfterViewer analysis={analysis} result={result} page={page} onPageChange={onPageChange} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Removed values" className="card p-5">
          <h3 className="text-sm font-semibold text-ink">Removed values</h3>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {redacted.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                <span className="truncate text-body">{TYPE_LABELS[f.type]}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {f.display}
                  {f.locations.length > 1 && <span className="ml-1.5 font-sans text-subtle">×{f.locations.length}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Gemini contribution" className="card p-5">
          <h3 className="text-sm font-semibold text-ink">Gemini contribution</h3>
          {analysis.gemini_status === 'ok' ? (
            <>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-[30px] leading-9 font-semibold text-gemini-ink tabular-nums">{viaGemini}</span>
                <span className="text-sm text-muted">of {redacted.length} removed values were identified by Gemini.</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {geminiOnly > 0 ? (
                  <>
                    <span className="font-semibold text-ink">{geminiOnly}</span> {geminiOnly === 1 ? 'was' : 'were'} found by Gemini
                    alone — the pattern scanner would have missed {geminiOnly === 1 ? 'it' : 'them'}.
                  </>
                ) : (
                  'Every removed value was also caught by the pattern scanner.'
                )}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Gemini {analysis.gemini_status === 'unavailable' ? 'is not configured' : 'failed'} for this document, so every
              removed value came from deterministic pattern scanning.
            </p>
          )}
        </section>

        <section aria-label="Verification method and limitations" className="card p-5">
          <h3 className="text-sm font-semibold text-ink">What was checked</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{v.method}</p>
          <h4 className="label mt-4">Limitations</h4>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-muted">
            {v.limitations.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                {l}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="size-4" aria-hidden />}>
          Back to findings
        </Button>
        <Button variant="secondary" onClick={onStartOver} icon={<RotateCcw className="size-4" aria-hidden />}>
          Redact another PDF
        </Button>
      </div>
    </div>
  )
}
