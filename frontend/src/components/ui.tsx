import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2, ScanText, Sparkles } from 'lucide-react'
import type { Finding, Risk } from '../api/types'
import { sourceKind } from '../utils/findings'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-xs hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-body shadow-xs hover:bg-surface-2 hover:text-ink',
  ghost: 'text-muted hover:bg-surface-3 hover:text-ink',
  danger: 'bg-danger text-white shadow-xs hover:bg-danger-hover',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...props }: ButtonProps) {
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-11 px-5 text-[15px] gap-2' }
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size],
        BUTTON_VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

const RISK_STYLES: Record<Risk, string> = {
  HIGH: 'bg-danger-soft text-danger-ink ring-danger-line',
  MEDIUM: 'bg-warning-soft text-warning-ink ring-warning-line',
  LOW: 'bg-low-soft text-low-ink ring-low-line',
}

const RISK_LABELS: Record<Risk, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

/** Outline + fill used for selected regions on the page preview. */
export const RISK_BOX: Record<Risk, string> = {
  HIGH: 'border-danger bg-danger/12',
  MEDIUM: 'border-warning bg-warning/14',
  LOW: 'border-low bg-low/10',
}

export function Badge({ className, children, title }: { className?: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs leading-4 font-medium ring-1 ring-inset', className)}
    >
      {children}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Badge className={RISK_STYLES[risk]} title={`${RISK_LABELS[risk]} risk`}>
      {RISK_LABELS[risk]}
    </Badge>
  )
}

export function SourceBadges({ finding }: { finding: Finding }) {
  const kind = sourceKind(finding)
  return (
    <span className="inline-flex gap-1">
      {kind !== 'gemini' && (
        <Badge className="bg-surface-2 text-body ring-line" title="Found by the deterministic pattern scanner">
          <ScanText className="size-3 text-muted" aria-hidden />
          Regex
        </Badge>
      )}
      {kind !== 'regex' && (
        <Badge className="bg-gemini-soft text-gemini-ink ring-gemini-line" title="Identified by Google Gemini">
          <Sparkles className="size-3" aria-hidden />
          Gemini
        </Badge>
      )}
    </span>
  )
}

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

/** Native checkbox (keyboard + screen reader support for free) with indeterminate state. */
export function Checkbox({ checked, indeterminate = false, onChange, label, disabled, className }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className={cx('size-4 shrink-0 cursor-pointer rounded accent-[var(--color-accent)] disabled:cursor-not-allowed', className)}
    />
  )
}

export function PageNav({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  if (count <= 1) return <span className="text-xs text-muted">Page 1 of 1</span>
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Page navigation">
      <Button variant="ghost" size="sm" className="px-2" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Page ${p}`}
          className={cx(
            'size-8 rounded-md text-[13px] font-medium tabular-nums transition-colors',
            p === page ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-3 hover:text-ink',
          )}
        >
          {p}
        </button>
      ))}
      <Button variant="ghost" size="sm" className="px-2" disabled={page >= count} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
        <path d="M16 6.5l8 3.1v6c0 4.9-3.3 8.7-8 10.3-4.7-1.6-8-5.4-8-10.3v-6l8-3.1z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="11.5" y="13.6" width="9" height="3.4" rx="1" fill="#fff" />
      </svg>
      <span className="text-[16px] font-semibold tracking-tight whitespace-nowrap text-ink">
        RedactProof <span className="font-medium text-muted">AI</span>
      </span>
    </span>
  )
}

/** A small colored dot used in legends and status pills. */
export function Dot({ className }: { className: string }) {
  return <span className={cx('inline-block size-2 shrink-0 rounded-full', className)} aria-hidden />
}

/** Small square swatch for page-highlight legends. */
export function Swatch({ className }: { className: string }) {
  return <span className={cx('inline-block size-3 shrink-0 rounded-[3px] border-[1.5px]', className)} aria-hidden />
}
