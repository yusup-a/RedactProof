import { useMemo, useState } from 'react'
import { AlertCircle, EyeOff, Info, ScanEye, ShieldCheck } from 'lucide-react'
import type { AnalysisResponse, Finding, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { TYPE_LABELS, segmentText } from '../utils/findings'
import { DocumentViewer } from './DocumentViewer'
import { Button, PageNav, cx } from './ui'

type Mode = 'before' | 'after'

interface AttackerViewProps {
  analysis: AnalysisResponse
  result: RedactionResult | null
  page: number
  onPageChange: (page: number) => void
}

const hiddenOn = (f: Finding, page: number) => f.locations.some((l) => l.page === page && l.visually_hidden)

export function AttackerView({ analysis, result, page, onPageChange }: AttackerViewProps) {
  const [mode, setMode] = useState<Mode>('before')
  const [revealed, setRevealed] = useState(false)
  const showAfter = mode === 'after' && result !== null

  const pages = showAfter ? result.pages : analysis.pages
  const current = pages.find((p) => p.page === page) ?? pages[0]
  const hiddenFindings = analysis.findings.filter((f) => f.visually_hidden)
  const hiddenOnPage = analysis.findings.filter((f) => hiddenOn(f, current.page))

  const redacted = useMemo(() => new Set(result?.redacted_finding_ids ?? []), [result])
  const remaining = useMemo(() => new Set(result?.verification.remaining.map((r) => r.finding_id) ?? []), [result])
  const segments = useMemo(() => segmentText(current.extracted_text, analysis.findings), [current, analysis.findings])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">Attacker View</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Left is what a person sees. Right is what anyone with copy-paste, a search box or a PDF parser gets — the
            text layer, exactly as the backend extracted it.
          </p>
        </div>
        <div role="radiogroup" aria-label="Document version" className="flex shrink-0 rounded-lg border border-line bg-surface-3 p-0.5">
          {(['before', 'after'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              disabled={m === 'after' && !result}
              onClick={() => setMode(m)}
              title={m === 'after' && !result ? 'Redact findings first' : undefined}
              className={cx(
                'rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                mode === m ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink',
              )}
            >
              {m === 'before' ? 'Original PDF' : 'Redacted output'}
            </button>
          ))}
        </div>
      </div>

      {showAfter ? (
        <AfterBanner result={result} findings={analysis.findings} />
      ) : hiddenFindings.length > 0 ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger-line bg-danger-soft px-4 py-3.5">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-danger-ink">
              {hiddenFindings.length} sensitive value{hiddenFindings.length === 1 ? ' is' : 's are'} covered by a black box but
              still extractable.
            </p>
            <p className="mt-0.5 text-body">
              The backend found{' '}
              {hiddenFindings.map((f, i) => (
                <span key={f.id}>
                  {i > 0 && ', '}
                  <span className="font-medium text-ink">{TYPE_LABELS[f.type].toLowerCase()}</span>
                </span>
              ))}{' '}
              text underneath a dark filled shape. It looks redacted, but the characters are still in the file.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-sm text-muted shadow-xs">
          <Info className="mt-0.5 size-5 shrink-0 text-subtle" aria-hidden />
          <p>
            No text hidden under black boxes was detected in this PDF. The extracted text still shows everything a machine
            can read — including any sensitive value you haven't redacted yet.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Visual view" className="card flex flex-col overflow-hidden">
          <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
            <h3 className="text-sm font-semibold text-ink">
              Visual View <span className="font-normal text-muted">· {showAfter ? 'redacted output' : 'original'}</span>
            </h3>
            <PageNav page={current.page} count={pages.length} onChange={onPageChange} />
          </div>
          <div className="flex-1 bg-surface-2 p-5">
            <DocumentViewer
              page={current}
              imageUrl={api.url(current.preview_url)}
              alt={`${showAfter ? 'Redacted' : 'Original'} page ${current.page}`}
              findings={!showAfter && revealed ? hiddenOnPage : []}
              toneFor={() => 'hidden'}
              reservedHeight={440}
            />
          </div>
        </section>

        <section aria-label="Extracted text" className="card flex flex-col overflow-hidden">
          <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
            <h3 className="text-sm font-semibold text-ink">
              Extracted Text <span className="font-normal text-muted">· page {current.page}</span>
            </h3>
            <Button
              variant={revealed ? 'secondary' : 'danger'}
              size="sm"
              onClick={() => setRevealed((r) => !r)}
              aria-pressed={revealed}
              icon={revealed ? <EyeOff className="size-3.5" aria-hidden /> : <ScanEye className="size-3.5" aria-hidden />}
            >
              {revealed ? 'Mask values' : 'Reveal Extractable Data'}
            </Button>
          </div>
          <pre
            className="max-h-[calc(100vh-400px)] min-h-[320px] flex-1 overflow-auto bg-surface-2 p-5 font-mono text-[12.5px] leading-[1.75] whitespace-pre-wrap text-body"
            aria-label={`Text extracted from page ${current.page}`}
          >
            {current.extracted_text.trim() === '' ? (
              <span className="text-subtle italic">No extractable text on this page.</span>
            ) : (
              segments.map((seg, i) =>
                seg.finding ? (
                  <ValueMark
                    key={i}
                    finding={seg.finding}
                    revealed={revealed}
                    hidden={!showAfter && hiddenOn(seg.finding, current.page)}
                    stillPresent={remaining.has(seg.finding.id)}
                    notSelected={showAfter && !redacted.has(seg.finding.id)}
                  />
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )
            )}
          </pre>
          <Legend after={showAfter} />
        </section>
      </div>

      <WhyBoxesFail />
    </div>
  )
}

interface ValueMarkProps {
  finding: Finding
  revealed: boolean
  hidden: boolean
  stillPresent: boolean
  notSelected: boolean
}

function ValueMark({ finding, revealed, hidden, stillPresent, notSelected }: ValueMarkProps) {
  const label = TYPE_LABELS[finding.type]
  if (!revealed) {
    return (
      <span className="rounded bg-line px-1 text-muted" title={`${label} (masked)`}>
        {finding.display}
      </span>
    )
  }
  const danger = hidden || stillPresent
  const note = hidden
    ? 'hidden under a black box in the visual view'
    : stillPresent
      ? 'still extractable after redaction'
      : notSelected
        ? 'not selected for redaction'
        : 'visible and extractable'
  return (
    <mark
      className={cx(
        'rounded px-0.5 font-semibold ring-1',
        danger ? 'bg-danger-soft text-danger-ink ring-danger-line' : 'bg-warning-soft text-warning-ink ring-warning-line',
      )}
      title={`${label} — ${note}`}
    >
      {finding.text}
      {hidden && <span className="ml-1.5 rounded-sm bg-danger px-1 align-middle font-sans text-[10px] font-semibold text-white">Hidden</span>}
    </mark>
  )
}

function Legend({ after }: { after: boolean }) {
  const item = (swatch: string, text: string) => (
    <span className="flex items-center gap-1.5">
      <span className={cx('size-2.5 rounded-sm', swatch)} aria-hidden />
      {text}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-3 text-xs text-muted">
      {after ? (
        <>
          {item('bg-danger', 'Still extractable (verification failed)')}
          {item('bg-warning', 'Detected but not selected')}
        </>
      ) : (
        <>
          {item('bg-danger', 'Hidden under a black box, still extractable')}
          {item('bg-warning', 'Visible sensitive value')}
        </>
      )}
    </div>
  )
}

function AfterBanner({ result, findings }: { result: RedactionResult; findings: Finding[] }) {
  const v = result.verification
  if (v.status === 'passed') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-success-line bg-success-soft px-4 py-3.5 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-ink" aria-hidden />
        <p className="text-body">
          <span className="font-semibold text-success-ink">Targeted text verification passed.</span> None of the{' '}
          {v.values_tested} selected value{v.values_tested === 1 ? '' : 's'} can be extracted from the redacted output.
          Values you didn't select are still present.
        </p>
      </div>
    )
  }
  const byId = new Map(findings.map((f) => [f.id, f]))
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger-line bg-danger-soft px-4 py-3.5 text-sm">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <p className="text-body">
        <span className="font-semibold text-danger-ink">Verification failed.</span> {v.values_still_detected} selected value
        {v.values_still_detected === 1 ? ' is' : 's are'} still extractable:{' '}
        {v.remaining.map((r) => `${TYPE_LABELS[byId.get(r.finding_id)?.type ?? 'OTHER']} (page ${r.pages.join(', ')})`).join('; ')}.
      </p>
    </div>
  )
}

function WhyBoxesFail() {
  const points = [
    ['A PDF keeps text and drawings separately.', 'A black rectangle is just another shape painted on top of the page.'],
    ['Covering changes how a page looks, not what it contains.', 'The characters underneath stay in the file’s text layer.'],
    ['Machines read the text layer.', 'Copy-paste, search, screen readers, indexers and scripts all ignore the box.'],
    ['Real redaction deletes the text.', 'RedactProof removes the characters from the PDF, rewrites the file, then re-reads it to verify.'],
  ]
  return (
    <section aria-label="Why black boxes are not redaction" className="card p-6">
      <h3 className="text-[16px] font-semibold text-ink">Why a black box isn't redaction</h3>
      <dl className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {points.map(([title, body], i) => (
          <div key={title}>
            <dt className="text-sm font-semibold text-ink">
              <span className="mb-2 flex size-6 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-body">{i + 1}</span>
              {title}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted">{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
