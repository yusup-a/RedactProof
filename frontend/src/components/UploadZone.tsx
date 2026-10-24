import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertCircle, Loader2, Lock, UploadCloud, X } from 'lucide-react'
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
  { title: 'Detect', body: 'A pattern scanner and Gemini each look for sensitive values, including ones that need context to spot.' },
  { title: 'Remove', body: 'The values you select are deleted from the PDF itself — not painted over.' },
  { title: 'Verify', body: 'The saved file is reopened and searched again for every value you removed.' },
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
    <div className="mx-auto max-w-[720px] pt-6 sm:pt-14">
      <div className="text-center">
        <p className="mb-4 inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium text-body shadow-xs">
          PDF redaction you can verify
        </p>
        <h1 className="text-[34px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink sm:text-[44px]">
          Covering data isn't the same as removing it.
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-muted">
          A black box drawn over PDF text often leaves the text in the file. RedactProof finds sensitive values with
          pattern scanning and Google Gemini, removes them for real, and checks the result.
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
          'mt-10 rounded-xl border-[1.5px] border-dashed bg-surface px-6 py-10 text-center shadow-xs transition-colors sm:px-10 sm:py-12',
          dragging ? 'border-accent bg-accent-soft' : 'border-line-strong',
        )}
      >
        {analyzing ? (
          <AnalyzingState file={analyzing} gemini={geminiOn} onCancel={onCancel} />
        ) : (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border-[6px] border-surface-2 bg-surface-3">
              <UploadCloud className="size-5 text-body" aria-hidden />
            </div>
            <p className="mt-4 text-[16px] font-semibold text-ink">Drop a PDF here</p>
            <p className="mt-1 text-sm text-muted">PDF only · up to 5 MB · up to 3 pages · text-based (no scans)</p>
            <Button variant="primary" className="mt-6" onClick={() => inputRef.current?.click()}>
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
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{shownError}</span>
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-muted">
        <Lock className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
        <p>
          <span className="font-medium text-body">Privacy notice:</span>{' '}
          {geminiOn
            ? 'The PDF you upload is sent to the Google Gemini API for analysis (third-party processing). '
            : 'Gemini is not configured on this server, so your PDF is only scanned locally by the backend. '}
          Documents are kept in server memory for 30 minutes and never stored on disk.{' '}
          <span className="font-medium text-body">Use synthetic demo documents only.</span>
        </p>
      </div>

      <ol className="mt-14 grid gap-8 border-t border-line pt-8 sm:grid-cols-3 sm:gap-6">
        {STEPS.map(({ title, body }, i) => (
          <li key={title}>
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
              {i + 1}
            </span>
            <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
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
    <div role="status" aria-live="polite">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border-[6px] border-accent-soft bg-accent-soft">
        <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
      </div>
      <p className="mt-4 text-[16px] font-semibold text-ink">Analyzing {file.name}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        {gemini
          ? 'Running the pattern scanner and asking Gemini for contextual identifiers. This can take up to a minute.'
          : 'Running the deterministic pattern scanner.'}
      </p>
      <p className="mt-3 text-[13px] text-subtle tabular-nums">
        {formatBytes(file.size)} · {seconds}s elapsed
      </p>
      <Button variant="secondary" size="sm" className="mt-5" onClick={onCancel} icon={<X className="size-3.5" aria-hidden />}>
        Cancel
      </Button>
    </div>
  )
}
