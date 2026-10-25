import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { Risk } from '../api/types'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-ink bg-ink text-paper hover:bg-body active:translate-y-px',
  secondary: 'border-ink bg-surface text-ink hover:bg-ink hover:text-paper active:translate-y-px',
  ghost: 'border-transparent text-ink hover:opacity-65',
  danger: 'border-danger bg-danger text-white hover:bg-danger-ink hover:border-danger-ink active:translate-y-px',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...props }: ButtonProps) {
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-[14px] gap-2', lg: 'h-12 px-6 text-[16px] gap-2.5' }
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center border-[1.5px] font-display font-semibold transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0',
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
  HIGH: 'border-danger bg-danger text-white',
  MEDIUM: 'border-warning bg-warning text-ink',
  LOW: 'border-ink bg-surface text-ink',
}

/** Outline used for selected regions on the page preview (no fill). */
export const RISK_BOX: Record<Risk, string> = {
  HIGH: 'border-danger',
  MEDIUM: 'border-warning',
  LOW: 'border-ink',
}

export function Tag({ className, children, title }: { className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx('tag inline-flex h-5 items-center gap-1 border px-1.5 leading-none', className)}>
      {children}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Tag className={RISK_STYLES[risk]} title={`${risk.toLowerCase()} risk`}>
      {risk}
    </Tag>
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

/** Native checkbox (keyboard + screen reader support for free), drawn square, with indeterminate state. */
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
      className={cx('check', className)}
    />
  )
}

export function PageNav({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  if (count <= 1) return <span className="tag text-muted">Page 1 / 1</span>
  const square = 'flex size-8 items-center justify-center border-[1.5px] font-mono text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30'
  return (
    <div className="flex items-center -space-x-[1.5px]" role="group" aria-label="Page navigation">
      <button type="button" className={cx(square, 'border-ink bg-surface enabled:hover:bg-ink enabled:hover:text-paper')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Page ${p}`}
          className={cx(square, 'border-ink', p === page ? 'relative z-10 bg-ink text-paper' : 'bg-surface text-ink hover:bg-ink hover:text-paper')}
        >
          {p}
        </button>
      ))}
      <button type="button" className={cx(square, 'border-ink bg-surface enabled:hover:bg-ink enabled:hover:text-paper')} disabled={page >= count} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  )
}

/** Wordmark: an ink square carrying a highlighter "redaction bar". */
export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" fill="var(--color-ink)" />
        <rect x="5" y="8" width="18" height="4" fill="var(--color-paper)" />
        <rect x="5" y="15" width="12" height="5" fill="var(--color-paper)" />
      </svg>
      <span className="font-display text-[20px] leading-none font-bold tracking-[0.01em] whitespace-nowrap text-ink uppercase">
        RedactProof<span className="ml-1.5 bg-ink px-1 text-paper">AI</span>
      </span>
    </span>
  )
}

/** Square legend swatch. */
export function Swatch({ className }: { className: string }) {
  return <span className={cx('inline-block size-3 shrink-0 border-[1.5px]', className)} aria-hidden />
}
