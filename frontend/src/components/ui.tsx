import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2, ScanText, Sparkles } from 'lucide-react'
import type { Finding, Risk } from '../api/types'
import { sourceKind } from '../utils/findings'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_8px_24px_-10px_rgb(34_211_238/0.7)] disabled:bg-cyan-400/40 disabled:shadow-none',
  secondary: 'border border-line-strong bg-surface-2 text-slate-100 hover:bg-surface-3 hover:border-slate-500/60',
  ghost: 'text-muted hover:text-slate-100 hover:bg-surface-2',
  danger: 'bg-red-500 text-white hover:bg-red-400',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...props }: ButtonProps) {
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2.5' }
  return (
    <button
      type="button"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
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
  HIGH: 'bg-red-500/12 text-red-300 ring-red-400/30',
  MEDIUM: 'bg-amber-500/12 text-amber-300 ring-amber-400/30',
  LOW: 'bg-sky-500/10 text-sky-300 ring-sky-400/25',
}

export const RISK_BOX: Record<Risk, string> = {
  HIGH: 'border-red-400 bg-red-400/15',
  MEDIUM: 'border-amber-400 bg-amber-400/15',
  LOW: 'border-sky-400 bg-sky-400/12',
}

export function Badge({ className, children, title }: { className?: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold ring-1 ring-inset', className)}
    >
      {children}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return <Badge className={RISK_STYLES[risk]}>{risk}</Badge>
}

export function SourceBadges({ finding }: { finding: Finding }) {
  const kind = sourceKind(finding)
  return (
    <span className="inline-flex gap-1">
      {kind !== 'gemini' && (
        <Badge className="bg-slate-500/10 text-slate-300 ring-slate-400/25" title="Found by the deterministic pattern scanner">
          <ScanText className="size-3" aria-hidden />
          Regex
        </Badge>
      )}
      {kind !== 'regex' && (
        <Badge className="bg-violet-500/12 text-violet-200 ring-violet-400/30" title="Identified by Google Gemini">
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
      className={cx('size-4 shrink-0 cursor-pointer rounded accent-cyan-400 disabled:cursor-not-allowed', className)}
    />
  )
}

export function PageNav({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  if (count <= 1) return <span className="text-xs text-muted">Page 1 of 1</span>
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
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
            'size-8 rounded-md text-xs font-semibold transition-colors',
            p === page ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'text-muted hover:bg-surface-2 hover:text-slate-100',
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

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0f1a2e" stroke="#1f3150" />
        <path d="M16 5l9 3.5v6.8c0 5.6-3.8 9.9-9 11.7-5.2-1.8-9-6.1-9-11.7V8.5L16 5z" fill="none" stroke="#22d3ee" strokeWidth="1.8" />
        <rect x="11" y="13" width="10" height="4" rx="1" fill="#22d3ee" />
      </svg>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight whitespace-nowrap text-white">
          RedactProof <span className="text-cyan-300">AI</span>
        </span>
      )}
    </span>
  )
}
