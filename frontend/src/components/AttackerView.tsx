import { useMemo, useState } from 'react'
import { AlertOctagon, Copy, EyeOff, FileText, Info, ScanEye, ShieldCheck, Terminal } from 'lucide-react'
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
    <div className="space-y-5">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Terminal className="size-5 text-cyan-300" aria-hidden />
            Attacker View
          </h2>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Left is what a person sees. Right is what anyone with copy-paste, a search box or a PDF parser gets — the
            text layer, exactly as the backend extracted it.
          </p>
        </div>
        <div role="radiogroup" aria-label="Document version" className="flex shrink-0 rounded-lg border border-line bg-surface-2 p-1">
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
                'rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                mode === m ? 'bg-surface-3 text-white shadow-sm ring-1 ring-line-strong' : 'text-muted hover:text-slate-200',
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
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3.5">
          <AlertOctagon className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
          <div className="text-[13.5px] leading-relaxed text-red-50">
            <p className="font-semibold text-red-100">
              {hiddenFindings.length} sensitive value{hiddenFindings.length === 1 ? ' is' : 's are'} covered by a black box but
              still extractable.
            </p>
            <p className="mt-0.5 text-red-100/80">
              The backend found{' '}
              {hiddenFindings.map((f, i) => (
                <span key={f.id}>
                  {i > 0 && ', '}
                  <span className="font-medium text-red-50">{TYPE_LABELS[f.type].toLowerCase()}</span>
                </span>
              ))}{' '}
              text underneath a dark filled shape. It looks redacted, but the characters are still in the file.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3.5 text-[13.5px] text-muted">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-300" aria-hidden />
          <p>
            No text hidden under black boxes was detected in this PDF. The extracted text still shows everything a machine
            can read — including any sensitive value you haven't redacted yet.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Visual view" className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileText className="size-4 text-muted" aria-hidden /> Visual View
              <span className="font-normal text-muted">· {showAfter ? 'redacted output' : 'original'}</span>
            </h3>
            <PageNav page={current.page} count={pages.length} onChange={onPageChange} />
          </div>
          <DocumentViewer
            page={current}
            imageUrl={api.url(current.preview_url)}
            alt={`${showAfter ? 'Redacted' : 'Original'} page ${current.page}`}
            findings={!showAfter && revealed ? hiddenOnPage : []}
            toneFor={() => 'hidden'}
            reservedHeight={420}
          />
        </section>

        <section aria-label="Extracted text" className="card flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Copy className="size-4 text-muted" aria-hidden /> Extracted Text
              <span className="font-normal text-muted">· page {current.page}</span>
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
            className="max-h-[calc(100vh-420px)] min-h-[320px] flex-1 overflow-auto rounded-lg border border-line bg-[#050911] p-4 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-slate-300"
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
                    after={showAfter}
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
  after: boolean
  stillPresent: boolean
  notSelected: boolean
}

function ValueMark({ finding, revealed, hidden, after, stillPresent, notSelected }: ValueMarkProps) {
  const label = TYPE_LABELS[finding.type]
  if (!revealed) {
    return (
      <span className="rounded bg-slate-700/60 px-1 text-slate-400" title={`${label} (masked)`}>
        {finding.display}
      </span>
    )
  }
  const tone =
    hidden || stillPresent
      ? 'bg-red-500/25 text-red-100 ring-1 ring-red-400/60'
      : after && notSelected
        ? 'bg-amber-400/10 text-amber-100 ring-1 ring-amber-400/30'
        : 'bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/40'
  const note = hidden
    ? 'hidden under a black box in the visual view'
    : stillPresent
      ? 'still extractable after redaction'
      : notSelected
        ? 'not selected for redaction'
        : 'visible and extractable'
  return (
    <mark className={cx('rounded px-0.5 font-semibold', tone)} title={`${label} — ${note}`}>
      {finding.text}
      {hidden && <span className="ml-1 align-middle text-[10px] font-bold tracking-wide text-red-300 uppercase">hidden</span>}
    </mark>
  )
}

function Legend({ after }: { after: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-subtle">
      {after ? (
        <>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-500/60" /> Still extractable (verification failed)</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400/40" /> Detected but not selected</span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-500/60" /> Hidden under a black box, still extractable</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400/50" /> Visible sensitive value</span>
        </>
      )}
    </div>
  )
}

function AfterBanner({ result, findings }: { result: RedactionResult; findings: Finding[] }) {
  const v = result.verification
  if (v.status === 'passed') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3.5 text-[13.5px]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden />
        <p className="text-emerald-50">
          <span className="font-semibold">Targeted text verification passed.</span>{' '}
          <span className="text-emerald-100/80">
            None of the {v.values_tested} selected value{v.values_tested === 1 ? '' : 's'} can be extracted from the redacted
            output. Values you didn't select are still present.
          </span>
        </p>
      </div>
    )
  }
  const byId = new Map(findings.map((f) => [f.id, f]))
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3.5 text-[13.5px]">
      <AlertOctagon className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
      <p className="text-red-50">
        <span className="font-semibold">Verification failed.</span> {v.values_still_detected} selected value
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
    <section aria-label="Why black boxes are not redaction" className="card p-5">
      <h3 className="text-sm font-semibold text-white">Why a black box isn't redaction</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {points.map(([title, body], i) => (
          <div key={title} className="rounded-lg border border-line/70 bg-surface-2/40 p-3.5">
            <dt className="text-[13px] font-medium text-slate-100">
              <span className="mr-1.5 text-cyan-300">{i + 1}</span>
              {title}
            </dt>
            <dd className="mt-1 text-[12.5px] leading-snug text-muted">{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
