// MOCK DATA for UI development without the backend (VITE_USE_MOCK=true).
// Nothing here is real analysis output, and the UI labels it as mock everywhere it appears.
import type { ApiService } from './client'
import { ApiError } from './errors'
import type { AnalysisResponse, BBox, DocumentPage, Finding, RedactionResult } from './types'

const WIDTH = 612
const HEIGHT = 792
const FONT_SIZE = 11
const CHAR_WIDTH = FONT_SIZE * 0.6 // monospace advance width
const LEFT = 72

type MockValue = Omit<Finding, 'id' | 'page' | 'bbox' | 'locations' | 'visually_hidden' | 'text'> & {
  hidden?: boolean
}

// Each line is [label, value?]. Values become findings.
const LINES: [string, string?, MockValue?][] = [
  ['MOCK DATA - SYNTHETIC DEMO DOCUMENT'],
  ['Northwind Credit Union'],
  ['Monthly Account Statement - September 2026'],
  ['Member: ', 'Jordan A. Rivera', {
    type: 'PERSON_NAME', source: ['gemini'], display: '************vera', risk: 'LOW',
    reason: 'Name of the account holder', confidence: 'high',
  }],
  ['Email: ', 'jordan.rivera@example.com', {
    type: 'EMAIL', source: ['regex'], display: '*********************.com', risk: 'MEDIUM',
    reason: 'Email address', confidence: null,
  }],
  ['Phone: ', '(512) 555-0147', {
    type: 'PHONE', source: ['regex'], display: '***** ****0147', risk: 'MEDIUM',
    reason: 'US phone number', confidence: null,
  }],
  ['Member reference: ', 'MBR-20931-K', {
    type: 'CUSTOMER_ID', source: ['gemini'], display: '*******31-K', risk: 'MEDIUM',
    reason: 'Credit union member reference that identifies the customer', confidence: 'high',
  }],
  ['Account Number: ', '987654321012', {
    type: 'ACCOUNT_NUMBER', source: ['regex', 'gemini'], display: '********1012', risk: 'HIGH',
    reason: 'Customer bank account number', confidence: 'high', hidden: true,
  }],
  ['Ending balance: $4,118.36'],
  ['Account officer: Priya Natarajan, staff ID ', 'NW-4471-Q', {
    type: 'EMPLOYEE_ID', source: ['gemini'], display: '*****71-Q', risk: 'MEDIUM',
    reason: 'Internal staff identifier of the account officer', confidence: 'medium',
  }],
]

const lineY = (i: number) => 96 + i * 26

function buildFindings(): Finding[] {
  const findings: Finding[] = []
  LINES.forEach(([label, value, meta], i) => {
    if (!value || !meta) return
    const { hidden = false, ...rest } = meta
    const x0 = LEFT + label.length * CHAR_WIDTH
    const bbox: BBox = [x0, lineY(i) - FONT_SIZE, x0 + value.length * CHAR_WIDTH, lineY(i) + 3]
    findings.push({
      ...rest,
      id: `finding-${findings.length + 1}`,
      text: value,
      visually_hidden: hidden,
      page: 1,
      bbox,
      locations: [{ page: 1, bbox, visually_hidden: hidden }],
    })
  })
  return findings
}

const escapeXml = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Draws the mock page as SVG. `redacted` values are removed from the text and boxed. */
function renderPage(findings: Finding[], redacted: Set<string>): string {
  const rows = LINES.map(([label, value], i) => {
    const finding = findings.find((f) => f.text === value)
    const removed = finding && redacted.has(finding.id)
    const text = escapeXml(label + (value && !removed ? value : ''))
    return `<text x="${LEFT}" y="${lineY(i)}">${text}</text>`
  })
  const boxes = findings
    .filter((f) => f.visually_hidden || redacted.has(f.id))
    .map(({ bbox: [x0, y0, x1, y1] }) => `<rect x="${x0 - 1}" y="${y0 - 1}" width="${x1 - x0 + 2}" height="${y1 - y0 + 2}" fill="#000"/>`)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH * 2}" height="${HEIGHT * 2}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<g font-family="Courier New, monospace" font-size="${FONT_SIZE}" fill="#111">${rows.join('')}</g>` +
    boxes.join('') +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function extractedText(findings: Finding[], redacted: Set<string>): string {
  return LINES.map(([label, value]) => {
    const finding = findings.find((f) => f.text === value)
    return label + (value && !(finding && redacted.has(finding.id)) ? value : '')
  }).join('\n') + '\n'
}

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

let current: AnalysisResponse | null = null
const results = new Map<string, RedactionResult>()

function page(findings: Finding[], redacted: Set<string>): DocumentPage {
  return {
    page: 1,
    width: WIDTH,
    height: HEIGHT,
    preview_url: renderPage(findings, redacted),
    extracted_text: extractedText(findings, redacted),
  }
}

export const mockApi: ApiService = {
  async health() {
    return { status: 'ok', gemini_configured: true, gemini_model: 'mock' }
  },

  async analyze(file, signal) {
    await delay(1200, signal)
    const findings = buildFindings()
    current = {
      document_id: 'mock-document',
      filename: file.name,
      page_count: 1,
      gemini_status: 'ok',
      gemini_message: null,
      gemini_model: 'mock (no Gemini call)',
      gemini_stats: { suggested: 5, accepted: 4, rejected: 1 },
      pages: [page(findings, new Set())],
      findings,
    }
    return current
  },

  async redact({ document_id, finding_ids }) {
    await delay(900)
    if (!current || current.document_id !== document_id) {
      throw new ApiError('SESSION_EXPIRED_OR_NOT_FOUND', 'This session has expired or does not exist. Please upload the PDF again.', 404)
    }
    const ids = new Set(finding_ids)
    const selected = current.findings.filter((f) => ids.has(f.id))
    const result: RedactionResult = {
      result_id: `mock-result-${results.size + 1}`,
      document_id,
      redacted_finding_ids: [...ids],
      page_count: 1,
      pages: [page(current.findings, ids)],
      download_url: '', // mock mode has no PDF to download
      verification: {
        status: 'passed',
        selected_findings: selected.length,
        values_tested: selected.length,
        locations_redacted: selected.reduce((n, f) => n + f.locations.length, 0),
        values_still_detected: 0,
        remaining: [],
        pages_checked: 1,
        method: 'MOCK: no PDF was processed.',
        limitations: ['Mock mode: nothing was redacted or verified.'],
      },
    }
    results.set(result.result_id, result)
    return result
  },

  async getResult(resultId) {
    const result = results.get(resultId)
    if (!result) throw new ApiError('SESSION_EXPIRED_OR_NOT_FOUND', 'This session has expired or does not exist.', 404)
    return result
  },

  url: (path) => path,
}
