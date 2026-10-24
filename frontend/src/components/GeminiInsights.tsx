import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import type { AnalysisResponse, Finding } from '../api/types'
import { USE_MOCK } from '../api/client'
import { TYPE_LABELS, sourceKind, type SourceKind } from '../utils/findings'
import { Badge, Dot, RiskBadge, cx } from './ui'

/** Types that have no fixed format, so they are the clearest example of contextual detection. */
const CONTEXTUAL_TYPES = ['EMPLOYEE_ID', 'CUSTOMER_ID', 'PERSON_NAME', 'ADDRESS', 'DATE_OF_BIRTH', 'OTHER']

function contextExample(findings: Finding[]): Finding | undefined {
  const geminiOnly = findings.filter((f) => sourceKind(f) === 'gemini')
  for (const type of CONTEXTUAL_TYPES) {
    const match = geminiOnly.find((f) => f.type === type)
    if (match) return match
  }
  return geminiOnly[0]
}

export function GeminiStatusLine({ analysis, onDetails }: { analysis: AnalysisResponse; onDetails: () => void }) {
  const { gemini_status, gemini_message, gemini_model, findings } = analysis
  if (gemini_status !== 'ok') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-[13px] text-warning-ink">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">{gemini_status === 'unavailable' ? 'Gemini unavailable.' : 'Gemini failed.'}</span>{' '}
          {gemini_message ?? 'Showing pattern-based results only.'}
        </span>
      </div>
    )
  }
  const fromGemini = findings.filter((f) => f.source.includes('gemini')).length
  return (
    <button
      type="button"
      onClick={onDetails}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-gemini-line bg-gemini-soft px-3 py-2 text-left text-[13px] text-gemini-ink hover:border-gemini"
    >
      <Sparkles className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{USE_MOCK ? 'Mock Gemini data' : 'Gemini analyzed this PDF'}</span>
        <span className="text-gemini-ink/75">
          {' '}
          · {gemini_model} · {fromGemini} finding{fromGemini === 1 ? '' : 's'}
        </span>
      </span>
      <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  )
}

const COLUMNS: { kind: SourceKind; title: string; blurb: string; dot: string }[] = [
  { kind: 'regex', title: 'Regex only', blurb: 'Fixed formats the pattern scanner knows', dot: 'bg-subtle' },
  { kind: 'both', title: 'Both methods', blurb: 'Pattern match confirmed by Gemini', dot: 'bg-accent' },
  { kind: 'gemini', title: 'Gemini only', blurb: 'Found through context, not format', dot: 'bg-gemini' },
]

export function GeminiInsights({ analysis }: { analysis: AnalysisResponse }) {
  const { gemini_status, gemini_message, gemini_model, gemini_stats, findings } = analysis
  const ok = gemini_status === 'ok'
  const example = ok ? contextExample(findings) : undefined

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-ink">
              <Sparkles className="size-5 text-gemini" aria-hidden />
              Gemini intelligence
            </h2>
            {ok ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {USE_MOCK && <span className="font-semibold text-warning-ink">Mock data — Gemini was not called. </span>}
                The PDF was analyzed by <span className="font-mono text-[13px] text-ink">{gemini_model}</span> for values that
                need context to recognize — member references, staff IDs, names. Its output is treated as untrusted: every
                suggestion must appear verbatim in the PDF or it is discarded, and highlight positions come from the PDF
                itself, never from the model.
              </p>
            ) : (
              <div role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2.5 text-[13px] text-warning-ink">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">{gemini_status === 'unavailable' ? 'Gemini is not configured.' : 'Gemini analysis failed.'}</span>{' '}
                  {gemini_message} The deterministic scanner's results below are still complete and usable for redaction.
                </span>
              </div>
            )}
          </div>
          {ok && gemini_stats && (
            <dl className="grid shrink-0 grid-cols-3 divide-x divide-line overflow-hidden rounded-lg border border-line">
              <Stat label="Suggested" value={gemini_stats.suggested} hint="Values Gemini returned" />
              <Stat label="Accepted" value={gemini_stats.accepted} hint="Verified in the PDF and located" tone="text-success-ink" />
              <Stat label="Rejected" value={gemini_stats.rejected} hint="Not in the document, malformed, or too short" tone="text-warning-ink" />
            </dl>
          )}
        </div>
      </section>

      <section aria-label="Detection sources" className="grid gap-6 md:grid-cols-3">
        {COLUMNS.map(({ kind, title, blurb, dot }) => {
          const items = findings.filter((f) => sourceKind(f) === kind)
          const unavailable = !ok && kind !== 'regex'
          return (
            <div key={kind} className="card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Dot className={dot} /> {title}
                </h3>
                <span className="text-[20px] font-semibold text-ink tabular-nums">{unavailable ? '—' : items.length}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-muted">{blurb}</p>
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {unavailable ? (
                  <li className="pt-3 text-[13px] text-subtle italic">Gemini did not run for this document.</li>
                ) : items.length === 0 ? (
                  <li className="pt-3 text-[13px] text-subtle italic">None</li>
                ) : (
                  items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                      <span className="truncate text-body">{TYPE_LABELS[f.type]}</span>
                      <span className="shrink-0 font-mono text-xs text-muted">{f.display}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )
        })}
      </section>

      {ok && (
        <section aria-label="Why context mattered" className="card p-6">
          <h3 className="text-[16px] font-semibold text-ink">Why contextual understanding mattered</h3>
          {example ? (
            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start">
              <div className="rounded-lg border border-gemini-line bg-gemini-soft p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-gemini-ink">{TYPE_LABELS[example.type]}</span>
                  <RiskBadge risk={example.risk} />
                </div>
                <p className="mt-2 font-mono text-[15px] font-medium tracking-wide text-ink">{example.display}</p>
                <p className="mt-2 text-[13px] leading-snug text-body">
                  <span className="font-semibold">Gemini's reason:</span> “{example.reason}”
                </p>
                {example.confidence && (
                  <Badge className="mt-3 bg-surface text-gemini-ink ring-gemini-line">{example.confidence} confidence</Badge>
                )}
              </div>
              <div className="text-sm leading-relaxed text-muted">
                <p>
                  The pattern scanner only knows fixed formats: emails, phone numbers, SSNs and numbers next to an
                  “account” label. It did <span className="font-semibold text-ink">not</span> flag this value.
                </p>
                <p className="mt-3">
                  Gemini read the document the way a person would and classified it from the surrounding context as{' '}
                  <span className="font-medium text-ink">{TYPE_LABELS[example.type]}</span>. Pattern matching alone would have left
                  it in the document.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Gemini didn't find anything beyond what the pattern scanner already caught in this document.</p>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, hint, tone = 'text-ink' }: { label: string; value: number; hint: string; tone?: string }) {
  return (
    <div className="flex min-w-28 flex-col-reverse bg-surface px-5 py-3" title={hint}>
      <dt className="mt-0.5 text-xs font-medium text-muted">{label}</dt>
      <dd className={cx('text-[24px] leading-8 font-semibold tabular-nums', tone)}>{value}</dd>
    </div>
  )
}
