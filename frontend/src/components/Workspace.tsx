import { useRef, useState, type KeyboardEvent } from 'react'
import type { AnalysisResponse, RedactionResult } from '../api/types'
import { api } from '../api/client'
import { DocumentViewer } from './DocumentViewer'
import { FindingsSidebar } from './FindingsSidebar'
import { RedactionControls } from './RedactionControls'
import { VerificationReport } from './VerificationReport'
import { Button, PageNav, Swatch, cx } from './ui'

export type Tab = 'review' | 'report'

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
    { id: 'report', label: 'Verification report', disabled: !result },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="tag text-muted">Document</p>
          <h1 className="mt-1 truncate font-display text-[30px] leading-none font-bold text-ink">{analysis.filename}</h1>
          <p className="mt-2 font-mono text-[12px] text-body tabular-nums">
            {analysis.page_count} page{analysis.page_count === 1 ? '' : 's'} / {analysis.findings.length} finding
            {analysis.findings.length === 1 ? '' : 's'}
            {hiddenCount > 0 && <span className="ml-2 bg-danger px-1.5 py-px font-semibold text-white">{hiddenCount} hidden but extractable</span>}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onStartOver}>
          New PDF
        </Button>
      </div>

      {expired && (
        <div role="alert" className="flex flex-col gap-3 border-[1.5px] border-ink bg-marker px-4 py-3 text-[14px] font-medium text-ink sm:flex-row sm:items-center sm:justify-between">
          <span>This session has expired (documents are kept for 30 minutes). Upload the PDF again to continue.</span>
          <Button variant="primary" size="sm" onClick={onStartOver}>
            Upload again
          </Button>
        </div>
      )}

      <TabBar tabs={tabs} value={tab} onChange={onTabChange} />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'review' && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
            <section aria-label="Document preview" className="panel">
              <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-[1.5px] border-ink px-4 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-body uppercase">
                  <span className="flex items-center gap-1.5"><Swatch className="border-danger bg-danger/15" /> High</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-warning bg-warning/20" /> Medium</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-ink bg-ink/8" /> Low</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-dashed border-subtle" /> Not selected</span>
                  <span className="flex items-center gap-1.5"><Swatch className="border-ink bg-marker/55" /> Active</span>
                </div>
                <PageNav page={current.page} count={analysis.pages.length} onChange={setPage} />
              </div>
              <div className="bg-surface-3 p-6">
                <DocumentViewer
                  page={current}
                  imageUrl={api.url(current.preview_url)}
                  alt={`Page ${current.page} of ${analysis.filename}`}
                  findings={analysis.findings}
                  selectedIds={selectedIds}
                  activeId={activeId}
                  onFindingClick={(id) => activate(id, current.page)}
                  reservedHeight={470}
                />
              </div>
            </section>
            <FindingsSidebar
              findings={analysis.findings}
              selectedIds={selectedIds}
              activeId={activeId}
              disabled={redacting || expired}
              onSelect={onSelect}
              onActivate={activate}
              status={
                analysis.gemini_status !== 'ok' && (
                  <p className="border-[1.5px] border-warning bg-warning-soft px-3 py-2 text-[13px] leading-snug text-warning-ink">
                    <span className="font-semibold">Contextual analysis was unavailable.</span> Showing pattern-based results
                    only — some values may not be detected.
                  </p>
                )
              }
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
    <div role="tablist" aria-label="Workspace" onKeyDown={onKeyDown} className="flex overflow-x-auto border-b-2 border-ink">
      {tabs.map(({ id, label, badge, disabled }, i) => {
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
              'flex shrink-0 items-center gap-2.5 border-[1.5px] border-b-0 px-4 py-3 font-display text-[15px] font-semibold tracking-[0.02em] uppercase disabled:cursor-not-allowed disabled:opacity-35',
              i > 0 && '-ml-[1.5px]',
              selected ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink hover:border-ink hover:bg-surface',
            )}
          >
            <span className={cx('font-mono text-[11px] font-medium', selected ? 'text-marker' : 'text-muted')}>0{i + 1}</span>
            {label}
            {badge && (
              <span
                className={cx(
                  'px-1.5 py-px font-mono text-[11px] font-semibold tracking-normal normal-case',
                  selected ? 'bg-marker text-ink' : 'bg-surface-3 text-ink',
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
