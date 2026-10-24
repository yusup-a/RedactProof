# RedactProof AI — Frontend

React + TypeScript + Vite + Tailwind CSS v4 + Lucide icons. No other runtime dependencies.

## Run locally

Requires Node 20+. Start the backend first (see the root [README](../README.md)), then:

```bash
cd frontend
npm install
cp .env.example .env.local     # optional; defaults point at http://localhost:8000
npm run dev                    # http://localhost:5173
```

The backend's CORS default allows `http://localhost:5173`, so keep that port.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL. All `preview_url` / `download_url` values from the API are prefixed with it. |
| `VITE_USE_MOCK` | `false` | `true` runs on built-in sample data with no backend. For UI work only — a banner and labels mark everything as mock. Never use it for the demo. |

Other scripts: `npm run build`, `npm run typecheck`, `npm test` (unit tests for bbox scaling, text segmentation, grouping).

## Structure

```
src/
  api/
    types.ts       TypeScript mirror of docs/api-contract.md
    client.ts      the single API client (fetch); `api` switches to mock when VITE_USE_MOCK=true
    errors.ts      ApiError — { error: { code, message } } plus NETWORK_ERROR
    mock.ts        labeled mock service (SVG page, no Gemini)
  utils/findings.ts  labels, grouping, bbox → % positioning, extracted-text segmentation
  components/
    AppShell             header, backend/Gemini status, mock banner
    UploadZone           Screen A: drag-and-drop, client-side checks, privacy notice, analyzing state
    Workspace            tabs + review layout (Screen B)
    DocumentViewer       page preview at true aspect ratio with FindingHighlight overlays
    FindingsSidebar      grouped findings, select all / per group, mask + reveal
    FindingCard          one finding: masked value, risk, sources, locations
    RedactionControls    Screen D: "Securely Redact Selected"
    AttackerView         Screen C: visual vs extracted text, before and after
    GeminiInsights       Screen F: regex vs Gemini, stats, contextual example
    VerificationReport   Screen E: status, counts, limitations, download
    BeforeAfterViewer    original vs redacted previews
```

## How it uses the API

- **Highlights** come only from backend `locations[].bbox` (PDF points, top-left origin). Each box is placed as a percentage of `page.width`/`page.height` over an image sized with the page's aspect ratio — equivalent to `scale = displayWidth / page.width` and accurate at any size. A finding is one value; all of its locations are drawn, and the `p.N` chips jump to each page.
- **Masking**: the UI shows `display` by default; `text` appears only after the user reveals it.
- **Attacker View** renders `pages[].extracted_text` from `/api/analyze` (before) and from `/api/redact` (after). The black-box warning only appears when the backend reports `visually_hidden: true`.
- **Verification**: success is shown only when `verification.status === "passed"`, worded as "Targeted text verification passed". Failure lists `remaining`, and the download is labeled unverified.
- **Gemini panel** uses `gemini_status`, `gemini_message`, `gemini_model`, `gemini_stats` and each finding's `source`. When Gemini is `unavailable` or `error`, the panel says so and the regex results stay usable.
- **Errors** show the backend's `message`. `SESSION_EXPIRED_OR_NOT_FOUND` locks the workspace and offers "Upload again"; a failed preview image shows a placeholder.

## Screenshots

`screenshots/` holds captures of the real app against the real backend, running in regex-only mode (no Gemini key on the capture machine). Retake them with `GEMINI_API_KEY` set to show Gemini findings for Devpost.
