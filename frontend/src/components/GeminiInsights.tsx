import { AlertTriangle, ArrowRight, Lightbulb, ScanText, ShieldQuestion, Sparkles } from 'lucide-react'
import type { AnalysisResponse, Finding } from '../api/types'
import { USE_MOCK } from '../api/client'
import { TYPE_LABELS, sourceKind, type SourceKind } from '../utils/findings'
import { Badge, RiskBadge, cx } from './ui'

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
      <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-100">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
        <span>
          <span className="font-medium">{gemini_status === 'unavailable' ? 'Gemini unavailable.' : 'Gemini failed.'}</span>{' '}
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
      className="group flex w-full items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/[0.08] px-3 py-2 text-left text-[12.5px] text-violet-100 hover:border-violet-400/50"
    >
      <Sparkles className="size-3.5 shrink-0 text-violet-300" aria-hidden />
      <span className="flex-1">
        <span className="font-medium">{USE_MOCK ? 'Mock Gemini data' : `Gemini analyzed this PDF`}</span>
        <span className="text-violet-200/70">
          {' '}
          · {gemini_model} · {fromGemini} finding{fromGemini === 1 ? '' : 's'}
        </span>
      </span>
      <ArrowRight className="size-3.5 text-violet-300/70 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  )
}

const COLUMNS: { kind: SourceKind; title: string; blurb: string; icon: typeof Sparkles; tone: string }[] = [
  { kind: 'regex', title: 'Regex only', blurb: 'Fixed formats the pattern scanner knows', icon: ScanText, tone: 'text-slate-300' },
  { kind: 'both', title: 'Both methods', blurb: 'Pattern match confirmed by Gemini', icon: ShieldQuestion, tone: 'text-cyan-300' },
  { kind: 'gemini', title: 'Gemini only', blurb: 'Found through context, not format', icon: Sparkles, tone: 'text-violet-300' },
]

export function GeminiInsights({ analysis }: { analysis: AnalysisResponse }) {
  const { gemini_status, gemini_message, gemini_model, gemini_stats, findings } = analysis
  const ok = gemini_status === 'ok'
  const example = ok ? contextExample(findings) : undefined

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="size-5 text-violet-300" aria-hidden />
              Gemini intelligence
            </h2>
            {ok ? (
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                {USE_MOCK && <span className="font-semibold text-amber-300">Mock data — Gemini was not called. </span>}
                The PDF was analyzed by <span className="font-mono text-violet-200">{gemini_model}</span> for values that
                need context to recognize — member references, staff IDs, names. Its output is treated as untrusted:
                every suggestion must appear verbatim in the PDF or it is discarded, and highlight positions come from the
                PDF itself, never from the model.
              </p>
            ) : (
              <div role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
                <span>
                  <span className="font-semibold">{gemini_status === 'unavailable' ? 'Gemini is not configured.' : 'Gemini analysis failed.'}</span>{' '}
                  {gemini_message} The deterministic scanner's results below are still complete and usable for redaction.
                </span>
              </div>
            )}
          </div>
          {ok && gemini_stats && (
            <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
              <Stat label="Suggested" value={gemini_stats.suggested} hint="Values Gemini returned" />
              <Stat label="Accepted" value={gemini_stats.accepted} hint="Verified in the PDF and located" tone="text-emerald-300" />
              <Stat label="Rejected" value={gemini_stats.rejected} hint="Not in the document, malformed, or too short" tone="text-amber-300" />
            </dl>
          )}
        </div>
      </section>

      <section aria-label="Detection sources" className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map(({ kind, title, blurb, icon: Icon, tone }) => {
          const items = findings.filter((f) => sourceKind(f) === kind)
          const unavailable = !ok && kind !== 'regex'
          return (
            <div key={kind} className="card flex flex-col p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className={cx('size-4', tone)} aria-hidden /> {title}
                </h3>
                <span className="font-mono text-lg font-semibold text-white">{unavailable ? '—' : items.length}</span>
              </div>
              <p className="mt-0.5 text-xs text-subtle">{blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {unavailable ? (
                  <li className="text-[13px] text-subtle italic">Gemini did not run for this document.</li>
                ) : items.length === 0 ? (
                  <li className="text-[13px] text-subtle italic">None</li>
                ) : (
                  items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-md bg-surface-2/60 px-2.5 py-1.5 text-[12.5px]">
                      <span className="truncate text-slate-200">{TYPE_LABELS[f.type]}</span>
                      <span className="shrink-0 font-mono text-[11.5px] text-muted">{f.display}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )
        })}
      </section>

      {ok && (
        <section aria-label="Why context mattered" className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Lightbulb className="size-4 text-amber-300" aria-hidden />
            Why contextual understanding mattered
          </h3>
          {example ? (
            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-violet-100">{TYPE_LABELS[example.type]}</span>
                  <RiskBadge risk={example.risk} />
                </div>
                <p className="mt-2 font-mono text-[15px] tracking-wider text-white">{example.display}</p>
                <p className="mt-2 text-[12.5px] leading-snug text-violet-100/80">
                  <span className="font-medium text-violet-100">Gemini's reason:</span> “{example.reason}”
                </p>
                {example.confidence && (
                  <Badge className="mt-3 bg-violet-500/12 text-violet-200 ring-violet-400/30">{example.confidence} confidence</Badge>
                )}
              </div>
              <div className="text-[13.5px] leading-relaxed text-muted">
                <p>
                  The pattern scanner only knows fixed formats: emails, phone numbers, SSNs and numbers next to an
                  “account” label. It did <span className="text-slate-200">not</span> flag this value.
                </p>
                <p className="mt-2">
                  Gemini read the document the way a person would and classified it from the surrounding context as{' '}
                  <span className="text-slate-200">{TYPE_LABELS[example.type]}</span>. Pattern matching alone would have left
                  it in the document.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted">
              Gemini didn't find anything beyond what the pattern scanner already caught in this document.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, hint, tone = 'text-white' }: { label: string; value: number; hint: string; tone?: string }) {
  return (
    <div className="flex min-w-24 flex-col-reverse rounded-xl border border-line bg-surface-2/60 px-3 py-2.5" title={hint}>
      <dt className="mt-0.5 text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</dt>
      <dd className={cx('font-mono text-2xl font-semibold', tone)}>{value}</dd>
    </div>
  )
}
