import { ArrowLeft, Download } from 'lucide-react'
import type { AnalysisResponse, RedactionResult } from '../api/types'
import { USE_MOCK, api } from '../api/client'
import { TYPE_LABELS } from '../utils/findings'
import { BeforeAfterViewer } from './BeforeAfterViewer'
import { Button, cx } from './ui'

interface VerificationReportProps {
  analysis: AnalysisResponse
  result: RedactionResult
  onBack: () => void
}

export function VerificationReport({ analysis, result, onBack }: VerificationReportProps) {
  const v = result.verification
  const passed = v.status === 'passed'
  const byId = new Map(analysis.findings.map((f) => [f.id, f]))
  const redacted = result.redacted_finding_ids.map((id) => byId.get(id)).filter((f) => f !== undefined)
  const canDownload = !USE_MOCK && result.download_url !== ''

  const stats: [string, number, string?][] = [
    ['Locations redacted', v.locations_redacted],
    ['Values still detected', v.values_still_detected, v.values_still_detected > 0 ? 'text-danger' : 'text-success'],
    ['Pages checked', v.pages_checked],
  ]

  return (
    <div className="space-y-8">
      <section aria-label="Verification status" className="border-[1.5px] border-ink bg-surface">
        <div className={cx('flex flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:justify-between', passed ? 'bg-success text-white' : 'bg-danger text-white')}>
          <div role={passed ? 'status' : 'alert'}>
            <p className="tag text-white/75">02 / Verification</p>
            <h2 className="mt-2 font-display text-[34px] leading-none font-bold sm:text-[44px]">
              {passed ? 'Redaction Complete' : 'Verification Failed'}
            </h2>
            {!passed && (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/90">
                {v.values_still_detected} of the {v.values_tested} selected values can still be extracted from the output. Do not
                share this file.
              </p>
            )}
            {USE_MOCK && (
              <p className="mt-2 inline-block bg-paper px-1.5 font-mono text-[12px] font-semibold text-ink">Mock mode — no real redaction or verification happened.</p>
            )}
          </div>
          <div className="shrink-0">
            {canDownload ? (
              <a
                href={api.url(result.download_url)}
                download
                className={cx(
                  'inline-flex h-12 items-center justify-center gap-2.5 border-[1.5px] px-6 font-display text-[16px] font-semibold transition-colors',
                  passed ? 'border-ink bg-paper text-ink hover:bg-ink hover:text-paper' : 'border-white bg-transparent text-white hover:bg-white/15',
                )}
              >
                <Download className="size-4" strokeWidth={2.25} aria-hidden />
                {passed ? 'Download Redacted PDF' : 'Download Anyway (Unverified)'}
              </a>
            ) : (
              <Button size="lg" disabled icon={<Download className="size-4" aria-hidden />}>
                Download Unavailable In Mock Mode
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

        <dl className="grid border-t-[1.5px] border-ink sm:grid-cols-3">
          {stats.map(([label, value, tone], i) => (
            <div key={label} className={cx('flex flex-col-reverse px-6 py-5', i > 0 && 'border-line max-sm:border-t sm:border-l')}>
              <dt className="tag mt-2 text-muted">{label}</dt>
              <dd className={cx('font-display text-[48px] leading-none font-bold tabular-nums', tone ?? 'text-ink')}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <BeforeAfterViewer analysis={analysis} result={result} />

      <div className="panel">
        <section aria-label="Removed values" className="p-6">
          <h3 className="font-display text-[20px] font-bold text-ink">Removed Values</h3>
          <ul className="mt-4 grid border-t-[1.5px] border-ink md:grid-cols-2 md:gap-x-10">
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

      </div>

      <div>
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="size-4" aria-hidden />}>
          Back To Findings
        </Button>
      </div>
    </div>
  )
}
