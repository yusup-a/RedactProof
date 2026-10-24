import type {
  AnalysisResponse,
  ApiErrorBody,
  Health,
  RedactionRequest,
  RedactionResult,
} from './types'
import { ApiError } from './errors'
import { mockApi } from './mock'

export { ApiError }

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export interface ApiService {
  health(): Promise<Health>
  analyze(file: File, signal?: AbortSignal): Promise<AnalysisResponse>
  redact(request: RedactionRequest): Promise<RedactionResult>
  getResult(resultId: string): Promise<RedactionResult>
  /** Turns a relative path from the API (preview_url, download_url) into a usable URL. */
  url(path: string): string
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  const error = (body as ApiErrorBody | null)?.error
  return typeof error?.code === 'string' && typeof error?.message === 'string'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(
      'NETWORK_ERROR',
      `Can't reach the RedactProof API at ${API_BASE_URL}. Make sure the backend is running.`,
      0,
    )
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (isErrorBody(body)) throw new ApiError(body.error.code, body.error.message, response.status)
    throw new ApiError('HTTP_ERROR', `The server responded with HTTP ${response.status}.`, response.status)
  }
  return body as T
}

const realApi: ApiService = {
  health: () => request<Health>('/api/health'),

  analyze(file, signal) {
    const form = new FormData()
    form.append('file', file)
    return request<AnalysisResponse>('/api/analyze', { method: 'POST', body: form, signal })
  },

  redact: (body) =>
    request<RedactionResult>('/api/redact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getResult: (resultId) => request<RedactionResult>(`/api/results/${encodeURIComponent(resultId)}`),

  url: (path) => (/^(https?:|data:|blob:)/.test(path) ? path : `${API_BASE_URL}${path}`),
}

/** The single API entry point for the app. Mock mode is for UI development only. */
export const api: ApiService = USE_MOCK ? mockApi : realApi
