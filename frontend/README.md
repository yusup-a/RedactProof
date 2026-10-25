# RedactProof AI — Frontend

React + TypeScript + Vite + Tailwind CSS v4 + Lucide icons, with the Hanken Grotesk font (a free, OFL-licensed stand-in for Neue Montreal) bundled locally via `@fontsource` (no third-party font requests). To use real Neue Montreal, add licensed web-font files and point `--font-sans` in `src/index.css` at them.

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

Other scripts: `npm run build`, `npm run typecheck`, `npm test` (unit tests for bbox scaling, grouping, source classification).

## Structure

```
src/
  api/
    types.ts       TypeScript mirror of docs/api-contract.md
    client.ts      the single API client (fetch); `api` switches to mock when VITE_USE_MOCK=true
    errors.ts      ApiError — { error: { code, message } } plus NETWORK_ERROR
    mock.ts        labeled mock service (SVG page, no Gemini)
  utils/findings.ts  labels, grouping, bbox → % positioning
  components/
    AppShell             header, backend-offline badge, mock banner
    UploadZone           Screen A: drag-and-drop, client-side checks, analyzing state
    Workspace            tabs + review layout (Screen B)
    DocumentViewer       page preview at true aspect ratio with FindingHighlight overlays
    FindingsSidebar      grouped findings, select all / per group, mask + reveal
    FindingCard          one finding: masked value, risk, sources, locations
    RedactionControls    Screen D: the "Redact" button
    VerificationReport   Screen E: status, counts, removed values, download
    BeforeAfterViewer    original vs redacted previews
```

## Theming

All colors and fonts are design tokens in the `@theme` block of [src/index.css](src/index.css) (`paper`, `surface`, `ink`, `marker`, `danger`, `warning`, `success`, …). Components only use those token names, so changing a value there re-themes the whole UI. Corners are square and there are no drop shadows, by design.

Earlier designs are saved as git tags:

| Tag | Design |
|---|---|
| `design-dark-v1` | Dark dashboard |
| `design-light-v1` | Light, rounded |
| `design-bold-v1` | Current: bold, square, editorial |

To view one: `git checkout <tag>`. To bring one back on the branch: `git restore --source <tag> -- frontend/src frontend/index.html frontend/public frontend/package.json frontend/package-lock.json`, run `npm install`, and commit.

## How it uses the API

- **Highlights** come only from backend `locations[].bbox` (PDF points, top-left origin). Each box is placed as a percentage of `page.width`/`page.height` over an image sized with the page's aspect ratio — equivalent to `scale = displayWidth / page.width` and accurate at any size. A finding is one value; all of its locations are drawn, and the `p.N` chips jump to each page.
- **Masking**: the UI shows `display` by default; `text` appears only after the user reveals it.
- **Hidden text**: there is no Attacker View tab (product decision), so `pages[].extracted_text` isn't displayed. Findings the backend reports as `visually_hidden: true` are labeled “hidden · extractable”, and the document header counts them.
- **Verification**: success is shown only when `verification.status === "passed"`, worded as "Targeted text verification passed". Failure lists `remaining`, and the download is labeled unverified.
- **Gemini is not named anywhere in the UI**, and there is no privacy notice, model badge or list of PDF limits (product decision). The only Gemini field read is `gemini_status`: when it isn't `ok`, the findings panel shows a neutral “contextual analysis was unavailable” notice so users know results are pattern-only. Limits are still enforced, and the error messages explain them when a file is rejected.
- **Errors** show the backend's `message`. `SESSION_EXPIRED_OR_NOT_FOUND` locks the workspace and offers "Upload again"; a failed preview image shows a placeholder.

## Screenshots

`screenshots/` holds captures of the real app against the real backend with Gemini enabled on the backend, using the synthetic PDFs in `demo/samples/`. No mock data.
