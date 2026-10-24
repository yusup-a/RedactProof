import { ArrowRight } from 'lucide-react'
import type { AnalysisResponse, Finding } from '../api/types'
import { USE_MOCK } from '../api/client'
import { TYPE_LABELS, sourceKind, type SourceKind } from '../utils/findings'
import { RiskBadge, SectionTitle, Tag, cx } from './ui'

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
      <div className="border-[1.5px] border-warning bg-warning-soft px-3 py-2 text-[13px] leading-snug text-warning-ink">
        <span className="font-semibold">{gemini_status === 'unavailable' ? 'Gemini unavailable.' : 'Gemini failed.'}</span>{' '}
        {gemini_message ?? 'Showing pattern-based results only.'}
      </div>
    )
  }
  const fromGemini = findings.filter((f) => f.source.includes('gemini')).length
  return (
    <button
      type="button"
      onClick={onDetails}
      className="group flex w-full items-center gap-3 border-[1.5px] border-gemini bg-gemini px-3 py-2 text-left text-[13px] text-white hover:bg-gemini-ink"
    >
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{USE_MOCK ? 'Mock Gemini data' : 'Gemini analyzed this PDF'}</span>
        <span className="font-mono text-[12px] text-white/75">
          {' '}
          / {gemini_model} / {fromGemini} finding{fromGemini === 1 ? '' : 's'}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  )
}

const COLUMNS: { kind: SourceKind; title: string; blurb: string; bar: string }[] = [
  { kind: 'regex', title: 'Regex only', blurb: 'Fixed formats the pattern scanner knows', bar: 'bg-ink' },
  { kind: 'both', title: 'Both methods', blurb: 'Pattern match confirmed by Gemini', bar: 'bg-[linear-gradient(90deg,var(--color-ink)_50%,var(--color-gemini)_50%)]' },
  { kind: 'gemini', title: 'Gemini only', blurb: 'Found through context, not format', bar: 'bg-gemini' },
]

export function GeminiInsights({ analysis }: { analysis: AnalysisResponse }) {
  const { gemini_status, gemini_message, gemini_model, gemini_stats, findings } = analysis
  const ok = gemini_status === 'ok'
  const example = ok ? contextExample(findings) : undefined

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-2xl">
          <SectionTitle index="03">Gemini intelligence</SectionTitle>
          {ok ? (
            <p className="mt-3 text-[15px] leading-relaxed text-body">
              {USE_MOCK && <span className="bg-marker px-1 font-semibold text-ink">Mock data — Gemini was not called.</span>}{' '}
              The PDF was analyzed by <span className="bg-gemini px-1 font-mono text-[13px] text-white">{gemini_model}</span> for
              values that need context to recognize — member references, staff IDs, names. Its output is treated as untrusted:
              every suggestion must appear verbatim in the PDF or it is discarded, and highlight positions come from the PDF
              itself, never from the model.
            </p>
          ) : (
            <div role="status" className="mt-4 border-[1.5px] border-warning bg-warning-soft px-4 py-3 text-[14px] leading-relaxed text-warning-ink">
              <span className="font-semibold">{gemini_status === 'unavailable' ? 'Gemini is not configured.' : 'Gemini analysis failed.'}</span>{' '}
              {gemini_message} The deterministic scanner's results below are still complete and usable for redaction.
            </div>
          )}
        </div>
        {ok && gemini_stats && (
          <dl className="grid grid-cols-3 border-[1.5px] border-ink bg-surface">
            <Stat label="Suggested" value={gemini_stats.suggested} hint="Values Gemini returned" />
            <Stat label="Accepted" value={gemini_stats.accepted} hint="Verified in the PDF and located" tone="text-success" border />
            <Stat label="Rejected" value={gemini_stats.rejected} hint="Not in the document, malformed, or too short" tone="text-danger" border />
          </dl>
        )}
      </div>

      <section aria-label="Detection sources" className="grid border-[1.5px] border-ink bg-surface md:grid-cols-3">
        {COLUMNS.map(({ kind, title, blurb, bar }, i) => {
          const items = findings.filter((f) => sourceKind(f) === kind)
          const unavailable = !ok && kind !== 'regex'
          return (
            <div key={kind} className={cx('flex flex-col', i > 0 && 'border-ink max-md:border-t-[1.5px] md:border-l-[1.5px]')}>
              <div className={cx('h-1.5', bar)} aria-hidden />
              <div className="flex items-start justify-between gap-3 px-5 pt-4">
                <div>
                  <h3 className="font-display text-[20px] leading-tight font-bold text-ink uppercase">{title}</h3>
                  <p className="mt-0.5 text-[13px] text-muted">{blurb}</p>
                </div>
                <span className="font-display text-[44px] leading-none font-bold text-ink tabular-nums">{unavailable ? '—' : items.length}</span>
              </div>
              <ul className="mt-4 border-t border-line">
                {unavailable ? (
                  <li className="px-5 py-3 font-mono text-[12px] text-muted">Gemini did not run for this document.</li>
                ) : items.length === 0 ? (
                  <li className="px-5 py-3 font-mono text-[12px] text-muted">None</li>
                ) : (
                  items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 border-b border-line px-5 py-2.5 text-[14px] last:border-b-0">
                      <span className="truncate text-ink">{TYPE_LABELS[f.type]}</span>
                      <span className="shrink-0 font-mono text-[12px] text-muted">{f.display}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )
        })}
      </section>

      {ok && (
        <section aria-label="Why context mattered">
          <h3 className="font-display text-[22px] font-bold text-ink uppercase">Why contextual understanding mattered</h3>
          {example ? (
            <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-start">
              <div className="border-[1.5px] border-ink bg-surface shadow-hard">
                <div className="flex items-center justify-between gap-2 bg-gemini px-4 py-2.5 text-white">
                  <span className="tag">{TYPE_LABELS[example.type]}</span>
                  <RiskBadge risk={example.risk} />
                </div>
                <div className="p-4">
                  <p className="font-mono text-[20px] font-medium text-ink">{example.display}</p>
                  <p className="mt-3 text-[14px] leading-snug text-body">
                    <span className="font-semibold text-ink">Gemini's reason:</span> “{example.reason}”
                  </p>
                  {example.confidence && <Tag className="mt-3 border-gemini text-gemini-ink">{example.confidence} confidence</Tag>}
                </div>
              </div>
              <div className="space-y-3 text-[15px] leading-relaxed text-body">
                <p>
                  The pattern scanner only knows fixed formats: emails, phone numbers, SSNs and numbers next to an “account”
                  label. It did <span className="bg-ink px-1 font-semibold text-paper">not</span> flag this value.
                </p>
                <p>
                  Gemini read the document the way a person would and classified it from the surrounding context as{' '}
                  <span className="font-semibold text-ink">{TYPE_LABELS[example.type]}</span>. Pattern matching alone would have left it
                  in the document.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-body">Gemini didn't find anything beyond what the pattern scanner already caught in this document.</p>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, hint, tone = 'text-ink', border }: { label: string; value: number; hint: string; tone?: string; border?: boolean }) {
  return (
    <div className={cx('flex min-w-28 flex-col-reverse px-5 py-3', border && 'border-l-[1.5px] border-ink')} title={hint}>
      <dt className="tag mt-1 text-muted">{label}</dt>
      <dd className={cx('font-display text-[40px] leading-none font-bold tabular-nums', tone)}>{value}</dd>
    </div>
  )
}
