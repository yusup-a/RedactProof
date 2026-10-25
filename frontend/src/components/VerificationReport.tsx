import { ArrowLeft, Download } from 'lucide-react'
import type { AnalysisResponse, RedactionResult } from '../api/types'
import { USE_MOCK, api } from '../api/client'
import { TYPE_LABELS } from '../utils/findings'
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
  const canDownload = !USE_MOCK && result.download_url !== ''

  const stats: [string, number, string?][] = [
    ['Selected findings', v.selected_findings],
    ['Values tested', v.values_tested],
    ['Locations redacted', v.locations_redacted],
    ['Values still detected', v.values_still_detected, v.values_still_detected > 0 ? 'text-danger' : 'text-success'],
    ['Pages checked', v.pages_checked],
  ]

  return (
    <div className="space-y-8">
      <section aria-label="Verification status" className="border-[1.5px] border-ink bg-surface shadow-hard">
        <div className={cx('flex flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:justify-between', passed ? 'bg-success text-white' : 'bg-danger text-white')}>
          <div role={passed ? 'status' : 'alert'}>
            <p className="tag text-white/75">03 / Verification</p>
            <h2 className="mt-2 font-display text-[34px] leading-none font-bold uppercase sm:text-[44px]">
              {passed ? 'Targeted text verification passed' : 'Verification failed'}
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/90">
              {passed
                ? `The redacted PDF was reopened and searched for all ${v.values_tested} selected value${v.values_tested === 1 ? '' : 's'}. None of them can be extracted anymore.`
                : `${v.values_still_detected} of the ${v.values_tested} selected values can still be extracted from the output. Do not share this file.`}
            </p>
            {USE_MOCK && (
              <p className="mt-2 inline-block bg-marker px-1.5 font-mono text-[12px] font-semibold text-ink">Mock mode — no real redaction or verification happened.</p>
            )}
          </div>
          <div className="shrink-0">
            {canDownload ? (
              <a
                href={api.url(result.download_url)}
                download
                className={cx(
                  'inline-flex h-12 items-center justify-center gap-2.5 border-[1.5px] px-6 font-display text-[16px] font-semibold tracking-[0.03em] uppercase transition-colors',
                  passed ? 'border-ink bg-paper text-ink shadow-hard hover:bg-marker' : 'border-white bg-transparent text-white hover:bg-white/15',
                )}
              >
                <Download className="size-4" strokeWidth={2.25} aria-hidden />
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
          <ul className="border-t-[1.5px] border-ink bg-danger-soft px-6 py-3 font-mono text-[13px] text-danger-ink">
            {v.remaining.map((r) => {
              const f = byId.get(r.finding_id)
              return (
                <li key={r.finding_id} className="py-0.5">
                  ✕ {f ? TYPE_LABELS[f.type] : r.finding_id} {f && f.display} — still on page {r.pages.join(', ')}
                </li>
              )
            })}
          </ul>
        )}

        <dl className="grid grid-cols-2 border-t-[1.5px] border-ink sm:grid-cols-5">
          {stats.map(([label, value, tone], i) => (
            <div key={label} className={cx('flex flex-col-reverse px-6 py-5', i > 0 && 'sm:border-l sm:border-line', 'max-sm:border-b max-sm:border-line')}>
              <dt className="tag mt-2 text-muted">{label}</dt>
              <dd className={cx('font-display text-[48px] leading-none font-bold tabular-nums', tone ?? 'text-ink')}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <BeforeAfterViewer analysis={analysis} result={result} page={page} onPageChange={onPageChange} />

      <div className="grid border-[1.5px] border-ink bg-surface lg:grid-cols-2">
        <section aria-label="Removed values" className="p-6">
          <h3 className="font-display text-[20px] font-bold text-ink uppercase">Removed values</h3>
          <ul className="mt-4 border-t-[1.5px] border-ink">
            {redacted.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 border-b border-line py-2 text-[14px]">
                <span className="truncate text-ink">{TYPE_LABELS[f.type]}</span>
                <span className="shrink-0 font-mono text-[12px] text-muted">
                  {f.display}
                  {f.locations.length > 1 && <span className="ml-1.5 text-ink">×{f.locations.length}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Verification method and limitations" className="border-ink p-6 max-lg:border-t-[1.5px] lg:border-l-[1.5px]">
          <h3 className="font-display text-[20px] font-bold text-ink uppercase">What was checked</h3>
          <p className="mt-4 text-[14px] leading-relaxed text-body">{v.method}</p>
          <h4 className="tag mt-5 text-ink">Limitations</h4>
          <ul className="mt-2 space-y-2 text-[14px] leading-snug text-body">
            {v.limitations.map((l) => (
              <li key={l} className="flex gap-2.5">
                <span className="mt-[7px] size-1.5 shrink-0 bg-warning" aria-hidden />
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
        <Button variant="secondary" onClick={onStartOver}>
          Redact another PDF
        </Button>
      </div>
    </div>
  )
}
