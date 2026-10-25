# RedactProof AI

**Because covering data isn't the same as removing it.**

Traditional PDF "redaction" often just draws a black box over text — the text is still in the file and anyone can copy or extract it. RedactProof AI uses **Google Gemini** to understand what in a document is sensitive, then applies **real, content-removing redaction** with PyMuPDF and **verifies** that the selected text can no longer be extracted.

## How it works

1. **Upload** a PDF (max 5 MB, 3 pages, text-based).
2. **Deterministic scan** — regex finds emails, phone numbers, SSNs, and labeled account numbers, with exact page coordinates. Text hidden under black boxes is flagged as `visually_hidden`.
3. **Gemini analysis** — the PDF is sent to Gemini, which returns structured JSON with context-sensitive values regex cannot recognize: member/customer IDs, staff IDs, names, addresses.
4. **Validation** — every Gemini suggestion is treated as untrusted: it must match the schema and appear verbatim in the PDF text, or it is rejected. Locations come from PyMuPDF, never from the AI.
5. **Redaction** — the user picks findings; PyMuPDF removes the text itself and rewrites the file.
6. **Verification** — the saved output is reopened and searched for every selected value. Success is reported only if none remain.

## Backend setup (macOS)

Requires Python 3.11+ (tested on 3.13).

```bash
python3.13 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cp .env.example .env        # then put your key in GEMINI_API_KEY
```

Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey). Never commit `.env`.

Run the API:

```bash
cd backend
../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Check it: `curl localhost:8000/api/health`. Interactive docs: http://localhost:8000/docs

API reference for the frontend: [docs/api-contract.md](docs/api-contract.md).

### Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Required for Gemini. Without it the app runs in regex-only mode and says so. |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Primary model. |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.5-flash,gemini-3-flash-preview,gemini-3.5-flash-lite` | Tried in order when a model is overloaded or rate-limited. |
| `FRONTEND_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins. |

## Demo documents

```bash
.venv/bin/python demo/generate_samples.py
```

Creates synthetic PDFs in `demo/samples/`:

- `insecure_statement.pdf` — bank statement whose account number is covered by a black box but still extractable.
- `hr_record.pdf` — two-page HR record; the employee number appears on both pages.

All data in them is fictional.

## Tests

```bash
cd backend
../.venv/bin/python -m pytest                                    # unit + API tests, Gemini mocked
RUN_LIVE_GEMINI=1 ../.venv/bin/python -m pytest tests/test_gemini_live.py -s   # optional real Gemini call
```
