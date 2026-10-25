import { useMemo, useState } from 'react'
import type { AnalysisResponse, Finding, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { TYPE_LABELS, segmentText } from '../utils/findings'
import { DocumentViewer } from './DocumentViewer'
import { PageNav, SectionTitle, cx } from './ui'

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
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTitle index="02">Attacker View</SectionTitle>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-body">
            Left is what a person sees. Right is what anyone with copy-paste, a search box or a PDF parser gets — the text
            layer, exactly as the backend extracted it.
          </p>
        </div>
        <div role="radiogroup" aria-label="Document version" className="flex shrink-0 -space-x-[1.5px]">
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
                'h-10 border-[1.5px] border-ink px-4 font-display text-[14px] font-semibold tracking-[0.03em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                mode === m ? 'relative z-10 bg-ink text-paper' : 'bg-surface text-ink hover:bg-marker',
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
        <div role="alert" className="border-[1.5px] border-danger bg-danger px-5 py-4 text-white">
          <p className="font-display text-[22px] leading-tight font-bold uppercase">
            {hiddenFindings.length} sensitive value{hiddenFindings.length === 1 ? ' is' : 's are'} covered by a black box but
            still extractable.
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-white/90">
            The backend found{' '}
            {hiddenFindings.map((f, i) => (
              <span key={f.id}>
                {i > 0 && ', '}
                <span className="font-semibold text-white">{TYPE_LABELS[f.type].toLowerCase()}</span>
              </span>
            ))}{' '}
            text underneath a dark filled shape. It looks redacted, but the characters are still in the file.
          </p>
        </div>
      ) : (
        <div className="border-l-4 border-ink py-1 pl-4 text-[15px] leading-relaxed text-body">
          No text hidden under black boxes was detected in this PDF. The extracted text still shows everything a machine can
          read — including any sensitive value you haven't redacted yet.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Visual view" className="panel flex flex-col">
          <div className="flex h-14 items-center justify-between gap-2 border-b-[1.5px] border-ink px-4">
            <h3 className="tag text-ink">
              Visual View <span className="text-muted">/ {showAfter ? 'redacted output' : 'original'}</span>
            </h3>
            <PageNav page={current.page} count={pages.length} onChange={onPageChange} />
          </div>
          <div className="flex-1 bg-surface-3 p-6">
            <DocumentViewer
              page={current}
              imageUrl={api.url(current.preview_url)}
              alt={`${showAfter ? 'Redacted' : 'Original'} page ${current.page}`}
              findings={!showAfter && revealed ? hiddenOnPage : []}
              toneFor={() => 'hidden'}
              reservedHeight={460}
            />
          </div>
        </section>

        <section aria-label="Extracted text" className="flex flex-col border-[1.5px] border-ink bg-ink">
          <div className="flex h-14 items-center justify-between gap-2 border-b border-white/15 px-4">
            <h3 className="tag text-paper">
              Extracted Text <span className="text-paper/50">/ page {current.page}</span>
            </h3>
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              aria-pressed={revealed}
              className={cx(
                'h-8 border-[1.5px] px-3 font-display text-[13px] font-semibold tracking-[0.03em] uppercase transition-colors',
                revealed ? 'border-paper/40 text-paper hover:border-paper' : 'border-marker bg-marker text-ink hover:bg-paper hover:border-paper',
              )}
            >
              {revealed ? 'Mask values' : 'Reveal Extractable Data'}
            </button>
          </div>
          <pre
            className="max-h-[calc(100vh-420px)] min-h-[340px] flex-1 overflow-auto p-5 font-mono text-[13px] leading-[1.8] whitespace-pre-wrap text-paper/85"
            aria-label={`Text extracted from page ${current.page}`}
          >
            {current.extracted_text.trim() === '' ? (
              <span className="text-paper/50 italic">No extractable text on this page.</span>
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
      <span className="bg-paper/15 px-0.5 text-paper/60" title={`${label} (masked)`}>
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
    <mark className={cx('px-0.5 font-semibold', danger ? 'bg-danger text-white' : 'bg-marker text-ink')} title={`${label} — ${note}`}>
      {finding.text}
      {hidden && <span className="ml-1.5 border border-white/70 px-1 align-middle text-[10px] font-semibold tracking-[0.08em] uppercase">Hidden</span>}
    </mark>
  )
}

function Legend({ after }: { after: boolean }) {
  const item = (swatch: string, text: string) => (
    <span className="flex items-center gap-2">
      <span className={cx('size-3', swatch)} aria-hidden />
      {text}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-white/15 px-4 py-3 font-mono text-[11px] text-paper/70">
      {after ? (
        <>
          {item('bg-danger', 'Still extractable (verification failed)')}
          {item('bg-marker', 'Detected but not selected')}
        </>
      ) : (
        <>
          {item('bg-danger', 'Hidden under a black box, still extractable')}
          {item('bg-marker', 'Visible sensitive value')}
        </>
      )}
    </div>
  )
}

function AfterBanner({ result, findings }: { result: RedactionResult; findings: Finding[] }) {
  const v = result.verification
  if (v.status === 'passed') {
    return (
      <div role="status" className="border-[1.5px] border-success bg-success px-5 py-4 text-white">
        <p className="font-display text-[22px] leading-tight font-bold uppercase">Targeted text verification passed.</p>
        <p className="mt-1 text-[15px] text-white/90">
          None of the {v.values_tested} selected value{v.values_tested === 1 ? '' : 's'} can be extracted from the redacted
          output. Values you didn't select are still present.
        </p>
      </div>
    )
  }
  const byId = new Map(findings.map((f) => [f.id, f]))
  return (
    <div role="alert" className="border-[1.5px] border-danger bg-danger px-5 py-4 text-white">
      <p className="font-display text-[22px] leading-tight font-bold uppercase">Verification failed.</p>
      <p className="mt-1 text-[15px] text-white/90">
        {v.values_still_detected} selected value{v.values_still_detected === 1 ? ' is' : 's are'} still extractable:{' '}
        {v.remaining.map((r) => `${TYPE_LABELS[byId.get(r.finding_id)?.type ?? 'OTHER']} (page ${r.pages.join(', ')})`).join('; ')}.
      </p>
    </div>
  )
}
