import { useRef, useState, type KeyboardEvent } from 'react'
import { AlertTriangle, ArrowRight, FileText, RotateCcw, ScanEye } from 'lucide-react'
import type { AnalysisResponse, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { AttackerView } from './AttackerView'
import { DocumentViewer } from './DocumentViewer'
import { FindingsSidebar } from './FindingsSidebar'
import { GeminiInsights, GeminiStatusLine } from './GeminiInsights'
import { RedactionControls } from './RedactionControls'
import { VerificationReport } from './VerificationReport'
import { Button, PageNav, Swatch, cx } from './ui'

export type Tab = 'review' | 'attacker' | 'gemini' | 'report'

interface WorkspaceProps {
  analysis: AnalysisResponse
  result: RedactionResult | null
  selectedIds: Set<string>
  onSelect: (ids: string[], checked: boolean) => void
  redacting: boolean
  redactError: string | null
  expired: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
  onRedact: () => void
  onStartOver: () => void
}

interface TabDef {
  id: Tab
  label: string
  badge?: string
  alert?: boolean
  disabled?: boolean
}

export function Workspace(props: WorkspaceProps) {
  const { analysis, result, selectedIds, onSelect, redacting, redactError, expired, tab, onTabChange, onRedact, onStartOver } = props
  const [page, setPage] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)

  const current = analysis.pages.find((p) => p.page === page) ?? analysis.pages[0]
  const hiddenCount = analysis.findings.filter((f) => f.visually_hidden).length

  function activate(id: string, targetPage?: number) {
    const finding = analysis.findings.find((f) => f.id === id)
    if (!finding) return
    setActiveId(id)
    const pages = finding.locations.map((l) => l.page)
    setPage(targetPage ?? (pages.includes(page) ? page : pages[0]))
  }

  const tabs: TabDef[] = [
    { id: 'review', label: 'Review findings', badge: String(analysis.findings.length) },
    { id: 'attacker', label: 'Attacker view', badge: hiddenCount > 0 ? `${hiddenCount} hidden` : undefined, alert: true },
    { id: 'gemini', label: 'Gemini insights' },
    { id: 'report', label: 'Verification report', disabled: !result },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface shadow-xs">
            <FileText className="size-5 text-muted" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-semibold tracking-tight text-ink">{analysis.filename}</h1>
            <p className="text-[13px] text-muted tabular-nums">
              {analysis.page_count} page{analysis.page_count === 1 ? '' : 's'} · {analysis.findings.length} finding
              {analysis.findings.length === 1 ? '' : 's'}
              {hiddenCount > 0 && <span className="font-medium text-danger-ink"> · {hiddenCount} hidden but extractable</span>}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onStartOver} icon={<RotateCcw className="size-3.5" aria-hidden />}>
          New PDF
        </Button>
      </div>

      {expired && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-warning-line bg-warning-soft px-4 py-3 text-sm text-warning-ink sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            This session has expired (documents are kept for 30 minutes). Upload the PDF again to continue.
          </span>
          <Button variant="primary" size="sm" onClick={onStartOver}>
            Upload again
          </Button>
        </div>
      )}

      <TabBar tabs={tabs} value={tab} onChange={onTabChange} />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'review' && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
            <section aria-label="Document preview" className="card overflow-hidden">
              <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                  <span className="flex items-center gap-1.5"><Swatch className="border-danger bg-danger/12" /> High</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-warning bg-warning/14" /> Medium</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-low bg-low/10" /> Low</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-dashed border-subtle" /> Not selected</span>
                </div>
                <PageNav page={current.page} count={analysis.pages.length} onChange={setPage} />
              </div>
              <div className="bg-surface-2 p-5">
                <DocumentViewer
                  page={current}
                  imageUrl={api.url(current.preview_url)}
                  alt={`Page ${current.page} of ${analysis.filename}`}
                  findings={analysis.findings}
                  selectedIds={selectedIds}
                  activeId={activeId}
                  onFindingClick={(id) => activate(id, current.page)}
                  reservedHeight={400}
                />
              </div>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => onTabChange('attacker')}
                  className="group flex w-full items-center gap-2 border-t border-danger-line bg-danger-soft px-4 py-3 text-left text-[13px] font-medium text-danger-ink hover:bg-danger-line/40"
                >
                  <ScanEye className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1">This PDF has text hidden under black boxes that is still extractable. Open the Attacker View</span>
                  <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              )}
            </section>
            <FindingsSidebar
              findings={analysis.findings}
              selectedIds={selectedIds}
              activeId={activeId}
              disabled={redacting || expired}
              onSelect={onSelect}
              onActivate={activate}
              status={<GeminiStatusLine analysis={analysis} onDetails={() => onTabChange('gemini')} />}
              footer={
                <RedactionControls
                  findings={analysis.findings}
                  selectedIds={selectedIds}
                  redacting={redacting}
                  disabled={expired}
                  error={expired ? null : redactError}
                  onRedact={onRedact}
                  onClear={() => onSelect(analysis.findings.map((f) => f.id), false)}
                />
              }
            />
          </div>
        )}
        {tab === 'attacker' && <AttackerView analysis={analysis} result={result} page={page} onPageChange={setPage} />}
        {tab === 'gemini' && <GeminiInsights analysis={analysis} />}
        {tab === 'report' && result && (
          <VerificationReport
            analysis={analysis}
            result={result}
            page={page}
            onPageChange={setPage}
            onBack={() => onTabChange('review')}
            onStartOver={onStartOver}
          />
        )}
      </div>
    </div>
  )
}

function TabBar({ tabs, value, onChange }: { tabs: TabDef[]; value: Tab; onChange: (tab: Tab) => void }) {
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const enabled = tabs.filter((t) => !t.disabled)

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = enabled.findIndex((t) => t.id === value)
    const next = enabled[(i + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length]
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <div role="tablist" aria-label="Workspace" onKeyDown={onKeyDown} className="flex gap-6 overflow-x-auto border-b border-line">
      {tabs.map(({ id, label, badge, alert, disabled }) => {
        const selected = id === value
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el
            }}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${id}`}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            title={disabled ? 'Redact findings to see the report' : undefined}
            onClick={() => onChange(id)}
            className={cx(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 pt-1 pb-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              selected ? 'border-accent text-accent' : 'border-transparent text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {label}
            {badge && (
              <span
                className={cx(
                  'rounded-full px-2 py-px text-xs font-medium ring-1 ring-inset tabular-nums',
                  alert ? 'bg-danger-soft text-danger-ink ring-danger-line' : selected ? 'bg-accent-soft text-accent ring-accent-line' : 'bg-surface-3 text-body ring-line',
                )}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
