import { useRef, useState, type KeyboardEvent } from 'react'
import { AlertTriangle, FileCheck2, FileText, ListChecks, RotateCcw, ScanEye, Sparkles, Terminal } from 'lucide-react'
import type { AnalysisResponse, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { AttackerView } from './AttackerView'
import { DocumentViewer } from './DocumentViewer'
import { FindingsSidebar } from './FindingsSidebar'
import { GeminiInsights, GeminiStatusLine } from './GeminiInsights'
import { RedactionControls } from './RedactionControls'
import { VerificationReport } from './VerificationReport'
import { Button, PageNav, cx } from './ui'

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

  const tabs: { id: Tab; label: string; icon: typeof FileText; badge?: string; disabled?: boolean }[] = [
    { id: 'review', label: 'Review findings', icon: ListChecks, badge: String(analysis.findings.length) },
    { id: 'attacker', label: 'Attacker view', icon: Terminal, badge: hiddenCount > 0 ? `${hiddenCount} hidden` : undefined },
    { id: 'gemini', label: 'Gemini insights', icon: Sparkles },
    { id: 'report', label: 'Verification report', icon: FileCheck2, disabled: !result },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2">
            <FileText className="size-5 text-cyan-300" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold text-white">{analysis.filename}</h1>
            <p className="text-[13px] text-muted">
              {analysis.page_count} page{analysis.page_count === 1 ? '' : 's'} · {analysis.findings.length} finding
              {analysis.findings.length === 1 ? '' : 's'}
              {hiddenCount > 0 && (
                <span className="text-red-300">
                  {' '}
                  · {hiddenCount} hidden but extractable
                </span>
              )}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onStartOver} icon={<RotateCcw className="size-3.5" aria-hidden />}>
          New PDF
        </Button>
      </div>

      {expired && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
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
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
            <section aria-label="Document preview" className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-red-400 bg-red-400/20" /> High</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-amber-400 bg-amber-400/20" /> Medium</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-sky-400 bg-sky-400/20" /> Low</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-dashed border-slate-400" /> Not selected</span>
                </div>
                <PageNav page={current.page} count={analysis.pages.length} onChange={setPage} />
              </div>
              <DocumentViewer
                page={current}
                imageUrl={api.url(current.preview_url)}
                alt={`Page ${current.page} of ${analysis.filename}`}
                findings={analysis.findings}
                selectedIds={selectedIds}
                activeId={activeId}
                onFindingClick={(id) => activate(id, current.page)}
                reservedHeight={320}
              />
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => onTabChange('attacker')}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-left text-[13px] text-red-100 hover:bg-red-500/15"
                >
                  <ScanEye className="size-4 shrink-0 text-red-300" aria-hidden />
                  This PDF has text hidden under black boxes that is still extractable. Open the Attacker View →
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

interface TabBarProps {
  tabs: { id: Tab; label: string; icon: typeof FileText; badge?: string; disabled?: boolean }[]
  value: Tab
  onChange: (tab: Tab) => void
}

function TabBar({ tabs, value, onChange }: TabBarProps) {
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
    <div role="tablist" aria-label="Workspace" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(({ id, label, icon: Icon, badge, disabled }) => {
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
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              selected ? 'border-cyan-400 text-white' : 'border-transparent text-muted hover:text-slate-200',
            )}
          >
            <Icon className={cx('size-4', selected ? 'text-cyan-300' : 'text-subtle')} aria-hidden />
            {label}
            {badge && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-px text-[10.5px] font-semibold',
                  id === 'attacker' ? 'bg-red-500/15 text-red-200' : 'bg-surface-3 text-muted',
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
