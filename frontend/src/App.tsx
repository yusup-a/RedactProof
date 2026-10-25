import { useEffect, useRef, useState } from 'react'
import type { AnalysisResponse, RedactionResult } from './api/types'
import { ApiError, api } from './api/client'
import { AppShell, type HealthState } from './components/AppShell'
import { UploadZone } from './components/UploadZone'
import { Workspace, type Tab } from './components/Workspace'

function messageFor(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

export default function App() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })
  const [analyzing, setAnalyzing] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<RedactionResult | null>(null)
  const [redacting, setRedacting] = useState(false)
  const [redactError, setRedactError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [tab, setTab] = useState<Tab>('review')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    api
      .health()
      .then((h) => setHealth({ status: 'ok', health: h }))
      .catch(() => setHealth({ status: 'down' }))
  }, [])

  async function analyze(file: File) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setUploadError(null)
    setAnalyzing(file)
    try {
      const response = await api.analyze(file, controller.signal)
      setAnalysis(response)
      setSelectedIds(new Set(response.findings.map((f) => f.id)))
      setResult(null)
      setRedactError(null)
      setExpired(false)
      setTab('review')
      window.scrollTo({ top: 0 })
    } catch (err) {
      if (controller.signal.aborted) return
      setUploadError(messageFor(err))
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR') setHealth({ status: 'down' })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setAnalyzing(null)
      }
    }
  }

  async function redact() {
    if (!analysis || selectedIds.size === 0) return
    setRedacting(true)
    setRedactError(null)
    try {
      const response = await api.redact({ document_id: analysis.document_id, finding_ids: [...selectedIds] })
      setResult(response)
      setTab('report')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err instanceof ApiError && err.isSessionExpired) setExpired(true)
      setRedactError(messageFor(err))
    } finally {
      setRedacting(false)
    }
  }

  function select(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function startOver() {
    abortRef.current?.abort()
    setAnalysis(null)
    setResult(null)
    setSelectedIds(new Set())
    setUploadError(null)
    setRedactError(null)
    setExpired(false)
    setAnalyzing(null)
  }

  return (
    <AppShell health={health} onHome={analyzing ? undefined : startOver}>
      {analysis ? (
        <Workspace
          analysis={analysis}
          result={result}
          selectedIds={selectedIds}
          onSelect={select}
          redacting={redacting}
          redactError={redactError}
          expired={expired}
          tab={tab}
          onTabChange={setTab}
          onRedact={redact}
          onStartOver={startOver}
        />
      ) : (
        <UploadZone
          analyzing={analyzing}
          error={uploadError}
          onFile={analyze}
          onCancel={() => {
            abortRef.current?.abort()
            setAnalyzing(null)
          }}
        />
      )}
    </AppShell>
  )
}
