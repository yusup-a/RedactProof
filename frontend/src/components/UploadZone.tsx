import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, Eraser, FileSearch, FileUp, Lock, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { HealthState } from './AppShell'
import { formatBytes } from '../utils/findings'
import { Button, cx } from './ui'

const MAX_BYTES = 5 * 1024 * 1024

interface UploadZoneProps {
  health: HealthState
  analyzing: File | null
  error: string | null
  onFile: (file: File) => void
  onCancel: () => void
}

/** Usability check only; the backend's validation is authoritative. */
function validate(file: File): string | null {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) return 'Only PDF files are supported.'
  if (file.size > MAX_BYTES) return `This file is ${formatBytes(file.size)}. PDFs must be 5 MB or smaller.`
  if (file.size === 0) return 'This file is empty.'
  return null
}

const STEPS = [
  { icon: FileSearch, title: 'Detect', body: 'Pattern scan plus Gemini contextual analysis' },
  { icon: Eraser, title: 'Remove', body: 'Selected text is deleted from the PDF, not covered' },
  { icon: ShieldCheck, title: 'Verify', body: 'Output is reopened and re-searched for every value' },
]

export function UploadZone({ health, analyzing, error, onFile, onCancel }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const geminiOn = health.status === 'ok' ? health.health.gemini_configured : true
  const shownError = localError ?? error

  function accept(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const problem = validate(file)
    setLocalError(problem)
    if (!problem) onFile(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!analyzing) accept(e.dataTransfer.files)
  }

  return (
    <div className="mx-auto max-w-3xl pt-4 sm:pt-10">
      <div className="text-center">
        <p className="eyebrow mb-4 text-cyan-300/80">PDF redaction you can verify</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Covering data isn't the same
          <br className="hidden sm:block" /> as <span className="text-cyan-300">removing it.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Black boxes drawn over PDF text often leave the text in the file. RedactProof finds sensitive values with
          pattern scanning and Google Gemini, removes them for real, and proves it.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!analyzing) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'card relative mt-10 overflow-hidden border-dashed p-8 text-center transition-colors sm:p-12',
          dragging ? 'border-cyan-400 bg-cyan-400/5' : 'border-line-strong',
        )}
      >
        {analyzing ? (
          <AnalyzingState file={analyzing} gemini={geminiOn} onCancel={onCancel} />
        ) : (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
              <FileUp className="size-6 text-cyan-300" aria-hidden />
            </div>
            <p className="mt-5 text-lg font-medium text-white">Drop a PDF here</p>
            <p className="mt-1 text-sm text-muted">PDF only · up to 5 MB · up to 3 pages · text-based (no scans)</p>
            <Button variant="primary" size="lg" className="mt-6" onClick={() => inputRef.current?.click()} icon={<FileUp className="size-4" aria-hidden />}>
              Browse files
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose a PDF to analyze"
              onChange={(e) => {
                accept(e.target.files)
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>

      {shownError && !analyzing && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden />
          <span>{shownError}</span>
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted">
        <Lock className="mt-0.5 size-4 shrink-0 text-cyan-300/80" aria-hidden />
        <p>
          <span className="font-medium text-slate-200">Privacy notice:</span>{' '}
          {geminiOn
            ? 'The PDF you upload is sent to the Google Gemini API for analysis (third-party processing). '
            : 'Gemini is not configured on this server, so your PDF is only scanned locally by the backend. '}
          Documents are kept in server memory for 30 minutes and never stored on disk.{' '}
          <span className="text-slate-200">Use synthetic demo documents only.</span>
        </p>
      </div>

      <ol className="mt-10 grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-xl border border-line/70 bg-surface/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
              <Icon className="size-4 text-cyan-300" aria-hidden />
              <span className="text-subtle">{i + 1}.</span> {title}
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AnalyzingState({ file, gemini, onCancel }: { file: File; gemini: boolean; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div role="status" aria-live="polite" className="py-2">
      <div className="relative mx-auto size-14">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-400/15 border-t-cyan-300" />
        <div className="absolute inset-0 flex items-center justify-center">
          {gemini ? <Sparkles className="size-5 text-violet-200" aria-hidden /> : <FileSearch className="size-5 text-cyan-200" aria-hidden />}
        </div>
      </div>
      <p className="mt-5 text-lg font-medium text-white">Analyzing {file.name}</p>
      <p className="mt-1 text-sm text-muted">
        {gemini
          ? 'Running the pattern scanner and asking Gemini for contextual identifiers. This can take up to a minute.'
          : 'Running the deterministic pattern scanner.'}
      </p>
      <p className="mt-3 font-mono text-xs text-subtle">
        {formatBytes(file.size)} · {seconds}s elapsed
      </p>
      <Button variant="ghost" size="sm" className="mt-5" onClick={onCancel} icon={<X className="size-3.5" aria-hidden />}>
        Cancel
      </Button>
    </div>
  )
}
