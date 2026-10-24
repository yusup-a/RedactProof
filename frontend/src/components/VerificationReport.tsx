import { AlertOctagon, ArrowLeft, Download, FileCheck2, Info, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
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
    ['Values still detected', v.values_still_detected, v.values_still_detected > 0 ? 'text-red-300' : 'text-emerald-300'],
    ['Pages checked', v.pages_checked],
  ]

  return (
    <div className="space-y-5">
      <section
        aria-label="Verification status"
        className={cx(
          'card overflow-hidden p-0',
          passed ? 'border-emerald-400/30' : 'border-red-400/40',
        )}
      >
        <div className={cx('flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between', passed ? 'bg-emerald-500/[0.07]' : 'bg-red-500/[0.08]')}>
          <div className="flex items-start gap-4" role={passed ? 'status' : 'alert'}>
            <div
              className={cx(
                'flex size-12 shrink-0 items-center justify-center rounded-xl border',
                passed ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-red-400/40 bg-red-400/10',
              )}
            >
              {passed ? <ShieldCheck className="size-6 text-emerald-300" aria-hidden /> : <AlertOctagon className="size-6 text-red-300" aria-hidden />}
            </div>
            <div>
              <h2 className={cx('text-xl font-semibold', passed ? 'text-emerald-100' : 'text-red-100')}>
                {passed ? 'Targeted text verification passed' : 'Verification failed'}
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
                {passed
                  ? `The redacted PDF was reopened and searched for all ${v.values_tested} selected value${v.values_tested === 1 ? '' : 's'}. None of them can be extracted anymore.`
                  : `${v.values_still_detected} of the ${v.values_tested} selected values can still be extracted from the output. Do not share this file.`}
              </p>
              {USE_MOCK && <p className="mt-1 text-xs font-semibold text-amber-300">Mock mode — no real redaction or verification happened.</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row md:flex-col lg:flex-row">
            {canDownload ? (
              <a
                href={api.url(result.download_url)}
                download
                className={cx(
                  'inline-flex h-12 items-center justify-center gap-2.5 rounded-lg px-6 text-[15px] font-medium transition-colors',
                  passed
                    ? 'bg-emerald-400 text-slate-950 shadow-[0_8px_24px_-10px_rgb(52_211_153/0.7)] hover:bg-emerald-300'
                    : 'border border-red-400/40 bg-surface-2 text-red-100 hover:bg-surface-3',
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
          <ul className="border-t border-red-400/20 px-6 py-4 text-[13px] text-red-100">
            {v.remaining.map((r) => {
              const f = byId.get(r.finding_id)
              return (
                <li key={r.finding_id} className="flex items-center gap-2 py-0.5">
                  <AlertOctagon className="size-3.5 text-red-300" aria-hidden />
                  {f ? TYPE_LABELS[f.type] : r.finding_id}
                  {f && <span className="font-mono text-red-200/70">{f.display}</span>}
                  <span className="text-red-200/70">still on page {r.pages.join(', ')}</span>
                </li>
              )
            })}
          </ul>
        )}

        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-5">
          {stats.map(([label, value, tone], i) => (
            <div key={label} className={cx('flex flex-col-reverse px-5 py-4', i > 0 && 'sm:border-l sm:border-line')}>
              <dt className="mt-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</dt>
              <dd className={cx('font-mono text-2xl font-semibold', tone ?? 'text-white')}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <BeforeAfterViewer analysis={analysis} result={result} page={page} onPageChange={onPageChange} />

      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="Removed values" className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileCheck2 className="size-4 text-cyan-300" aria-hidden /> Removed values
          </h3>
          <ul className="mt-3 space-y-1.5">
            {redacted.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-md bg-surface-2/60 px-2.5 py-1.5 text-[12.5px]">
                <span className="truncate text-slate-200">{TYPE_LABELS[f.type]}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-muted">
                  {f.display}
                  {f.locations.length > 1 && <span className="ml-1.5 text-subtle">×{f.locations.length}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Gemini contribution" className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="size-4 text-violet-300" aria-hidden /> Gemini contribution
          </h3>
          {analysis.gemini_status === 'ok' ? (
            <>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                <span className="font-mono text-2xl font-semibold text-violet-200">{viaGemini}</span>
                <span className="text-slate-300"> of {redacted.length}</span> removed values were identified by Gemini.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                {geminiOnly > 0 ? (
                  <>
                    <span className="font-medium text-violet-200">{geminiOnly}</span> {geminiOnly === 1 ? 'was' : 'were'} found by
                    Gemini alone — the pattern scanner would have missed {geminiOnly === 1 ? 'it' : 'them'}.
                  </>
                ) : (
                  'Every removed value was also caught by the pattern scanner.'
                )}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Gemini {analysis.gemini_status === 'unavailable' ? 'is not configured' : 'failed'} for this document, so every
              removed value came from deterministic pattern scanning.
            </p>
          )}
        </section>

        <section aria-label="Verification method and limitations" className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Info className="size-4 text-sky-300" aria-hidden /> What was checked
          </h3>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{v.method}</p>
          <h4 className="eyebrow mt-4">Limitations</h4>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-muted">
            {v.limitations.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-300" aria-hidden />
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
