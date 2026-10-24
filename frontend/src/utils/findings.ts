import type { BBox, Finding, FindingType, Risk } from '../api/types'

export const TYPE_LABELS: Record<FindingType, string> = {
  EMAIL: 'Email address',
  PHONE: 'Phone number',
  ACCOUNT_NUMBER: 'Account number',
  ROUTING_NUMBER: 'Routing number',
  CARD_NUMBER: 'Card number',
  SSN: 'Social Security number',
  EMPLOYEE_ID: 'Employee / staff ID',
  CUSTOMER_ID: 'Customer / member ID',
  PERSON_NAME: 'Person name',
  ADDRESS: 'Address',
  DATE_OF_BIRTH: 'Date of birth',
  OTHER: 'Other sensitive value',
}

const RISK_ORDER: Record<Risk, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

export type SourceKind = 'both' | 'regex' | 'gemini'

export function sourceKind(finding: Finding): SourceKind {
  const regex = finding.source.includes('regex')
  const gemini = finding.source.includes('gemini')
  return regex && gemini ? 'both' : gemini ? 'gemini' : 'regex'
}

export interface FindingGroup {
  type: FindingType
  label: string
  risk: Risk
  findings: Finding[]
}

/** Groups by type, highest-risk groups first; keeps the backend's page/top-to-bottom order inside a group. */
export function groupFindings(findings: Finding[]): FindingGroup[] {
  const groups = new Map<FindingType, FindingGroup>()
  for (const f of findings) {
    let group = groups.get(f.type)
    if (!group) {
      group = { type: f.type, label: TYPE_LABELS[f.type] ?? f.type, risk: f.risk, findings: [] }
      groups.set(f.type, group)
    }
    if (RISK_ORDER[f.risk] < RISK_ORDER[group.risk]) group.risk = f.risk
    group.findings.push(f)
  }
  return [...groups.values()].sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk])
}

/** Positions a PDF-point bbox over a page preview as percentages, so it scales with the image. */
export function bboxToPercent(bbox: BBox, pageWidth: number, pageHeight: number, padding = 0) {
  const [x0, y0, x1, y1] = bbox
  const left = Math.max(0, x0 - padding)
  const top = Math.max(0, y0 - padding)
  const right = Math.min(pageWidth, x1 + padding)
  const bottom = Math.min(pageHeight, y1 + padding)
  return {
    left: `${(left / pageWidth) * 100}%`,
    top: `${(top / pageHeight) * 100}%`,
    width: `${((right - left) / pageWidth) * 100}%`,
    height: `${((bottom - top) / pageHeight) * 100}%`,
  }
}

export interface TextSegment {
  text: string
  finding?: Finding
}

/**
 * Splits extracted page text into plain runs and runs that are exactly a finding's value.
 * Longer values win when matches overlap.
 */
export function segmentText(text: string, findings: Finding[]): TextSegment[] {
  const matches: { start: number; end: number; finding: Finding }[] = []
  for (const finding of findings) {
    if (!finding.text) continue
    let from = 0
    for (let at = text.indexOf(finding.text, from); at !== -1; at = text.indexOf(finding.text, from)) {
      matches.push({ start: at, end: at + finding.text.length, finding })
      from = at + finding.text.length
    }
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end)

  const segments: TextSegment[] = []
  let cursor = 0
  for (const m of matches) {
    if (m.start < cursor) continue
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start) })
    segments.push({ text: text.slice(m.start, m.end), finding: m.finding })
    cursor = m.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}

export function pagesOf(finding: Finding): number[] {
  return [...new Set(finding.locations.map((l) => l.page))].sort((a, b) => a - b)
}

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
