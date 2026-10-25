import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ArrowDown, Loader2 } from 'lucide-react'
import { formatBytes } from '../utils/findings'
import { Button, cx } from './ui'

const MAX_BYTES = 5 * 1024 * 1024

interface UploadZoneProps {
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
  { title: 'Detect', body: 'Pattern matching and contextual analysis look for sensitive values — including ones that have no fixed format.' },
  { title: 'Remove', body: 'The values you pick are deleted from the PDF itself. Not painted over. Deleted.' },
  { title: 'Verify', body: 'The saved file is reopened and searched again for every value you removed.' },
]

export function UploadZone({ analyzing, error, onFile, onCancel }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

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
    <div className="grid gap-12 pt-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:pt-8">
      <div>
        <p className="tag text-muted">PDF redaction you can verify</p>
        <h1 className="mt-5 font-display text-[44px] leading-[1.02] font-bold tracking-[-0.015em] text-ink uppercase sm:text-[68px]">
          <span className="inline-block bg-ink px-2 pt-[0.05em] leading-[0.9] text-paper">Covering</span> data isn't the same as removing it.
        </h1>
        <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-body">
          A black box drawn over PDF text usually leaves the text sitting in the file. Anyone can copy it out. RedactProof
          finds the sensitive values, deletes them for real, and proves they're gone.
        </p>

        <ol className="mt-10 border-t-[1.5px] border-ink">
          {STEPS.map(({ title, body }, i) => (
            <li key={title} className="grid grid-cols-[48px_120px_minmax(0,1fr)] items-baseline gap-2 border-b border-line py-4 max-sm:grid-cols-[40px_minmax(0,1fr)]">
              <span className="font-mono text-[13px] text-muted">0{i + 1}</span>
              <span className="font-display text-[18px] font-bold text-ink uppercase">{title}</span>
              <span className="text-[14px] leading-relaxed text-body max-sm:col-start-2">{body}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="lg:pt-10">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!analyzing) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            'flex min-h-[340px] flex-col justify-center border-2 border-dashed border-ink px-8 py-10 shadow-hard transition-colors',
            dragging ? 'bg-marker' : 'bg-surface',
          )}
        >
          {analyzing ? (
            <AnalyzingState file={analyzing} onCancel={onCancel} />
          ) : (
            <>
              <ArrowDown className="size-8 text-ink" strokeWidth={2.25} aria-hidden />
              <p className="mt-6 font-display text-[32px] leading-none font-bold text-ink uppercase">Drop a PDF here</p>
              <div className="mt-8">
                <Button variant="primary" size="lg" onClick={() => inputRef.current?.click()}>
                  Browse files
                </Button>
              </div>
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
          <div role="alert" className="mt-5 border-[1.5px] border-danger bg-danger px-4 py-3 text-[14px] font-medium text-white">
            {shownError}
          </div>
        )}

      </div>
    </div>
  )
}

function AnalyzingState({ file, onCancel }: { file: File; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div role="status" aria-live="polite">
      <Loader2 className="size-8 animate-spin text-ink" strokeWidth={2.25} aria-hidden />
      <p className="mt-6 font-display text-[28px] leading-tight font-bold break-all text-ink uppercase">Analyzing {file.name}</p>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-body">
        Scanning the document for sensitive values. This can take up to a minute.
      </p>
      <p className="mt-3 font-mono text-[12px] text-muted tabular-nums">
        {formatBytes(file.size)} · {seconds}s elapsed
      </p>
      <Button variant="secondary" size="sm" className="mt-6" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
