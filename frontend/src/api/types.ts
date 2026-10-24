// Mirrors docs/api-contract.md exactly. The backend owns that contract.

export type FindingType =
  | 'EMAIL'
  | 'PHONE'
  | 'ACCOUNT_NUMBER'
  | 'ROUTING_NUMBER'
  | 'CARD_NUMBER'
  | 'SSN'
  | 'EMPLOYEE_ID'
  | 'CUSTOMER_ID'
  | 'PERSON_NAME'
  | 'ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'OTHER'

export type Source = 'regex' | 'gemini'
export type Risk = 'HIGH' | 'MEDIUM' | 'LOW'
export type Confidence = 'high' | 'medium' | 'low'
export type GeminiStatus = 'ok' | 'unavailable' | 'error'

/** [x0, y0, x1, y1] in PDF points, origin top-left, y grows downward. */
export type BBox = [number, number, number, number]

export interface Health {
  status: 'ok'
  gemini_configured: boolean
  gemini_model: string
}

export interface DocumentPage {
  page: number
  width: number
  height: number
  /** Relative path; prefix with the API base URL. */
  preview_url: string
  /** Everything a machine can extract, including text under black boxes. Never log it. */
  extracted_text: string
}

export interface FindingLocation {
  page: number
  bbox: BBox
  visually_hidden: boolean
}

export interface Finding {
  id: string
  type: FindingType
  source: Source[]
  text: string
  display: string
  risk: Risk
  reason: string
  confidence: Confidence | null
  visually_hidden: boolean
  page: number
  bbox: BBox
  locations: FindingLocation[]
}

export interface GeminiStats {
  suggested: number
  accepted: number
  rejected: number
}

export interface AnalysisResponse {
  document_id: string
  filename: string
  page_count: number
  gemini_status: GeminiStatus
  gemini_message: string | null
  gemini_model: string | null
  gemini_stats: GeminiStats | null
  pages: DocumentPage[]
  findings: Finding[]
}

export interface RedactionRequest {
  document_id: string
  finding_ids: string[]
}

export interface RemainingValue {
  finding_id: string
  pages: number[]
}

export interface VerificationReport {
  status: 'passed' | 'failed'
  selected_findings: number
  values_tested: number
  locations_redacted: number
  values_still_detected: number
  remaining: RemainingValue[]
  pages_checked: number
  method: string
  limitations: string[]
}

export interface RedactionResult {
  result_id: string
  document_id: string
  redacted_finding_ids: string[]
  page_count: number
  pages: DocumentPage[]
  download_url: string
  verification: VerificationReport
}

export interface ApiErrorBody {
  error: { code: string; message: string }
}
